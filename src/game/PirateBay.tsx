import { useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { WorldState } from "./session";

function Pebble({
  position,
  scale,
  color,
}: {
  position: [number, number, number];
  scale: [number, number, number];
  color: string;
}) {
  return (
    <mesh position={position} scale={scale}>
      <sphereGeometry args={[1, 24, 16]} />
      <meshStandardMaterial color={color} roughness={0.85} />
    </mesh>
  );
}
function Palm({ x, z, scale = 1 }: { x: number; z: number; scale?: number }) {
  return (
    <group position={[x, -0.8, z]} scale={scale} rotation={[0, 0, -0.12]}>
      <mesh position={[0, 1, 0]} rotation={[0, 0, -0.13]}>
        <cylinderGeometry args={[0.09, 0.17, 2.2, 9]} />
        <meshStandardMaterial color="#b4a175" />
      </mesh>
      {Array.from({ length: 6 }, (_, i) => (
        <group
          key={i}
          position={[0.14, 2.05, 0]}
          rotation={[0, (i * Math.PI) / 3, 0]}
        >
          <mesh
            rotation={[0, 0, -0.55]}
            position={[0.55, 0.05, 0]}
            scale={[0.85, 0.13, 0.3]}
          >
            <sphereGeometry args={[1, 18, 10]} />
            <meshStandardMaterial color={i % 2 ? "#79a98b" : "#91b593"} />
          </mesh>
        </group>
      ))}
      <Pebble
        position={[0.1, 1.98, 0.14]}
        scale={[0.18, 0.18, 0.16]}
        color="#b19b70"
      />
    </group>
  );
}
function Island({ side }: { side: number }) {
  return (
    <group position={[side * 5.5, 0, -0.3]}>
      <Pebble
        position={[0, -1.28, 0]}
        scale={[2.4, 0.48, 1.65]}
        color="#c8b889"
      />
      <Pebble
        position={[0, -1.05, 0]}
        scale={[2.2, 0.3, 1.55]}
        color="#e4d4ac"
      />
      <Pebble
        position={[side * 0.5, -0.88, -0.4]}
        scale={[1.45, 0.16, 1.05]}
        color="#abc393"
      />
      <Palm x={side * 0.25} z={-0.7} scale={1.25} />
      <Palm x={side * 1.2} z={-0.2} scale={0.8} />
      <Pebble
        position={[-side * 0.7, -0.75, 0.4]}
        scale={[0.3, 0.23, 0.28]}
        color="#b1b9a3"
      />
      <group
        position={[-side * 0.7, -0.62, 0.8]}
        rotation={[0, -side * 0.2, 0]}
      >
        <mesh>
          <boxGeometry args={[0.65, 0.38, 0.44]} />
          <meshStandardMaterial color="#af8468" />
        </mesh>
        <mesh position={[0, 0.19, 0]}>
          <boxGeometry args={[0.68, 0.12, 0.46]} />
          <meshStandardMaterial color="#d0ae73" />
        </mesh>
        {[-0.2, 0.2].map((x) => (
          <mesh key={x} position={[x, 0, 0.23]}>
            <boxGeometry args={[0.055, 0.4, 0.025]} />
            <meshStandardMaterial color="#f0d38a" />
          </mesh>
        ))}
        <mesh position={[0, 0.04, 0.25]}>
          <sphereGeometry args={[0.055, 10, 8]} />
          <meshStandardMaterial color="#f7d888" />
        </mesh>
      </group>
    </group>
  );
}
function ToyShip({
  world,
  welcome,
}: {
  world: RefObject<WorldState>;
  welcome: boolean;
}) {
  const ship = useRef<THREE.Group>(null),
    flag = useRef<THREE.Mesh>(null);
  const sail = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0.08, 0.35);
    s.lineTo(0.08, 2.2);
    s.quadraticCurveTo(1.2, 1.65, 1.28, 0.35);
    s.closePath();
    return s;
  }, []);
  const hull = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-1.4, 0.1);
    s.quadraticCurveTo(-1, -0.7, -0.65, -0.68);
    s.lineTo(0.72, -0.68);
    s.quadraticCurveTo(1.25, -0.48, 1.55, 0.1);
    s.closePath();
    return s;
  }, []);
  useFrame(({ clock }) => {
    if (!ship.current) return;
    const w = world.current;
    const live =
      (w.phase === "playing" || w.phase === "practice") && !w.waiting;
    ship.current.position.x = welcome ? 0 : (w.position - 0.5) * 6.4;
    if (flag.current && !w.reduced && (live || welcome)) {
      flag.current.scale.x = 0.92 + Math.sin(clock.elapsedTime * 5) * 0.08;
      flag.current.rotation.y = Math.sin(clock.elapsedTime * 3) * 0.12;
    }
    if (live || welcome) {
      ship.current.position.y =
        -0.55 + (w.reduced ? 0 : Math.sin(clock.elapsedTime * 1.6) * 0.055);
      ship.current.rotation.z = w.reduced
        ? 0
        : Math.sin(clock.elapsedTime * 1.2) * 0.025 -
          Math.max(-0.09, Math.min(0.09, w.velocity * 0.1));
    }
  });
  return (
    <group ref={ship} position={[0, -0.55, 2]} scale={0.84}>
      <mesh position={[0, 0, -0.33]}>
        <extrudeGeometry
          args={[
            hull,
            {
              depth: 0.66,
              bevelEnabled: true,
              bevelSegments: 3,
              steps: 1,
              bevelSize: 0.1,
              bevelThickness: 0.1,
            },
          ]}
        />
        <meshStandardMaterial color="#ba8467" roughness={0.75} />
      </mesh>
      <mesh position={[0.05, -0.03, 0.05]}>
        <boxGeometry args={[2.5, 0.13, 0.85]} />
        <meshStandardMaterial color="#e0b98c" />
      </mesh>
      {[-0.68, 0, 0.68].map((x) => (
        <group key={x} position={[x, -0.27, 0.47]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.12, 0.035, 8, 20]} />
            <meshStandardMaterial color="#f2d593" />
          </mesh>
          <mesh>
            <circleGeometry args={[0.095, 20]} />
            <meshStandardMaterial color="#5a8a8b" />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.045, 0.06, 2.8, 10]} />
        <meshStandardMaterial color="#987b5a" />
      </mesh>
      <mesh position={[0, 0, 0.06]}>
        <shapeGeometry args={[sail]} />
        <meshStandardMaterial color="#fff0ce" side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0.55, 1.05, 0.085]}>
        <circleGeometry args={[0.22, 5]} />
        <meshStandardMaterial color="#e4bc75" />
      </mesh>
      <mesh ref={flag} position={[-0.35, 2.35, 0]}>
        <boxGeometry args={[0.65, 0.35, 0.025]} />
        <meshStandardMaterial color="#658f8a" />
      </mesh>
      <mesh position={[-0.35, 2.35, 0.03]}>
        <circleGeometry args={[0.11, 5]} />
        <meshStandardMaterial color="#f3d792" />
      </mesh>
      <Pebble
        position={[-0.68, 0.35, 0.1]}
        scale={[0.27, 0.29, 0.23]}
        color="#efb58a"
      />
      <mesh position={[-0.68, 0.52, 0.2]}>
        <sphereGeometry args={[0.29, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#718e80" />
      </mesh>
      {[-0.78, -0.58].map((x) => (
        <mesh key={x} position={[x, 0.35, 0.32]}>
          <sphereGeometry args={[0.028, 8, 6]} />
          <meshBasicMaterial color="#365b50" />
        </mesh>
      ))}
    </group>
  );
}
function IslandLights({
  world,
  onCollect,
}: {
  world: RefObject<WorldState>;
  onCollect: () => void;
}) {
  const root = useRef<THREE.Group>(null);
  const target = useRef(0); // alternate left and right; no collection until a real arrival
  const dwell = useRef(0);
  useFrame(({ clock }, dt) => {
    const w = world.current;
    if (w.phase === "welcome" || w.phase === "practice") {
      target.current = 0;
      dwell.current = 0;
    }
    const destination = target.current === 0 ? 0.1 : 0.9;
    const active = w.phase === "playing" && !w.waiting;
    if (active && Math.abs(w.position - destination) < 0.12) {
      dwell.current += Math.min(dt, 0.06);
      if (dwell.current >= 0.28) {
        onCollect();
        target.current = 1 - target.current;
        dwell.current = 0;
      }
    } else dwell.current = 0;
    root.current?.children.forEach((g, i) => {
      g.visible =
        i === target.current ||
        w.phase === "welcome" ||
        w.phase === "completed";
      g.position.y =
        0.3 + (w.reduced ? 0 : Math.sin(clock.elapsedTime * 1.5 + i) * 0.09);
      g.rotation.z = w.reduced ? 0 : Math.sin(clock.elapsedTime * 0.7) * 0.08;
    });
  });
  return (
    <group ref={root}>
      {[-2.56, 2.56].map((x, i) => (
        <group key={x} position={[x, 0.3, 2.2]}>
          <mesh>
            <sphereGeometry args={[0.12, 16, 12]} />
            <meshBasicMaterial color="#fff1b2" />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.3, 16, 12]} />
            <meshBasicMaterial
              color="#ffe59d"
              transparent
              opacity={0.25}
              depthWrite={false}
            />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 4]}>
            <torusGeometry args={[0.41, 0.025, 8, 32]} />
            <meshStandardMaterial
              color="#e7c685"
              emissive="#dfba6a"
              emissiveIntensity={0.3}
            />
          </mesh>
          {[0, 1, 2, 3].map((n) => (
            <mesh
              key={n}
              position={[
                Math.cos((n * Math.PI) / 2) * 0.59,
                Math.sin((n * Math.PI) / 2) * 0.59,
                0,
              ]}
            >
              <sphereGeometry args={[0.035, 8, 6]} />
              <meshBasicMaterial color={i ? "#fff1be" : "#fff8d5"} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}
export function PirateBay({
  world,
  welcome,
  onCollect,
}: {
  world: RefObject<WorldState>;
  welcome: boolean;
  onCollect: () => void;
}) {
  const waves = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (
      waves.current &&
      !world.current.reduced &&
      (welcome ||
        ((world.current.phase === "playing" ||
          world.current.phase === "practice") &&
          !world.current.waiting))
    )
      waves.current.position.x = Math.sin(clock.elapsedTime * 0.4) * 0.15;
  });
  return (
    <>
      <color attach="background" args={["#dfece8"]} />
      <fog attach="fog" args={["#dfece8", 28, 55]} />
      <ambientLight intensity={1} color="#fff4dc" />
      <hemisphereLight args={["#fff5dd", "#7aafaa", 1.4]} />
      <directionalLight position={[-4, 8, 9]} intensity={2.5} color="#ffefd0" />
      <Pebble
        position={[-9, -1.3, -12]}
        scale={[8, 2.6, 2.5]}
        color="#b9cfc0"
      />
      <Pebble position={[8, -1.4, -14]} scale={[9, 3.4, 2.5]} color="#c6d9cc" />
      <mesh position={[0, -1.37, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[65, 60]} />
        <meshStandardMaterial
          color="#9dc9c4"
          roughness={0.48}
          metalness={0.05}
        />
      </mesh>
      <group ref={waves}>
        {Array.from({ length: 30 }, (_, i) => (
          <mesh
            key={i}
            position={[-14 + (i % 7) * 4.5, -1.35, -9 + Math.floor(i / 7) * 5]}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={[1, 0.35, 1]}
          >
            <torusGeometry
              args={[0.35 + (i % 3) * 0.18, 0.018, 6, 26, Math.PI * 1.2]}
            />
            <meshBasicMaterial color="#dfebe0" transparent opacity={0.6} />
          </mesh>
        ))}
      </group>
      <Island side={-1} />
      <Island side={1} />
      <ToyShip world={world} welcome={welcome} />
      <IslandLights world={world} onCollect={onCollect} />
    </>
  );
}
