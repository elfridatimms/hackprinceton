import { useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { WorldState } from "./session";
import { FireflyTarget, fireflyHeight } from "./fireflyControl";
/** One stationary goal at a time; Luma stays in one vertical lane. */
export function FireflyCatch({
  world,
  welcome,
  onCollect,
}: {
  world: RefObject<WorldState>;
  welcome: boolean;
  onCollect: () => void;
}) {
  const root = useRef<THREE.Group>(null),
    bug = useRef<THREE.Group>(null),
    ring = useRef<THREE.Mesh>(null),
    left = useRef<THREE.Mesh>(null),
    right = useRef<THREE.Mesh>(null);
  const target = useRef(new FireflyTarget()),
    previous = useRef(world.current.phase);
  useFrame(({ clock }, dt) => {
    const w = world.current,
      t = clock.elapsedTime;
    root.current!.visible = w.exercise === "reach";
    if (
      w.phase !== previous.current &&
      (w.phase === "welcome" || w.phase === "practice")
    )
      target.current.reset();
    previous.current = w.phase;
    if (w.exercise !== "reach") return;
    if (
      target.current.update(w.position, dt, w.phase === "playing" && !w.waiting)
    )
      onCollect();
    root.current!.position.set(
      welcome ? 4.7 : -1.8,
      fireflyHeight(welcome ? 0.7 : target.current.position, w.reachTravel) +
        0.28,
      2.3,
    );
    bug.current!.position.y =
      w.reduced || w.waiting ? 0 : Math.sin(t * 1.7) * 0.018;
    left.current!.rotation.z = w.reduced ? 0.5 : 0.5 + Math.sin(t * 7) * 0.17;
    right.current!.rotation.z = -left.current!.rotation.z;
    ring.current!.scale.setScalar(
      1 + Math.min(0.08, target.current.dwell * 0.2),
    );
  });
  return (
    <group ref={root}>
      <mesh ref={ring}>
        <torusGeometry args={[0.4, 0.022, 8, 36]} />
        <meshBasicMaterial color="#f6d78f" transparent opacity={0.65} />
      </mesh>
      <group ref={bug}>
        <mesh position={[0, 0, 0.01]} scale={[0.1, 0.15, 0.07]}>
          <sphereGeometry args={[1, 18, 12]} />
          <meshStandardMaterial
            color="#efcc76"
            emissive="#eac06c"
            emissiveIntensity={0.5}
          />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.25, 18, 12]} />
          <meshBasicMaterial
            color="#ffe7a7"
            transparent
            opacity={0.12}
            depthWrite={false}
          />
        </mesh>
        <mesh
          ref={left}
          position={[-0.12, 0.06, -0.02]}
          scale={[0.13, 0.05, 0.02]}
        >
          <sphereGeometry args={[1, 14, 8]} />
          <meshBasicMaterial color="#fff0c9" transparent opacity={0.8} />
        </mesh>
        <mesh
          ref={right}
          position={[0.12, 0.06, -0.02]}
          scale={[0.13, 0.05, 0.02]}
        >
          <sphereGeometry args={[1, 14, 8]} />
          <meshBasicMaterial color="#fff0c9" transparent opacity={0.8} />
        </mesh>
        {[-0.035, 0.035].map((x) => (
          <mesh key={x} position={[x, 0.08, 0.07]}>
            <sphereGeometry args={[0.012, 8, 6]} />
            <meshBasicMaterial color="#655c40" />
          </mesh>
        ))}
      </group>
    </group>
  );
}
