import { useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { WorldState } from "./session";
import { stepSkyCourse, createSkyGates } from "./flightCourse";
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
    if (events.touched) w.bumpAt = performance.now() / 1000;
    root.current!.children.forEach((group, i) => {
      const gate = gates.current[i];
      group.position.set(welcome ? 5 + i * 5 : gate.x, gate.center, 2);
      group.children.forEach((part, j) => {
        if (j === 2) {
          part.rotation.z = w.reduced ? 0 : clock.elapsedTime * 0.45;
          part.scale.setScalar(
            gate.pulse > 0 && !gate.hit ? 1 + gate.pulse * 0.6 : 1,
          );
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
  return (
    <group ref={root}>
      {gates.current.map((g, i) => (
        <group key={i}>
          {[-1, 1].map((side) => (
            <group key={side} position={[0, side * (g.halfGap + 1.8), 0]}>
              <mesh>
                <cylinderGeometry args={[0.42, 0.42, 3.6, 16]} />
                <meshStandardMaterial
                  color={side === 1 ? "#92b9a3" : "#83aa90"}
                  roughness={0.9}
                />
              </mesh>
              <mesh position={[0, -side * 1.8, 0.04]}>
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
            <planeGeometry args={[0.07, g.halfGap * 1.8]} />
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
  );
}
