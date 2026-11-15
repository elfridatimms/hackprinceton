import { useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { WorldState } from "./session";
import {
  stepSkyCourse,
  createSkyGates,
  DRAGON_X,
  flightHeight,
  fitsGap,
  PILLAR_RADIUS,
} from "./flightCourse";
import { Burst, Trail } from "./Effects";

const CLOUDS = [
  { x: -6, y: 4.6, z: -2, s: 1.1 },
  { x: 0, y: 5.4, z: -3, s: 0.8 },
  { x: 5, y: 4.2, z: -2.5, s: 1.3 },
  { x: 10, y: 5.1, z: -3, s: 0.9 },
  { x: -2, y: 6, z: -4, s: 0.7 },
];
export function SkyGates({
  world,
  welcome,
  onCollect,
}: {
  world: RefObject<WorldState>;
  welcome: boolean;
  onCollect: () => void;
}) {
  const root = useRef<THREE.Group>(null),
    clouds = useRef<THREE.Group>(null),
    passes = useRef(0),
    gates = useRef(createSkyGates()),
    lastPhase = useRef(world.current.phase);
  useFrame(({ clock }, dt) => {
    const w = world.current;
    if (
      w.phase !== lastPhase.current &&
      (w.phase === "practice" || w.phase === "welcome")
    )
      gates.current = createSkyGates();
    lastPhase.current = w.phase;
    root.current!.visible = w.exercise === "elbow";
    const events = stepSkyCourse(gates.current, dt, w);
    for (let i = 0; i < events.passed; i++) onCollect();
    passes.current += events.passed;
    if (events.touched) {
      w.bumpAt = performance.now() / 1000;
      w.streak = 0;
    }
    const height = flightHeight(w.position);
    const next = gates.current
      .filter((g) => !g.judged && g.x > DRAGON_X - 0.3)
      .sort((a, b) => a.x - b.x)[0];
    if (w.exercise === "elbow" && next) {
      w.goal = Math.max(0, Math.min(1, (next.center + 0.3) / 4.2));
      w.dwell = Math.max(0, Math.min(1, 1 - (next.x - DRAGON_X) / 7.4));
    }
    const moving = w.phase === "playing" && !w.waiting && !w.reduced;
    clouds.current!.visible = w.exercise === "elbow";
    clouds.current!.children.forEach((c, i) => {
      if (moving) c.position.x -= Math.min(dt, 0.06) * (0.35 + (i % 3) * 0.12) * w.speed;
      if (c.position.x < -14) c.position.x += 28;
    });
    root.current!.children.forEach((group, i) => {
      const gate = gates.current[i];
      group.position.set(welcome ? 5 + i * 5 : gate.x, gate.center, 2);
      const aligned = !welcome && gate === next && fitsGap(height, gate.center);
      group.children.forEach((part, j) => {
        if (j === 2) {
          part.rotation.z = w.reduced ? 0 : clock.elapsedTime * 0.45;
          const collected = gate.judged && !gate.hit;
          part.scale.setScalar(
            collected
              ? Math.max(0.001, gate.pulse * 1.6)
              : (aligned ? 1.25 : 1) + (w.reduced ? 0 : Math.sin(clock.elapsedTime * 3 + i) * 0.08),
          );
        }
        if (j === 3) {
          const m = (part as THREE.Mesh).material as THREE.MeshBasicMaterial;
          m.opacity = aligned ? 0.42 : 0.16;
          m.color.set(aligned ? "#c6f59a" : "#f6dda0");
          part.scale.x = aligned ? 1.15 : 1;
        }
        if (j < 2) {
          part.position.x =
            gate.hit && gate.pulse > 0 && !w.reduced
              ? Math.sin(clock.elapsedTime * 25) * 0.09
              : 0;
        }
      });
    });
  });
  const dragonAt = new THREE.Vector3();
  const dragon = () => {
    const w = world.current;
    return w.exercise === "elbow" && w.phase === "playing" && !welcome
      ? dragonAt.set(DRAGON_X - 0.85, flightHeight(w.position) - 0.1, 1.6)
      : null;
  };
  return (
    <>
    <group ref={clouds}>
      {CLOUDS.map((c, i) => (
        <group key={i} position={[c.x, c.y, c.z]} scale={c.s}>
          {[
            [-0.7, 0, 0.55],
            [0, 0.25, 0.75],
            [0.75, 0.02, 0.6],
            [0.2, -0.15, 0.7],
          ].map(([x, y, r], n) => (
            <mesh key={n} position={[x, y, 0]} scale={[r * 1.3, r, r * 0.6]}>
              <sphereGeometry args={[1, 18, 12]} />
              <meshStandardMaterial color="#fbfaf1" roughness={1} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
    <Trail world={world} get={dragon} drift={1.45} color="#ffe2a8" count={22} size={0.1} />
    <Burst
      world={world}
      trigger={() => passes.current}
      at={() => {
        const w = world.current;
        return w.exercise === "elbow"
          ? new THREE.Vector3(DRAGON_X + 0.4, flightHeight(w.position), 2.4)
          : null;
      }}
      colors={["#ffe08a", "#c6f59a", "#fff6cf", "#ffb99a"]}
      count={26}
    />
    <group ref={root}>
      {gates.current.map((g, i) => (
        <group key={i}>
          {[-1, 1].map((side) => (
            <group key={side} position={[0, side * (g.halfGap + 1.8), 0]}>
              <mesh>
                <cylinderGeometry args={[PILLAR_RADIUS, PILLAR_RADIUS, 3.6, 16]} />
                <meshStandardMaterial
                  color={side === 1 ? "#92b9a3" : "#83aa90"}
                  roughness={0.9}
                />
              </mesh>
              <mesh position={[0, -side * 1.68, 0.04]}>
                <cylinderGeometry args={[0.62, 0.62, 0.24, 16]} />
                <meshStandardMaterial color="#d8c48a" />
              </mesh>
              {[-0.35, 0, 0.35].map((x, n) => (
                <mesh
                  key={n}
                  position={[x, -side * 1.61, 0.02]}
                  scale={[0.43, 0.22, 0.3]}
                >
                  <sphereGeometry args={[1, 16, 12]} />
                  <meshStandardMaterial color="#f3efdb" />
                </mesh>
              ))}
              <mesh position={[0.05, side * 0.2, 0.44]}>
                <boxGeometry args={[0.08, 1.9, 0.04]} />
                <meshStandardMaterial color="#b8c9a3" />
              </mesh>
            </group>
          ))}
          <group>
            <mesh rotation={[0, 0, Math.PI / 4]}>
              <torusGeometry args={[0.28, 0.035, 8, 24]} />
              <meshBasicMaterial color="#ffe3a0" />
            </mesh>
            <mesh>
              <sphereGeometry args={[0.1, 12, 8]} />
              <meshBasicMaterial color="#fff3b8" />
            </mesh>
          </group>
          <mesh position={[0, 0, -0.12]}>
            <planeGeometry args={[0.9, g.halfGap * 2 - 0.3]} />
            <meshBasicMaterial
              color="#f6dda0"
              transparent
              opacity={0.3}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}
    </group>
    </>
  );
}
