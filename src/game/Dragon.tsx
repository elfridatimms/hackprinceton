import { fireflyHeight } from "./fireflyControl";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { WorldState } from "./session";
const peach = "#edaa7d",
  light = "#f7bf8d",
  cream = "#fce3b0",
  teal = "#59968a",
  ink = "#24483e";
function Ball({
  p = [0, 0, 0],
  s = [1, 1, 1],
  color = peach,
  ...props
}: {
  p?: [number, number, number];
  s?: [number, number, number];
  color?: string;
  rotation?: [number, number, number];
}) {
  return (
    <mesh position={p} scale={s} {...props} castShadow>
      <sphereGeometry args={[1, 32, 24]} />
      <meshStandardMaterial color={color} roughness={0.77} />
    </mesh>
  );
}
function Wing({ side }: { side: number }) {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.bezierCurveTo(0.1, 0.6, 0.4, 1.18, 0.83, 1.4);
    s.bezierCurveTo(1.18, 1.6, 1.48, 1.33, 1.3, 1);
    s.lineTo(1.12, 0.1);
    s.quadraticCurveTo(0.88, 0.42, 0.72, -0.05);
    s.quadraticCurveTo(0.42, 0.27, 0.28, -0.2);
    s.quadraticCurveTo(0.05, -0.2, 0, 0);
    return s;
  }, []);
  return (
    <group scale={[side, 1, 1]}>
      <mesh rotation={[0, -0.2, 0]}>
        <extrudeGeometry
          args={[
            shape,
            {
              depth: 0.075,
              bevelEnabled: true,
              bevelThickness: 0.08,
              bevelSize: 0.08,
              bevelSegments: 3,
              steps: 1,
            },
          ]}
        />
        <meshStandardMaterial color={teal} roughness={0.85} />
      </mesh>
      <mesh position={[0.02, 0.02, 0.13]} rotation={[0, -0.2, 0]}>
        <tubeGeometry
          args={[
            new THREE.CatmullRomCurve3([
              new THREE.Vector3(0, 0, 0),
              new THREE.Vector3(0.25, 0.7, 0),
              new THREE.Vector3(0.8, 1.35, 0),
              new THREE.Vector3(1.24, 1.1, 0),
            ]),
            24,
            0.065,
            8,
            false,
          ]}
        />
        <meshStandardMaterial color={peach} />
      </mesh>
    </group>
  );
}
export function Dragon({
  world,
  welcome = false,
}: {
  world: React.RefObject<WorldState>;
  welcome?: boolean;
}) {
  const celebration = useRef<number | null>(null);
  const root = useRef<THREE.Group>(null),
    left = useRef<THREE.Group>(null),
    right = useRef<THREE.Group>(null),
    eyes = useRef<THREE.Group>(null),
    head = useRef<THREE.Group>(null),
    tail = useRef<THREE.Group>(null),
    lantern = useRef<THREE.Group>(null),
    glow = useRef<THREE.PointLight>(null);
  const tailCurve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.45, -0.55, 0),
        new THREE.Vector3(-1.1, -0.8, -0.1),
        new THREE.Vector3(-1.65, -0.55, 0),
        new THREE.Vector3(-1.85, -0.05, 0.1),
      ]),
    [],
  );
  useFrame(({ clock }, dt) => {
    const w = world.current,
      t = clock.elapsedTime;
    root.current!.visible = w.exercise === "elbow" || w.exercise === "reach";
    const rest = w.phase === "paused" || w.waiting;
    const reach = w.exercise === "reach";
    const targetY = welcome
      ? 1.65
      : reach
        ? fireflyHeight(w.position, w.reachTravel)
        : -0.3 + w.position * 4.2;
    const r = root.current!;
    if (!reach || welcome || !rest)
      r.position.y =
        reach && !welcome
          ? targetY
          : THREE.MathUtils.damp(r.position.y, targetY, 12, dt) +
            (w.reduced ? 0 : Math.sin(t * 2) * 0.0015);
    r.rotation.z = THREE.MathUtils.damp(
      r.rotation.z,
      reach
        ? 0
        : rest
          ? -0.04
          : Math.max(-0.14, Math.min(0.16, w.velocity * 0.13)),
      5,
      dt,
    );
    r.rotation.y = 0.12 + (reach ? 0 : Math.sin(t * 0.7) * 0.045);
    let flap = w.reduced
      ? 0
      : Math.sin(t * (rest ? 2.6 : w.velocity > 0.1 ? 9 : 5)) *
        (reach ? 0.1 : rest ? 0.12 : 0.28);
    left.current!.rotation.y = flap;
    right.current!.rotation.y = -flap;
    const delight = performance.now() / 1000 - w.collectAt < 0.8;
    if (!w.reduced && performance.now() / 1000 - (w.bumpAt ?? -100) < 0.65)
      r.rotation.z += Math.sin(t * 25) * 0.025;
    head.current!.rotation.z =
      Math.sin(t * 0.9) * 0.035 + (delight ? -0.12 : 0);
    const blink = t % 5.7;
    eyes.current!.scale.y =
      blink > 5.5 ? Math.max(0.07, Math.abs((blink - 5.6) * 10)) : 1;
    tail.current!.rotation.z = Math.sin(t * 2 - 0.7) * 0.07;
    lantern.current!.rotation.z = Math.sin(t * 2.3) * 0.08;
    glow.current!.intensity =
      3 +
      Math.sin(t * 2) * 0.4 +
      (performance.now() / 1000 - w.collectAt < 0.7 ? 6 : 0);
    if (w.phase === "completed" && w.celebrating && !reach) {
      if (celebration.current === null) celebration.current = t;
      const elapsed = t - celebration.current;
      if (elapsed < 2.4) {
        const a = (elapsed / 2.4) * Math.PI * 2;
        r.position.x = -3 + Math.sin(a) * 1.1;
        r.position.y = 2.5 - Math.cos(a) * 1.1;
        r.rotation.z = -a;
      } else {
        r.rotation.z = Math.sin(t * 2) * 0.1;
        r.position.x = THREE.MathUtils.damp(r.position.x, 1.2, 1.6, dt);
        r.position.y = 1.5 + Math.sin(t * 2) * 0.15;
      }
    } else {
      celebration.current = null;
      r.position.x = welcome ? 3.5 : -3;
    }
  });
  return (
    <group
      ref={root}
      position={[welcome ? 3.5 : -3, 1.65, 2]}
      scale={welcome ? 1.12 : 0.8}
    >
      <group ref={left} position={[-0.42, 0.28, -0.35]} rotation={[0, 0, 0.15]}>
        <Wing side={-1} />
      </group>
      <group ref={right} position={[0.4, 0.28, -0.4]} rotation={[0, 0, -0.12]}>
        <Wing side={1} />
      </group>
      <group ref={tail}>
        <mesh castShadow>
          <tubeGeometry args={[tailCurve, 28, 0.19, 12, false]} />
          <meshStandardMaterial color={peach} />
        </mesh>
        <Ball
          p={[-1.87, 0.04, 0.1]}
          s={[0.16, 0.4, 0.1]}
          color={teal}
          rotation={[0, 0, -0.5]}
        />
      </group>
      <Ball p={[0, -0.12, 0]} s={[0.73, 0.9, 0.57]} />
      <Ball p={[0.09, -0.2, 0.48]} s={[0.47, 0.65, 0.17]} color={cream} />
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          position={[0.12, -0.11 - i * 0.2, 0.642]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <torusGeometry args={[0.31 - i * 0.035, 0.012, 6, 24, 1.9]} />
          <meshStandardMaterial color="#e1bd87" transparent opacity={0.45} />
        </mesh>
      ))}
      <Ball p={[-0.5, -0.77, 0.25]} s={[0.29, 0.22, 0.36]} />
      <Ball p={[0.5, -0.77, 0.25]} s={[0.29, 0.22, 0.36]} />
      <Ball
        p={[-0.61, -0.16, 0.35]}
        s={[0.22, 0.38, 0.21]}
        rotation={[0, 0, -0.45]}
      />
      <Ball
        p={[0.63, -0.12, 0.28]}
        s={[0.22, 0.38, 0.21]}
        rotation={[0, 0, 0.65]}
      />
      <group ref={head} position={[0.12, 0.89, 0.1]}>
        <Ball s={[0.92, 0.84, 0.71]} color={light} />
        <Ball p={[0.25, -0.27, 0.51]} s={[0.72, 0.4, 0.4]} color={light} />
        <Ball
          p={[-0.48, 0.71, -0.15]}
          s={[0.16, 0.34, 0.15]}
          color={cream}
          rotation={[0, 0, 0.3]}
        />
        <Ball
          p={[0.47, 0.72, -0.15]}
          s={[0.16, 0.35, 0.15]}
          color={cream}
          rotation={[0, 0, -0.3]}
        />
        <Ball
          p={[-0.85, 0.23, -0.02]}
          s={[0.26, 0.23, 0.13]}
          rotation={[0, 0, -0.3]}
        />
        <Ball
          p={[0.86, 0.23, -0.02]}
          s={[0.26, 0.23, 0.13]}
          rotation={[0, 0, 0.3]}
        />
        <group ref={eyes}>
          <Ball p={[-0.33, 0.09, 0.65]} s={[0.14, 0.205, 0.079]} color={ink} />
          <Ball p={[0.49, 0.1, 0.65]} s={[0.14, 0.205, 0.079]} color={ink} />
          <Ball
            p={[-0.295, 0.16, 0.718]}
            s={[0.047, 0.06, 0.025]}
            color="#fffdf1"
          />
          <Ball
            p={[0.52, 0.17, 0.717]}
            s={[0.047, 0.06, 0.025]}
            color="#fffdf1"
          />
          <Ball
            p={[-0.37, 0.04, 0.727]}
            s={[0.02, 0.023, 0.01]}
            color="#b3d2b4"
          />
          <Ball
            p={[0.45, 0.05, 0.728]}
            s={[0.02, 0.023, 0.01]}
            color="#b3d2b4"
          />
        </group>
        <Ball p={[-0.53, -0.18, 0.63]} s={[0.17, 0.1, 0.025]} color="#e9917d" />
        <Ball
          p={[0.68, -0.17, 0.63]}
          s={[0.15, 0.095, 0.025]}
          color="#e9917d"
        />
        <Ball
          p={[0.15, -0.2, 0.89]}
          s={[0.035, 0.024, 0.015]}
          color="#b77857"
        />
        <Ball
          p={[0.38, -0.19, 0.88]}
          s={[0.035, 0.024, 0.015]}
          color="#b77857"
        />
        <mesh position={[0.25, -0.39, 0.856]} rotation={[0, 0, Math.PI]}>
          <tubeGeometry
            args={[
              new THREE.CatmullRomCurve3([
                new THREE.Vector3(-0.19, 0.01, 0),
                new THREE.Vector3(0, 0.09, 0.01),
                new THREE.Vector3(0.18, 0.01, 0),
              ]),
              16,
              0.018,
              6,
              false,
            ]}
          />
          <meshStandardMaterial color="#8b6248" />
        </mesh>
        <Ball p={[0.02, 0.75, 0.1]} s={[0.19, 0.17, 0.2]} color={peach} />
      </group>
      <group ref={lantern} position={[0.1, -1.04, 0.4]}>
        <mesh position={[0, -0.18, 0]}>
          <torusGeometry args={[0.19, 0.025, 8, 20]} />
          <meshStandardMaterial color="#5c6950" />
        </mesh>
        <mesh position={[0, -0.56, 0]}>
          <cylinderGeometry args={[0.23, 0.27, 0.5, 8]} />
          <meshStandardMaterial
            color="#ffdb78"
            emissive="#ffbb42"
            emissiveIntensity={1.1}
            roughness={0.5}
          />
        </mesh>
        {[-0.28, 0.28].map((y) => (
          <mesh key={y} position={[0, -0.56 + y, 0]}>
            <cylinderGeometry
              args={[y > 0 ? 0.16 : 0.3, y > 0 ? 0.3 : 0.18, 0.13, 8]}
            />
            <meshStandardMaterial
              color="#717450"
              metalness={0.2}
              roughness={0.6}
            />
          </mesh>
        ))}
        {[-1, 1].map((x) => (
          <mesh key={x} position={[x * 0.21, -0.56, 0.16]}>
            <boxGeometry args={[0.027, 0.5, 0.035]} />
            <meshStandardMaterial color="#8f8050" />
          </mesh>
        ))}
        <pointLight
          ref={glow}
          position={[0, -0.52, 0.6]}
          color="#ffcf70"
          intensity={3}
          distance={5}
          decay={2}
        />
        <mesh position={[0, -0.54, 0]} scale={1.5}>
          <sphereGeometry args={[0.35, 20, 16]} />
          <meshBasicMaterial
            color="#ffe5a1"
            transparent
            opacity={0.08}
            depthWrite={false}
          />
        </mesh>
      </group>
    </group>
  );
}
