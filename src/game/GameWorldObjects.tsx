import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { WorldState } from "./session";
import { Burst, DwellRing, GuidePath, Trail } from "./Effects";

const nectarSpot = (p: number) => new THREE.Vector3(-3 + p * 6, 0.3 + p * 2.8, 3.6);
const NECTAR = [0.15, 0.85];
export function GameWorldObjects({
  world,
  welcome,
  onCollect,
}: {
  world: React.RefObject<WorldState>;
  welcome: boolean;
  onCollect: () => void;
}) {
  const butterfly = useRef<THREE.Group>(null),
    left = useRef<THREE.Group>(null),
    right = useRef<THREE.Group>(null),
    flowers = useRef<THREE.Group>(null);
  const nectar = useRef({ target: 0, dwell: 0 });
  const visited = useRef(new THREE.Vector3()),
    visits = useRef(0);
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
    flowers.current!.visible = w.exercise === "wrist";
    if (w.phase === "welcome" || w.phase === "practice") {
      nectar.current.target = 0;
      nectar.current.dwell = 0;
    }
    if (
      w.exercise === "wrist" &&
      w.phase === "playing" &&
      !w.waiting &&
      Math.abs(w.position - (nectar.current.target === 0 ? 0.15 : 0.85)) < 0.13
    ) {
      nectar.current.dwell += Math.min(dt, 0.06);
      if (nectar.current.dwell > 0.3) {
        visited.current.copy(nectarSpot(NECTAR[nectar.current.target]));
        visits.current++;
        onCollect();
        nectar.current.target = 1 - nectar.current.target;
        nectar.current.dwell = 0;
      }
    } else nectar.current.dwell = 0;
    if (w.exercise === "wrist") {
      w.goal = NECTAR[nectar.current.target];
      w.dwell = Math.min(1, nectar.current.dwell / 0.3);
    }
    flowers.current!.children.forEach((f, i) => {
      f.scale.setScalar(
        i === nectar.current.target
          ? 1.05 + (w.reduced ? 0 : Math.sin(t * 3) * 0.05)
          : 0.8,
      );
    });
    const p = welcome ? 0.55 : w.position;
    const flutter = w.reduced ? 0 : Math.sin(t * (w.waiting ? 2.2 : 11)) * 0.48;
    left.current!.rotation.y = -0.25 - p * 0.5 + flutter;
    right.current!.rotation.y = 0.25 + p * 0.5 - flutter;
    butterfly.current!.position.y = THREE.MathUtils.damp(
      butterfly.current!.position.y,
      w.celebrating ? 3 : welcome ? 1.2 : 0.3 + p * 2.8,
      10,
      dt,
    );
    butterfly.current!.rotation.z = THREE.MathUtils.damp(
      butterfly.current!.rotation.z,
      (w.reduced ? 0 : Math.sin(t * 0.8) * 0.06) -
        (welcome ? 0 : Math.max(-0.35, Math.min(0.35, w.velocity * 0.25))),
      6,
      dt,
    );
    butterfly.current!.position.x = w.celebrating
      ? 4 + Math.sin(t * 0.7)
      : welcome
        ? 5.3
        : -3 + p * 6;
  });
  const playing = () =>
    world.current.exercise === "wrist" && world.current.phase === "playing" && !welcome;
  const goalAt = () => (playing() ? nectarSpot(NECTAR[nectar.current.target]) : null);
  const flyer = new THREE.Vector3();
  const butterflyAt = () =>
    playing() && butterfly.current
      ? flyer.copy(butterfly.current.position).add(new THREE.Vector3(0, -0.05, -0.3))
      : null;
  return (
    <>
      <DwellRing
        world={world}
        radius={0.82}
        color="#c6f59a"
        get={() => {
          const at = goalAt();
          return at ? { at, dwell: nectar.current.dwell / 0.3 } : null;
        }}
      />
      <GuidePath world={world} from={butterflyAt} to={goalAt} color="#f4e2ff" />
      <Trail world={world} get={butterflyAt} color="#e6d8ff" count={20} size={0.08} />
      <Burst
        world={world}
        trigger={() => visits.current}
        at={() => visited.current}
        colors={["#ecc3d0", "#f1d2a0", "#d9c8ff", "#fff3c0"]}
        count={24}
      />
      <group ref={flowers}>
        {[0.15, 0.85].map((p, i) => (
          <group key={i} position={[-3 + p * 6, 0.3 + p * 2.8, 3.6]}>
            {Array.from({ length: 6 }, (_, n) => (
              <mesh
                key={n}
                position={[
                  Math.cos((n * Math.PI) / 3) * 0.32,
                  Math.sin((n * Math.PI) / 3) * 0.32,
                  0,
                ]}
                scale={[0.24, 0.35, 0.06]}
                rotation={[0, 0, (n * Math.PI) / 3 - Math.PI / 2]}
              >
                <sphereGeometry args={[1, 18, 12]} />
                <meshStandardMaterial color={i ? "#ecc3d0" : "#f1d2a0"} />
              </mesh>
            ))}
            <mesh position={[0, 0, 0.05]}>
              <sphereGeometry args={[0.2, 16, 12]} />
              <meshStandardMaterial
                color="#e4b966"
                emissive="#efc66f"
                emissiveIntensity={0.3}
              />
            </mesh>
            <mesh position={[0, 0, -0.06]}>
              <torusGeometry args={[0.7, 0.018, 8, 32]} />
              <meshBasicMaterial color="#f5e3af" transparent opacity={0.6} />
            </mesh>
          </group>
        ))}
      </group>
      <group
        ref={butterfly}
        position={[1.5, 1.5, 4.2]}
        scale={welcome ? 0.8 : 0.62}
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
    </>
  );
}
