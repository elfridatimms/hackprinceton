import { useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { WorldState } from "./session";

const sphere = new THREE.SphereGeometry(1, 10, 8);
const sparkle = new THREE.OctahedronGeometry(1, 0);

/** A soft ribbon of glowing beads behind a moving character (world space). */
export function Trail({
  world,
  get,
  color = "#ffe6a0",
  count = 18,
  size = 0.11,
  every = 0.028,
  drift = 0,
}: {
  world: RefObject<WorldState>;
  get: () => THREE.Vector3 | null;
  color?: string;
  count?: number;
  size?: number;
  every?: number;
  /** World units per second the trail slides left (scrolling worlds). */
  drift?: number;
}) {
  const group = useRef<THREE.Group>(null);
  const points = useMemo(
    () => Array.from({ length: count }, () => new THREE.Vector3()),
    [count],
  );
  const head = useRef(0),
    ready = useRef(false),
    wait = useRef(0);
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
      }),
    [color],
  );
  useFrame((_, dt) => {
    const g = group.current!;
    const p = get();
    if (!p || world.current.reduced) {
      g.visible = false;
      ready.current = false;
      return;
    }
    g.visible = true;
    if (!ready.current) {
      points.forEach((v) => v.copy(p));
      ready.current = true;
    }
    if (drift) points.forEach((v) => (v.x -= drift * Math.min(dt, 0.06)));
    wait.current += dt;
    if (wait.current >= every) {
      wait.current = 0;
      head.current = (head.current + 1) % count;
      points[head.current].copy(p);
    }
    g.children.forEach((m, i) => {
      const point = points[(head.current - i + count) % count];
      m.position.copy(point);
      const moving = drift > 0 || point.distanceTo(p) > 0.02 || i === 0;
      m.scale.setScalar(moving ? Math.max(0.001, size * (1 - i / count)) : 0.001);
    });
  });
  return (
    <group ref={group}>
      {points.map((_, i) => (
        <mesh key={i} geometry={sphere} material={material} />
      ))}
    </group>
  );
}

type Particle = { p: THREE.Vector3; v: THREE.Vector3; spin: number; life: number };
/** A celebratory burst of sparkles whenever `trigger()` changes value. */
export function Burst({
  world,
  trigger,
  at,
  colors = ["#ffd56f", "#fff3c0", "#ffb8a0"],
  count = 22,
  speed = 2.6,
  size = 0.09,
}: {
  world: RefObject<WorldState>;
  trigger: () => number;
  at: () => THREE.Vector3 | null;
  colors?: string[];
  count?: number;
  speed?: number;
  size?: number;
}) {
  const group = useRef<THREE.Group>(null);
  const last = useRef<number | null>(null);
  const particles = useMemo<Particle[]>(
    () =>
      Array.from({ length: count }, () => ({
        p: new THREE.Vector3(),
        v: new THREE.Vector3(),
        spin: 0,
        life: 0,
      })),
    [count],
  );
  const materials = useMemo(
    () => colors.map((color) => new THREE.MeshBasicMaterial({ color })),
    [colors.join()],
  );
  useFrame((_, dt) => {
    const t = trigger();
    if (last.current === null) last.current = t;
    if (t !== last.current) {
      last.current = t;
      const origin = at();
      if (origin) {
        const scale = world.current.reduced ? 0.35 : 1;
        particles.forEach((q, i) => {
          const a = (i / count) * Math.PI * 2 + Math.random() * 0.4;
          const s = speed * scale * (0.55 + Math.random() * 0.6);
          q.p.copy(origin);
          q.v.set(Math.cos(a) * s, Math.sin(a) * s + 1.2 * scale, (Math.random() - 0.5) * 0.6);
          q.spin = (Math.random() - 0.5) * 12;
          q.life = 1;
        });
      }
    }
    const step = Math.min(dt, 0.06);
    group.current!.children.forEach((m, i) => {
      const q = particles[i];
      if (q.life <= 0) {
        m.visible = false;
        return;
      }
      q.life -= step / 0.95;
      q.v.y -= 3.2 * step;
      q.v.multiplyScalar(1 - step * 1.4);
      q.p.addScaledVector(q.v, step);
      m.visible = true;
      m.position.copy(q.p);
      m.rotation.z += q.spin * step;
      m.rotation.x += q.spin * 0.5 * step;
      m.scale.setScalar(Math.max(0.001, size * Math.min(1, q.life * 1.6)));
    });
  });
  return (
    <group ref={group}>
      {particles.map((_, i) => (
        <mesh key={i} geometry={sparkle} material={materials[i % materials.length]} visible={false} />
      ))}
    </group>
  );
}

/** A ring of little beads that light up while the child holds on a target. */
export function DwellRing({
  world,
  get,
  radius = 0.55,
  beads = 20,
  color = "#b9f28a",
  idle = "#fff4d0",
}: {
  world: RefObject<WorldState>;
  get: () => { at: THREE.Vector3; dwell: number } | null;
  radius?: number;
  beads?: number;
  color?: string;
  idle?: string;
}) {
  const group = useRef<THREE.Group>(null);
  const lit = useMemo(() => new THREE.MeshBasicMaterial({ color }), [color]);
  const dim = useMemo(
    () => new THREE.MeshBasicMaterial({ color: idle, transparent: true, opacity: 0.55 }),
    [idle],
  );
  useFrame(({ clock }) => {
    const g = group.current!;
    const state = get();
    if (!state) {
      g.visible = false;
      return;
    }
    g.visible = true;
    g.position.copy(state.at);
    g.rotation.z = world.current.reduced ? 0 : -clock.elapsedTime * 0.6;
    const pulse = world.current.reduced ? 0 : Math.sin(clock.elapsedTime * 4) * 0.04;
    g.children.forEach((child, i) => {
      const m = child as THREE.Mesh;
      const on = i / beads < state.dwell;
      m.material = on ? lit : dim;
      const a = (i / beads) * Math.PI * 2;
      const r = radius * (1 + pulse + (on ? 0.06 : 0));
      m.position.set(Math.sin(a) * r, Math.cos(a) * r, 0);
      m.scale.setScalar(on ? 0.06 : 0.035);
    });
  });
  return (
    <group ref={group}>
      {Array.from({ length: beads }, (_, i) => (
        <mesh key={i} geometry={sphere} material={dim} />
      ))}
    </group>
  );
}

/** Moving dots from a character toward its next target: "this way!" */
export function GuidePath({
  world,
  from,
  to,
  dots = 7,
  color = "#fff3c4",
}: {
  world: RefObject<WorldState>;
  from: () => THREE.Vector3 | null;
  to: () => THREE.Vector3 | null;
  dots?: number;
  color?: string;
}) {
  const group = useRef<THREE.Group>(null);
  const material = useMemo(
    () => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, depthWrite: false }),
    [color],
  );
  useFrame(({ clock }) => {
    const a = from(),
      b = to(),
      g = group.current!;
    if (!a || !b || a.distanceTo(b) < 0.45) {
      g.visible = false;
      return;
    }
    g.visible = true;
    const shift = world.current.reduced ? 0 : (clock.elapsedTime * 0.7) % 1;
    g.children.forEach((m, i) => {
      const f = (i + shift) / dots;
      m.position.lerpVectors(a, b, 0.12 + f * 0.76);
      const fade = Math.sin(f * Math.PI);
      m.scale.setScalar(Math.max(0.001, 0.05 * fade + 0.012));
    });
  });
  return (
    <group ref={group}>
      {Array.from({ length: dots }, (_, i) => (
        <mesh key={i} geometry={sphere} material={material} />
      ))}
    </group>
  );
}
