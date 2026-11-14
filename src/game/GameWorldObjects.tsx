import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { WorldState } from "./session";
export function GameWorldObjects({
  world,
  welcome,
}: {
  world: React.RefObject<WorldState>;
  welcome: boolean;
}) {
  const butterfly = useRef<THREE.Group>(null),
    left = useRef<THREE.Group>(null),
    right = useRef<THREE.Group>(null),
    jar = useRef<THREE.Group>(null),
    jarLights = useRef<THREE.Group>(null),
    rings = useRef<THREE.Group>(null);
  const antenna = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.3, 0),
        new THREE.Vector3(0.1, 0.65, 0),
        new THREE.Vector3(0.25, 0.7, 0),
      ]),
    [],
  );
  useFrame(({ clock }, dt) => {
    const w = world.current,
      t = clock.elapsedTime;
    butterfly.current!.visible = w.exercise === "wrist";
    jar.current!.visible = w.exercise === "reach";
    rings.current!.visible = w.exercise === "elbow";
    const p = welcome ? 0.55 : w.position;
    const flutter = w.reduced ? 0 : Math.sin(t * (w.waiting ? 2.2 : 6)) * 0.14;
    left.current!.rotation.y = -0.25 - p * 0.5 + flutter;
    right.current!.rotation.y = 0.25 + p * 0.5 - flutter;
    butterfly.current!.position.y = THREE.MathUtils.damp(
      butterfly.current!.position.y,
      w.celebrating ? 3 : welcome ? 1.2 : -0.1 + p * 3.2,
      4,
      dt,
    );
    butterfly.current!.rotation.z = w.reduced ? 0 : Math.sin(t * 0.8) * 0.06;
    butterfly.current!.position.x = w.celebrating
      ? 4 + Math.sin(t * 0.7)
      : welcome
        ? 5.3
        : 1.5 + Math.sin(t * 0.45) * 0.15;
    jarLights.current!.children.forEach((child, i) => {
      child.visible = i < Math.min(12, w.fireflies);
      child.position.set(
        Math.sin(i * 2.4 + t * 0.3) * 0.34,
        0.4 + (i % 5) * 0.18 + Math.sin(t + i) * 0.04,
        Math.cos(i * 2.4 + t * 0.3) * 0.3,
      );
    });
    rings.current!.children.forEach((ring, i) => {
      ring.position.x = welcome ? 6 + i * 3 : 5 + i * 5 - w.progress * 17;
      ring.position.y =
        0.6 +
        Math.sin(i * 1.8) * 1.7 +
        (w.reduced ? 0 : Math.sin(t * 0.6 + i) * 0.07);
    });
  });
  return (
    <>
      <group
        ref={butterfly}
        position={[1.5, 1.5, 3.6]}
        scale={welcome ? 0.8 : 1.15}
      >
        <group ref={left}>
          {[-1, 1].map((half, i) => (
            <mesh
              key={i}
              position={[-0.59, half > 0 ? 0.44 : -0.45, 0]}
              rotation={[0, 0, half > 0 ? 0.4 : -0.3]}
              scale={[half > 0 ? 0.7 : 0.52, half > 0 ? 0.94 : 0.56, 0.13]}
            >
              <sphereGeometry args={[1, 32, 24]} />
              <meshStandardMaterial
                color={half > 0 ? "#b1a4ce" : "#d0b7d5"}
                roughness={0.82}
              />
            </mesh>
          ))}
          <mesh
            position={[-0.78, 0.5, 0.13]}
            scale={[0.16, 0.22, 0.025]}
            rotation={[0, 0, 0.5]}
          >
            <sphereGeometry args={[1, 20, 14]} />
            <meshStandardMaterial color="#eddaae" />
          </mesh>
        </group>
        <group ref={right}>
          {[-1, 1].map((half, i) => (
            <mesh
              key={i}
              position={[0.59, half > 0 ? 0.44 : -0.45, 0]}
              rotation={[0, 0, half > 0 ? -0.4 : 0.3]}
              scale={[half > 0 ? 0.7 : 0.52, half > 0 ? 0.94 : 0.56, 0.13]}
            >
              <sphereGeometry args={[1, 32, 24]} />
              <meshStandardMaterial
                color={half > 0 ? "#b1a4ce" : "#d0b7d5"}
                roughness={0.82}
              />
            </mesh>
          ))}
          <mesh
            position={[0.78, 0.5, 0.13]}
            scale={[0.16, 0.22, 0.025]}
            rotation={[0, 0, -0.5]}
          >
            <sphereGeometry args={[1, 20, 14]} />
            <meshStandardMaterial color="#eddaae" />
          </mesh>
        </group>
        <mesh scale={[0.17, 0.69, 0.18]}>
          <sphereGeometry args={[1, 24, 18]} />
          <meshStandardMaterial color="#a4a382" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.58, 0.08]} scale={[0.24, 0.24, 0.19]}>
          <sphereGeometry args={[1, 28, 20]} />
          <meshStandardMaterial color="#b2af88" />
        </mesh>
        {[-1, 1].map((side) => (
          <group key={side}>
            <mesh
              position={[side * 0.085, 0.61, 0.25]}
              scale={[0.026, 0.039, 0.012]}
            >
              <sphereGeometry args={[1, 12, 8]} />
              <meshStandardMaterial color="#526a52" />
            </mesh>
            <mesh position={[side * 0.07, 0.65, 0]} scale={[side, 1, 1]}>
              <tubeGeometry args={[antenna, 12, 0.025, 8, false]} />
              <meshStandardMaterial color="#939877" />
            </mesh>
          </group>
        ))}
      </group>
      <group ref={jar} position={[welcome ? 6 : 1.7, -1.8, 3.5]}>
        <mesh position={[0, 0.88, 0]}>
          <cylinderGeometry args={[0.55, 0.62, 1.55, 32]} />
          <meshStandardMaterial
            color="#d3e5d0"
            transparent
            opacity={0.24}
            roughness={0.28}
            depthWrite={false}
          />
        </mesh>
        <mesh position={[0, 0.12, 0]}>
          <cylinderGeometry args={[0.6, 0.61, 0.13, 32]} />
          <meshStandardMaterial color="#9aab79" />
        </mesh>
        <mesh position={[0, 1.69, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.54, 0.06, 10, 32]} />
          <meshStandardMaterial color="#c8b778" />
        </mesh>
        <group ref={jarLights}>
          {Array.from({ length: 12 }, (_, i) => (
            <group key={i}>
              <mesh>
                <sphereGeometry args={[0.045, 10, 8]} />
                <meshBasicMaterial color="#ffe197" />
              </mesh>
              <mesh>
                <sphereGeometry args={[0.11, 12, 10]} />
                <meshBasicMaterial
                  color="#ffdb83"
                  transparent
                  opacity={0.2}
                  depthWrite={false}
                />
              </mesh>
            </group>
          ))}
        </group>
      </group>
      <group ref={rings}>
        {[0, 1, 2].map((i) => (
          <group key={i} position={[5 + i * 5, 1, 1.5]}>
            <mesh>
              <torusGeometry args={[0.8, 0.065, 12, 48]} />
              <meshStandardMaterial
                color="#e2c57d"
                roughness={0.6}
                emissive="#c4a45d"
                emissiveIntensity={0.08}
              />
            </mesh>
            {[-1, 0, 1].map((x, j) => (
              <mesh
                key={j}
                position={[x * 0.5, -0.88, 0]}
                scale={[0.53, 0.23, 0.3]}
              >
                <sphereGeometry args={[1, 24, 16]} />
                <meshStandardMaterial
                  color={j === 1 ? "#edf0de" : "#dce5d2"}
                  roughness={1}
                />
              </mesh>
            ))}
            <mesh position={[0, 0.8, 0.02]} scale={[0.13, 0.18, 0.08]}>
              <sphereGeometry args={[1, 16, 12]} />
              <meshStandardMaterial
                color="#f6dea1"
                emissive="#e3c073"
                emissiveIntensity={0.2}
              />
            </mesh>
          </group>
        ))}
      </group>
    </>
  );
}
