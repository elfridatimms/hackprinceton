import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { WorldState } from "./session";
export function MagicFlower({
  world,
  welcome,
}: {
  world: React.RefObject<WorldState>;
  welcome: boolean;
}) {
  const root = useRef<THREE.Group>(null),
    petals = useRef<THREE.Group>(null),
    head = useRef<THREE.Group>(null),
    eyes = useRef<THREE.Group>(null),
    glow = useRef<THREE.Mesh>(null);
  const stem = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(-0.13, 0.7, 0),
        new THREE.Vector3(0.08, 1.4, 0),
        new THREE.Vector3(0, 1.95, 0),
      ]),
    [],
  );
  useFrame(({ clock }, dt) => {
    const w = world.current,
      t = clock.elapsedTime;
    root.current!.visible = w.exercise === "grip";
    const open = welcome
      ? 0.65
      : w.celebrating
        ? 1
        : w.waiting || w.phase === "paused"
          ? 0.15
          : w.position;
    head.current!.rotation.z = w.reduced ? 0 : Math.sin(t * 0.8) * 0.04;
    petals.current!.children.forEach((p, i) => {
      const a = (i / 8) * Math.PI * 2,
        r = 0.18 + open * 0.69;
      p.position.set(Math.sin(a) * r, Math.cos(a) * r, -0.12 - open * 0.1);
      p.rotation.z = -a;
      p.rotation.x = (1 - open) * 0.52;
      p.scale.set(0.25 + open * 0.11, 0.42 + open * 0.35, 0.12 + open * 0.03);
    });
    eyes.current!.scale.y = THREE.MathUtils.damp(
      eyes.current!.scale.y,
      0.16 + open * 0.84,
      7,
      dt,
    );
    const m = glow.current!.material as THREE.MeshBasicMaterial;
    m.opacity = 0.025 + open * 0.11;
    glow.current!.scale.setScalar(0.7 + open * 0.45);
  });
  return (
    <group
      ref={root}
      position={[welcome ? 6 : 1.7, -1.9, 3.5]}
      scale={welcome ? 0.75 : 1.1}
    >
      <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[1.25, 0.65, 1]}>
        <circleGeometry args={[1, 40]} />
        <meshStandardMaterial color="#90ac76" roughness={1} />
      </mesh>
      <mesh>
        <tubeGeometry args={[stem, 24, 0.095, 10, false]} />
        <meshStandardMaterial color="#729866" roughness={0.9} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * 0.45, 0.65 + (side > 0 ? 0.35 : 0), 0]}
          scale={[0.56, 0.22, 0.14]}
          rotation={[0, 0, side * 0.5]}
        >
          <sphereGeometry args={[1, 24, 16]} />
          <meshStandardMaterial
            color={side < 0 ? "#a1bd7c" : "#83a76d"}
            roughness={0.9}
          />
        </mesh>
      ))}
      <group ref={head} position={[0, 1.95, 0]}>
        <group ref={petals}>
          {Array.from({ length: 8 }, (_, i) => (
            <mesh key={i} scale={[0.4, 0.7, 0.17]}>
              <sphereGeometry args={[1, 28, 20]} />
              <meshStandardMaterial
                color={i % 2 ? "#e6afa8" : "#efc1b1"}
                roughness={0.85}
              />
            </mesh>
          ))}
        </group>
        <mesh scale={[0.48, 0.47, 0.27]}>
          <sphereGeometry args={[1, 32, 24]} />
          <meshStandardMaterial color="#efd18a" roughness={0.8} />
        </mesh>
        <group ref={eyes}>
          {[-0.17, 0.17].map((x) => (
            <group key={x}>
              <mesh position={[x, 0.025, 0.258]} scale={[0.035, 0.052, 0.018]}>
                <sphereGeometry args={[1, 16, 12]} />
                <meshStandardMaterial color="#6c704b" />
              </mesh>
              <mesh
                position={[x + 0.008, 0.047, 0.276]}
                scale={[0.011, 0.014, 0.007]}
              >
                <sphereGeometry args={[1, 8, 6]} />
                <meshBasicMaterial color="#fff4cb" />
              </mesh>
            </group>
          ))}
        </group>
        {[-0.28, 0.28].map((x) => (
          <mesh
            key={x}
            position={[x, -0.105, 0.239]}
            scale={[0.067, 0.035, 0.015]}
          >
            <sphereGeometry args={[1, 16, 10]} />
            <meshStandardMaterial color="#ddb381" />
          </mesh>
        ))}
        <mesh position={[0, -0.12, 0.27]} rotation={[0, 0, Math.PI]}>
          <tubeGeometry
            args={[
              new THREE.CatmullRomCurve3([
                new THREE.Vector3(-0.065, 0, 0),
                new THREE.Vector3(0, 0.035, 0),
                new THREE.Vector3(0.065, 0, 0),
              ]),
              10,
              0.012,
              6,
              false,
            ]}
          />
          <meshStandardMaterial color="#a89864" />
        </mesh>
        <mesh ref={glow} position={[0, 0, -0.3]}>
          <sphereGeometry args={[1.3, 24, 16]} />
          <meshBasicMaterial
            color="#ffda87"
            transparent
            opacity={0.08}
            depthWrite={false}
          />
        </mesh>
      </group>
    </group>
  );
}
