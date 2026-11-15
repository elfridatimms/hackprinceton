import { useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { WorldState } from "./session";
import { Burst } from "./Effects";

/** Where seeds come from: the magic flower's head. */
export const SEED_SOURCE = new THREE.Vector3(1.7, 0.35, 4.2);
const FLIGHT = 0.95,
  GROW = 1.5,
  SEEDS_PER_SOW = 3;
const COLORS = ["#ff8fab", "#a98bff", "#ffb84d", "#ff7f6b", "#6fc3ff", "#ffd23f", "#e47fd9", "#ff9f6b"];

type Spot = {
  x: number;
  z: number;
  color: string;
  tulip: boolean;
  size: number;
  sownAt: number | null;
};

const rng = (seed: number) => {
  let n = seed;
  return () => {
    n = (n * 16807) % 2147483647;
    return (n - 1) / 2147483646;
  };
};
function makeSpots(): Spot[] {
  const r = rng(77);
  const spots: Spot[] = [];
  while (spots.length < 30) {
    const x = -7 + r() * 14,
      z = 3.2 + r() * 2.4;
    if (Math.abs(x - SEED_SOURCE.x) < 1.5) continue;
    if (spots.some((s) => Math.hypot(s.x - x, (s.z - z) * 1.4) < 0.95)) continue;
    spots.push({
      x,
      z,
      color: COLORS[spots.length % COLORS.length],
      tulip: r() < 0.4,
      size: 0.85 + r() * 0.4,
      sownAt: null,
    });
  }
  // Fill nearby first so the first sowings are easy to see, then spread out.
  return spots.sort((a, b) => Math.abs(a.x - SEED_SOURCE.x) - Math.abs(b.x - SEED_SOURCE.x));
}
const easeOutBack = (t: number) => {
  const c = 1.7;
  return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2;
};

/**
 * Close your hand to gather seeds in the magic flower; open it to sow them.
 * Each sowing throws seeds across the meadow where new flowers sprout, and
 * every planted flower opens and closes together with the child's hand.
 */
export function SeedMeadow({
  world,
  welcome,
}: {
  world: RefObject<WorldState>;
  welcome: boolean;
}) {
  const spots = useMemo(makeSpots, []);
  const flowers = useRef<THREE.Group>(null),
    seeds = useRef<THREE.Group>(null),
    orbit = useRef<THREE.Group>(null),
    bees = useRef<THREE.Group>(null);
  const charge = useRef(0),
    next = useRef(0),
    landed = useRef(0),
    lastLanding = useRef(new THREE.Vector3()),
    previousPhase = useRef(world.current.phase),
    bloom = useRef(0.5);
  const beeTrips = useMemo(
    () => [0, 1].map((i) => ({ from: 0, to: 1, t: i * 0.5, at: new THREE.Vector3() })),
    [],
  );

  useFrame(({ clock }, delta) => {
    const w = world.current,
      t = clock.elapsedTime,
      dt = Math.min(delta, 0.06);
    const show = w.exercise === "grip" && !welcome;
    flowers.current!.visible = show;
    seeds.current!.visible = show;
    orbit.current!.visible = show;
    bees.current!.visible = show;
    if (w.phase !== previousPhase.current && (w.phase === "practice" || w.phase === "welcome")) {
      spots.forEach((s) => (s.sownAt = null));
      next.current = 0;
      charge.current = 0;
      w.planted = 0;
    }
    previousPhase.current = w.phase;
    if (!show) return;

    const active = w.phase === "playing" && !w.waiting;
    // Gather while the hand is closed, sow when it opens wide.
    if (active && w.position < 0.35) charge.current = Math.min(1, charge.current + dt / 0.35);
    if (active && w.position > 0.68 && charge.current >= 0.5) {
      const count = charge.current >= 1 ? SEEDS_PER_SOW : 2;
      for (let i = 0; i < count && next.current < spots.length; i++) {
        spots[next.current].sownAt = t + i * 0.12;
        next.current++;
      }
      charge.current = 0;
    }

    // Seeds gathered around the flower head.
    orbit.current!.children.forEach((m, i) => {
      const a = t * 2.2 + (i * Math.PI * 2) / 3;
      m.position.set(
        SEED_SOURCE.x + Math.cos(a) * 0.55,
        SEED_SOURCE.y + Math.sin(a * 0.7) * 0.15,
        SEED_SOURCE.z + Math.sin(a) * 0.3,
      );
      m.scale.setScalar(Math.max(0.001, charge.current * 0.07 * (i / 3 < charge.current ? 1 : 0.4)));
    });

    bloom.current = THREE.MathUtils.damp(
      bloom.current,
      w.phase === "completed" ? 1 : w.waiting || w.phase === "paused" ? 0.3 : w.position,
      6,
      dt,
    );
    let planted = 0,
      flying = 0;
    const seedMeshes = seeds.current!.children;
    spots.forEach((s, i) => {
      const g = flowers.current!.children[i] as THREE.Group;
      if (s.sownAt === null || t < s.sownAt) {
        g.visible = false;
        return;
      }
      const age = t - s.sownAt;
      if (age < FLIGHT) {
        g.visible = false;
        const seed = seedMeshes[flying++ % seedMeshes.length];
        if (seed) {
          const f = age / FLIGHT;
          seed.visible = true;
          seed.position.set(
            THREE.MathUtils.lerp(SEED_SOURCE.x, s.x, f),
            THREE.MathUtils.lerp(SEED_SOURCE.y, -2, f) + Math.sin(f * Math.PI) * 2.2,
            THREE.MathUtils.lerp(SEED_SOURCE.z, s.z, f),
          );
          seed.rotation.z = age * 9;
        }
        return;
      }
      if (age - delta < FLIGHT) {
        landed.current++;
        lastLanding.current.set(s.x, -1.95, s.z);
      }
      planted++;
      g.visible = true;
      const grow = Math.min(1, (age - FLIGHT) / GROW);
      const stem = g.children[0],
        head = g.children[1];
      stem.scale.set(1, Math.max(0.001, Math.min(1, grow * 1.8)), 1);
      const headGrow = Math.max(0.001, easeOutBack(Math.max(0, (grow - 0.35) / 0.65)));
      head.scale.setScalar(s.size * headGrow);
      head.position.y = 0.62 * Math.min(1, grow * 1.8);
      // Every planted flower breathes with the hand.
      const open = bloom.current;
      head.children.forEach((petal, n) => {
        if (n === 0) return; // centre
        const a = (n / (head.children.length - 1)) * Math.PI * 2;
        const r = s.tulip ? 0.05 + open * 0.05 : 0.07 + open * 0.08;
        petal.position.set(Math.sin(a) * r, Math.cos(a) * r * (s.tulip ? 0.4 : 1), s.tulip ? Math.cos(a) * 0.04 : 0);
        petal.rotation.z = -a;
        petal.rotation.x = s.tulip ? -0.2 - (1 - open) * 0.5 : (1 - open) * 0.9;
      });
      const halo = g.children[3];
      halo.position.y = head.position.y;
      halo.scale.setScalar(Math.max(0.001, headGrow * (0.6 + open * 0.7)));
      g.rotation.z = w.reduced ? 0 : Math.sin(t * 1.3 + i) * 0.07;
    });
    for (let i = flying; i < seedMeshes.length; i++) seedMeshes[i].visible = false;
    w.planted = planted;

    // Bees visit planted flowers once the meadow has a few.
    const open = spots.filter((s) => s.sownAt !== null && t - s.sownAt > FLIGHT + GROW);
    bees.current!.children.forEach((bee, i) => {
      const trip = beeTrips[i];
      if (open.length < 3 + i * 2) {
        bee.visible = false;
        return;
      }
      bee.visible = true;
      trip.t += dt / 2.6;
      if (trip.t >= 1) {
        trip.t = 0;
        trip.from = trip.to;
        trip.to = Math.floor(((i + 1) * 7919 * (t + 1)) % open.length);
      }
      const a = open[trip.from % open.length],
        b = open[trip.to % open.length];
      const f = trip.t < 0.7 ? trip.t / 0.7 : 1;
      bee.position.set(
        THREE.MathUtils.lerp(a.x, b.x, f),
        -1.2 + Math.sin(f * Math.PI) * 0.9 + (w.reduced ? 0 : Math.sin(t * 9 + i) * 0.04),
        THREE.MathUtils.lerp(a.z, b.z, f) + 0.2,
      );
      bee.rotation.y = b.x >= a.x ? 0 : Math.PI;
      const wings = bee.children[3];
      if (wings && !w.reduced) wings.rotation.x = Math.sin(t * 40) * 0.5;
    });
  });

  return (
    <>
      <Burst
        world={world}
        trigger={() => landed.current}
        at={() => lastLanding.current}
        colors={["#a7d48a", "#fff3c0", "#d6b98a"]}
        count={10}
        speed={1.4}
        size={0.05}
      />
      <group ref={orbit}>
        {[0, 1, 2].map((i) => (
          <mesh key={i}>
            <sphereGeometry args={[1, 10, 8]} />
            <meshBasicMaterial color="#ffd86b" />
          </mesh>
        ))}
      </group>
      <group ref={seeds}>
        {Array.from({ length: 9 }, (_, i) => (
          <mesh key={i} visible={false} scale={[0.07, 0.1, 0.07]}>
            <sphereGeometry args={[1, 10, 8]} />
            <meshStandardMaterial color="#c99a55" emissive="#ffcf6a" emissiveIntensity={0.6} />
          </mesh>
        ))}
      </group>
      <group ref={flowers}>
        {spots.map((s, i) => (
          <group key={i} position={[s.x, -2.05, s.z]} scale={2.3} visible={false}>
            <mesh position={[0, 0.31, 0]}>
              <cylinderGeometry args={[0.018, 0.028, 0.62, 6]} />
              <meshStandardMaterial color="#6f9a62" />
            </mesh>
            <group position={[0, 0.62, 0]}>
              <mesh scale={[0.06, 0.06, 0.05]} position={[0, 0, 0.03]}>
                <sphereGeometry args={[1, 12, 10]} />
                <meshStandardMaterial color={s.tulip ? s.color : "#f1c766"} />
              </mesh>
              {Array.from({ length: s.tulip ? 4 : 6 }, (_, n) => (
                <mesh key={n} scale={s.tulip ? [0.07, 0.13, 0.05] : [0.065, 0.1, 0.035]}>
                  <sphereGeometry args={[1, 14, 10]} />
                  <meshStandardMaterial color={s.color} emissive={s.color} emissiveIntensity={0.3} />
                </mesh>
              ))}
            </group>
            <mesh position={[0.08, 0.2, 0]} rotation={[0, 0, -0.8]} scale={[0.12, 0.045, 0.03]}>
              <sphereGeometry args={[1, 10, 8]} />
              <meshStandardMaterial color="#8fb575" />
            </mesh>
            <mesh position={[0, 0.62, -0.05]}>
              <sphereGeometry args={[0.24, 16, 12]} />
              <meshBasicMaterial color={s.color} transparent opacity={0.22} depthWrite={false} />
            </mesh>
          </group>
        ))}
      </group>
      <group ref={bees}>
        {[0, 1].map((i) => (
          <group key={i} visible={false} scale={0.75}>
            <mesh scale={[0.16, 0.12, 0.12]}>
              <sphereGeometry args={[1, 14, 10]} />
              <meshStandardMaterial color="#f5c94e" />
            </mesh>
            <mesh position={[-0.02, 0, 0]} scale={[0.04, 0.125, 0.125]}>
              <sphereGeometry args={[1, 10, 8]} />
              <meshStandardMaterial color="#3d3a2e" />
            </mesh>
            <mesh position={[0.12, 0.03, 0.08]} scale={0.02}>
              <sphereGeometry args={[1, 8, 6]} />
              <meshBasicMaterial color="#2b2a22" />
            </mesh>
            <group position={[0, 0.1, 0]}>
              {[-1, 1].map((side) => (
                <mesh key={side} position={[0, 0.04, side * 0.07]} scale={[0.09, 0.05, 0.03]}>
                  <sphereGeometry args={[1, 10, 8]} />
                  <meshBasicMaterial color="#ffffff" transparent opacity={0.75} />
                </mesh>
              ))}
            </group>
          </group>
        ))}
      </group>
    </>
  );
}
