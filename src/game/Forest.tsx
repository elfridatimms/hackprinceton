import { MagicFlower } from "./MagicFlower";
import {
  useMemo,
  useRef,
  useState,
  Component,
  memo,
  type ReactNode,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Dragon } from "./Dragon";
import type { WorldState } from "./session";
const rng = (seed: number) => {
  let n = seed;
  return () => {
    n = (n * 16807) % 2147483647;
    return (n - 1) / 2147483646;
  };
};
function Ellipsoid({
  position,
  scale,
  color,
}: {
  position: [number, number, number];
  scale: [number, number, number];
  color: string;
}) {
  return (
    <mesh position={position} scale={scale} receiveShadow>
      <sphereGeometry args={[1, 24, 16]} />
      <meshStandardMaterial color={color} roughness={0.95} />
    </mesh>
  );
}
function Tree({
  x,
  y = -2,
  z,
  s = 1,
  seed = 1,
  distant = false,
}: {
  x: number;
  y?: number;
  z: number;
  s?: number;
  seed?: number;
  distant?: boolean;
}) {
  const random = rng(seed);
  const crown = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => ({
        p: [
          (random() - 0.5) * 2.3,
          3.1 + random() * 1.65,
          (random() - 0.5) * 1.1,
        ] as [number, number, number],
        s: [0.9 + random() * 0.6, 1 + random() * 0.6, 0.9 + random() * 0.4] as [
          number,
          number,
          number,
        ],
        c: distant
          ? ["#aacbb3", "#b9d2b6", "#9fbfa7"][i % 3]
          : ["#588e74", "#6a9d7a", "#417963", "#7da57d", "#53866a"][i % 5],
      })),
    [seed, distant],
  );
  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(-0.15, 1.5, 0),
        new THREE.Vector3(0.05, 3, 0),
        new THREE.Vector3(0.24, 4, 0),
      ]),
    [],
  );
  return (
    <group position={[x, y, z]} scale={s}>
      <mesh castShadow>
        <tubeGeometry args={[curve, 12, 0.22, 9, false]} />
        <meshStandardMaterial
          color={distant ? "#9db9a0" : "#8f8f64"}
          roughness={1}
        />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[0, 2.6, 0]} rotation={[0, 0, -side * 0.65]}>
          <cylinderGeometry args={[0.08, 0.13, 1.8, 7]} />
          <meshStandardMaterial color={distant ? "#9db9a0" : "#8f8f64"} />
        </mesh>
      ))}
      {crown.map((c, i) => (
        <Ellipsoid key={i} position={c.p} scale={c.s} color={c.c} />
      ))}
    </group>
  );
}
function Mushroom({
  x,
  y,
  z,
  s = 1,
}: {
  x: number;
  y: number;
  z: number;
  s?: number;
}) {
  return (
    <group position={[x, y, z]} scale={s}>
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.08, 0.12, 0.45, 10]} />
        <meshStandardMaterial color="#f3e8cd" />
      </mesh>
      <mesh position={[0, 0.45, 0]} scale={[1, 0.48, 1]}>
        <sphereGeometry args={[0.36, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#d99071" roughness={0.88} />
      </mesh>
      {[0, 1, 2, 3].map((i) => (
        <Ellipsoid
          key={i}
          position={[
            Math.sin(i * 2) * 0.2,
            0.53 + Math.cos(i) * 0.02,
            Math.cos(i * 2) * 0.2,
          ]}
          scale={[0.045, 0.015, 0.045]}
          color="#ffedcd"
        />
      ))}
    </group>
  );
}
function Flower({
  x,
  y,
  z,
  s = 1,
  color = "#f7e4ac",
}: {
  x: number;
  y: number;
  z: number;
  s?: number;
  color?: string;
}) {
  return (
    <group position={[x, y, z]} scale={s}>
      <mesh position={[0, 0.23, 0]}>
        <cylinderGeometry args={[0.015, 0.022, 0.45, 5]} />
        <meshStandardMaterial color="#6a9263" />
      </mesh>
      {Array.from({ length: 5 }, (_, i) => (
        <Ellipsoid
          key={i}
          position={[
            Math.sin(i * 1.256) * 0.12,
            0.48 + Math.cos(i * 1.256) * 0.12,
            0.02,
          ]}
          scale={[0.075, 0.1, 0.04]}
          color={color}
        />
      ))}
      <Ellipsoid
        position={[0, 0.48, 0.06]}
        scale={[0.065, 0.065, 0.045]}
        color="#e1b85a"
      />
    </group>
  );
}
function Leaf({
  x,
  y,
  z,
  s = 1,
  r = 0,
  color = "#477c61",
}: {
  x: number;
  y: number;
  z: number;
  s?: number;
  r?: number;
  color?: string;
}) {
  return (
    <group position={[x, y, z]} rotation={[0, 0, r]} scale={s}>
      <Ellipsoid
        position={[0, 0.45, 0]}
        scale={[0.18, 0.6, 0.055]}
        color={color}
      />
      <mesh position={[0, 0.3, 0.04]}>
        <cylinderGeometry args={[0.009, 0.018, 0.85, 5]} />
        <meshStandardMaterial color="#a7bd81" />
      </mesh>
    </group>
  );
}
function Rabbit({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, -1.45, z]}>
      <Ellipsoid
        position={[0, 0, 0]}
        scale={[0.32, 0.4, 0.25]}
        color="#e0d8bb"
      />
      <Ellipsoid
        position={[0.12, 0.3, 0.1]}
        scale={[0.23, 0.23, 0.21]}
        color="#ebe2c8"
      />
      {[-0.04, 0.2].map((v, i) => (
        <group key={i} rotation={[0, 0, i ? -0.12 : 0.16]}>
          <Ellipsoid
            position={[v, 0.63, 0.09]}
            scale={[0.065, 0.25, 0.07]}
            color="#e5d9be"
          />
          <Ellipsoid
            position={[v, 0.65, 0.151]}
            scale={[0.027, 0.17, 0.008]}
            color="#d8a795"
          />
        </group>
      ))}
      <Ellipsoid
        position={[0.22, 0.34, 0.286]}
        scale={[0.025, 0.035, 0.015]}
        color="#294b41"
      />
      <Ellipsoid
        position={[-0.3, -0.05, 0.08]}
        scale={[0.14, 0.14, 0.13]}
        color="#faf0d9"
      />
    </group>
  );
}
function AncientTree({ world }: { world: React.RefObject<WorldState> }) {
  const lanterns = useRef<THREE.Group>(null);
  const root = useRef<THREE.Group>(null);
  const endingAt = useRef<number | null>(null);
  const animals = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const p = world.current.progress;
    root.current!.position.x = 13 - p * 9;
    if (
      world.current.phase === "completed" &&
      world.current.celebrating &&
      endingAt.current === null
    )
      endingAt.current = clock.elapsedTime;
    if (world.current.phase !== "completed") endingAt.current = null;
    const age =
      endingAt.current === null ? -10 : clock.elapsedTime - endingAt.current;
    if (animals.current)
      animals.current.scale.setScalar(Math.max(0.001, Math.min(1, age / 2)));
    lanterns.current!.children.forEach((child, i) => {
      child.rotation.z = Math.sin(clock.elapsedTime * 0.7 + i) * 0.06;
      const light = child.children.find(
        (c) => c instanceof THREE.PointLight,
      ) as THREE.PointLight | undefined;
      const illumination = Math.max(0, Math.min(1, (age - i * 0.45) * 1.5));
      if (light) light.intensity = 0.2 + illumination * 3;
      const bulb = child.children.find(
        (c) =>
          c instanceof THREE.Mesh &&
          (c.geometry as THREE.BufferGeometry).type === "SphereGeometry",
      ) as THREE.Mesh | undefined;
      if (bulb)
        (bulb.material as THREE.MeshStandardMaterial).emissiveIntensity =
          0.12 + illumination * 1.8;
    });
  });
  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(-0.2, 1.8, 0),
        new THREE.Vector3(0.2, 3.6, 0),
        new THREE.Vector3(0, 6, 0),
      ]),
    [],
  );
  return (
    <group ref={root} position={[13, -2, -1]}>
      <mesh>
        <tubeGeometry args={[curve, 24, 0.6, 12, false]} />
        <meshStandardMaterial color="#8d8861" />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh rotation={[0, 0, side * 0.8]} position={[side * 0.9, 3.8, 0]}>
            <cylinderGeometry args={[0.2, 0.4, 3.8, 10]} />
            <meshStandardMaterial color="#8d8861" />
          </mesh>
          {[0, 1, 2, 3].map((i) => (
            <Ellipsoid
              key={i}
              position={[
                side * (0.6 + i * 0.65),
                5.4 + Math.sin(i) * 0.6,
                -0.2,
              ]}
              scale={[1.4, 1.2, 0.9]}
              color={["#598e70", "#6c9b75", "#729e77", "#4e8369"][i]}
            />
          ))}
        </group>
      ))}
      <group ref={lanterns}>
        {[-2, -1, 0.3, 1.4, 2.5].map((x, i) => (
          <group key={i} position={[x, 4 + Math.sin(i * 2) * 0.65, 0.8]}>
            <mesh position={[0, -0.4, 0]}>
              <cylinderGeometry args={[0.012, 0.012, 0.8, 5]} />
              <meshStandardMaterial color="#767d52" />
            </mesh>
            <mesh position={[0, -1, 0]} scale={[0.25, 0.32, 0.25]}>
              <sphereGeometry args={[1, 16, 12]} />
              <meshStandardMaterial
                color="#ffcf65"
                emissive="#ffb83f"
                emissiveIntensity={
                  world.current.phase === "completed" ? 2 : 0.35
                }
              />
            </mesh>
            <pointLight
              position={[0, -1, 0.2]}
              color="#ffd071"
              intensity={0.3}
              distance={4}
            />
          </group>
        ))}
      </group>
      <group ref={animals}>
        <Rabbit x={-1.5} z={1} />
        <Rabbit x={1.9} z={1.4} />
      </group>
    </group>
  );
}
function Fireflies({
  world,
  welcome,
  onCollect,
}: {
  world: React.RefObject<WorldState>;
  welcome: boolean;
  onCollect: () => void;
}) {
  const groups = useRef<THREE.Group>(null);
  const lastProgress = useRef(0);
  const flies = useMemo(() => {
    const r = rng(93);
    return Array.from({ length: 26 }, (_, i) => ({
      x: welcome ? -0.4 + r() * 9 : 2 + (i % 9) * 1.3,
      y: -0.1 + (Math.sin(i * 0.85) * 0.5 + 0.5) * 4.4,
      z: 1 + r() * 2,
      phase: r() * 6,
      collected: false,
      delay: 0,
    }));
  }, [welcome]);
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime,
      w = world.current,
      delta = Math.max(0, w.progress - lastProgress.current);
    lastProgress.current = w.progress;
    if (
      w.phase === "welcome" ||
      (w.progress < 0.01 && flies.some((f) => f.collected))
    )
      flies.forEach((f) => {
        f.collected = false;
        f.delay = 0;
      });
    groups.current?.children.forEach((g, i) => {
      const f = flies[i];
      if (!welcome && w.phase === "playing" && !w.waiting) {
        f.x -= delta * 80 * w.speed;
        if (f.x < -9) {
          f.x = 6 + (i % 4);
          f.collected = false;
        }
        if (
          !f.collected &&
          Math.abs(f.x + 3) < 1.1 &&
          Math.abs(f.y - (-0.3 + w.position * 4.2)) < 0.92
        ) {
          f.collected = true;
          f.delay = t;
          onCollect();
        }
      }
      if (f.collected) {
        const a = Math.min(1, (t - f.delay) * 2);
        g.position.lerp(
          new THREE.Vector3(-2.9, -1.6 + w.position * 4.2, 2.4),
          Math.min(1, dt * 5),
        );
        g.scale.setScalar(Math.max(0.001, 1 - a));
        if (t - f.delay > 2 && w.phase === "playing") {
          f.x = 7 + (i % 5);
          f.collected = false;
          g.scale.setScalar(1);
        }
      } else {
        g.position.set(
          f.x + Math.sin(t * 0.8 + f.phase) * 0.13,
          f.y + Math.sin(t * 1.3 + f.phase) * 0.12,
          f.z,
        );
        g.scale.setScalar(0.8 + Math.sin(t * 2 + f.phase) * 0.18);
      }
      if (w.phase === "completed" && w.celebrating) {
        const a = t * 0.8 + i * 2.4;
        g.position.set(
          4 + Math.cos(a) * (1 + i * 0.045),
          1 + i * 0.16 + Math.sin(a) * 0.2,
          Math.sin(a) * 1.3 + 1,
        );
        g.scale.setScalar(1);
      }
    });
  });
  return (
    <group ref={groups}>
      {flies.map((_, i) => (
        <group key={i}>
          <mesh>
            <sphereGeometry args={[0.075, 10, 8]} />
            <meshBasicMaterial color="#ffeab0" />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.16, 12, 8]} />
            <meshBasicMaterial
              color="#ffc74f"
              transparent
              opacity={0.25}
              depthWrite={false}
            />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.31, 12, 8]} />
            <meshBasicMaterial
              color="#ffe2a0"
              transparent
              opacity={0.045}
              depthWrite={false}
            />
          </mesh>
          <mesh
            position={[-0.08, 0.045, -0.01]}
            rotation={[0, 0, 0.5]}
            scale={[0.065, 0.027, 0.02]}
          >
            <sphereGeometry args={[1, 8, 6]} />
            <meshBasicMaterial color="#fff5ce" transparent opacity={0.7} />
          </mesh>
          <mesh
            position={[0.08, 0.045, -0.01]}
            rotation={[0, 0, -0.5]}
            scale={[0.065, 0.027, 0.02]}
          >
            <sphereGeometry args={[1, 8, 6]} />
            <meshBasicMaterial color="#fff5ce" transparent opacity={0.7} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
function CollectionSparkles({ world }: { world: React.RefObject<WorldState> }) {
  const particles = useRef<THREE.Group>(null);
  useFrame(() => {
    const w = world.current;
    const age = performance.now() / 1000 - w.collectAt;
    particles.current!.visible = age >= 0 && age < 0.65;
    particles.current!.position.set(-2.8, -0.4 + w.position * 4.2, 3);
    particles.current!.children.forEach((child, i) => {
      const a = (i / 12) * Math.PI * 2;
      const radius = age * (w.reduced ? 0.3 : 1.3);
      child.position.set(Math.cos(a) * radius, Math.sin(a) * radius, 0);
      child.scale.setScalar(Math.max(0.001, (1 - age / 0.65) * 0.6));
    });
  });
  return (
    <group ref={particles}>
      {Array.from({ length: 12 }, (_, i) => (
        <mesh key={i}>
          <sphereGeometry args={[0.06, 6, 5]} />
          <meshBasicMaterial
            color={i % 2 ? "#ffce70" : "#fff0bb"}
            transparent
            opacity={0.8}
          />
        </mesh>
      ))}
    </group>
  );
}
function ForestMood({
  world,
  welcome,
}: {
  world: React.RefObject<WorldState>;
  welcome: boolean;
}) {
  const light = useRef<THREE.DirectionalLight>(null);
  const { scene } = useThree();
  const mint = useMemo(() => new THREE.Color("#dce9d8"), []),
    woods = useMemo(() => new THREE.Color("#b8d0bf"), []),
    gold = useMemo(() => new THREE.Color("#d9ddbd"), []);
  useFrame(() => {
    const p = welcome ? 0 : world.current.progress;
    const color = new THREE.Color()
      .copy(p < 0.55 ? mint : woods)
      .lerp(p < 0.55 ? woods : gold, p < 0.55 ? p / 0.55 : (p - 0.55) / 0.45);
    if (scene.background instanceof THREE.Color) scene.background.copy(color);
    if (scene.fog instanceof THREE.Fog) scene.fog.color.copy(color);
    if (light.current) {
      light.current.intensity =
        p < 0.55 ? 2.4 - p * 1.4 : 1.6 + (p - 0.55) * 1.8;
      light.current.color.set(
        world.current.phase === "completed" ? "#ffe2a1" : "#fff1cd",
      );
    }
  });
  return (
    <directionalLight
      ref={light}
      position={[-3, 9, 8]}
      intensity={2.4}
      color="#fff1cd"
    />
  );
}
function Scenery({
  world,
  welcome,
  onCollect,
}: {
  world: React.RefObject<WorldState>;
  welcome: boolean;
  onCollect: () => void;
}) {
  const foliage = useRef<THREE.Group>(null),
    scroll = useRef<THREE.Group>(null);
  const [ready, setReady] = useState(false);
  const data = useMemo(() => {
    const r = rng(128);
    return Array.from({ length: 65 }, (_, i) => ({
      x: (r() - 0.5) * 25,
      y: -2.12 + r() * 0.3,
      z: 1 + r() * 4,
      s: 0.45 + r() * 0.5,
      r: (r() - 0.5) * 1.5,
      i,
    }));
  }, []);
  useFrame(({ clock }) => {
    const w = world.current,
      t = clock.elapsedTime;
    if (!ready) setReady(true);
    if (foliage.current && !w.reduced)
      foliage.current.rotation.z = Math.sin(t * 0.35) * 0.006;
    if (scroll.current) scroll.current.position.x = -w.progress * 3;
  });
  return (
    <>
      <color attach="background" args={["#dce9d8"]} />
      <fog attach="fog" args={["#dce9d8", 24, 52]} />
      <ambientLight intensity={0.65} color="#fff5de" />
      <hemisphereLight args={["#fff2cf", "#50765d", 0.85]} />
      <ForestMood world={world} welcome={welcome} />
      <directionalLight position={[8, 3, -4]} intensity={0.7} color="#c3dec4" />

      {[-12, -5, 3, 12].map((x, i) => (
        <Ellipsoid
          key={i}
          position={[x, -1.4, -10]}
          scale={[7, 3.6 + (i % 2), 2]}
          color={i % 2 ? "#bdd4bc" : "#c8dac2"}
        />
      ))}
      <group ref={scroll}>
        {Array.from({ length: 13 }, (_, i) => (
          <Tree
            key={i}
            x={-15 + i * 2.6}
            y={-2.2}
            z={-8 - (i % 3)}
            s={1.5 + (i % 3) * 0.2}
            seed={i + 12}
            distant
          />
        ))}
        {[-11, -8, 6.8, 10.5, 13.2].map((x, i) => (
          <Tree key={i} x={x} z={-3} s={1.3 + (i % 2) * 0.4} seed={i + 28} />
        ))}
        <Ellipsoid
          position={[-7, -3.4, -0.9]}
          scale={[9, 2.2, 5]}
          color="#91b18a"
        />
        <Ellipsoid
          position={[7, -3.8, -0.7]}
          scale={[9, 2.6, 5]}
          color="#9db88b"
        />
        <Ellipsoid
          position={[-9, -3.6, 2.5]}
          scale={[10, 2, 3.4]}
          color="#b0c793"
        />
        <Ellipsoid
          position={[7, -3.65, 2.5]}
          scale={[8, 2, 3.2]}
          color="#a8bf88"
        />
        <mesh position={[0.4, -2.12, 1.2]} rotation={[-Math.PI / 2, 0, -0.55]}>
          <planeGeometry args={[1.6, 13, 20, 20]} />
          <meshStandardMaterial
            color="#a9d2c4"
            roughness={0.3}
            metalness={0.18}
          />
        </mesh>
        {Array.from({ length: 8 }, (_, i) => (
          <mesh
            key={i}
            position={[0.2 + (i % 2) * 0.4, -2.09, -3 + i]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <torusGeometry
              args={[0.2 + (i % 3) * 0.15, 0.008, 4, 36, Math.PI * 1.4]}
            />
            <meshStandardMaterial color="#dfedcf" transparent opacity={0.7} />
          </mesh>
        ))}
        <Rabbit x={5.5} z={1.6} />
        <group position={[7, -1.6, 1]} rotation={[0, 0, -0.1]}>
          <mesh rotation={[Math.PI / 2, 0, 0.3]}>
            <cylinderGeometry args={[0.38, 0.45, 1.8, 14]} />
            <meshStandardMaterial color="#9a8b65" />
          </mesh>
          <mesh position={[-0.25, 0, 0.89]}>
            <circleGeometry args={[0.26, 20]} />
            <meshStandardMaterial color="#5e6650" />
          </mesh>
        </group>
        {data
          .slice(0, 35)
          .map((d) =>
            d.i % 4 === 0 ? (
              <Mushroom key={d.i} x={d.x} y={d.y} z={d.z} s={d.s} />
            ) : (
              <Flower
                key={d.i}
                x={d.x}
                y={d.y}
                z={d.z}
                s={d.s}
                color={d.i % 3 ? "#f6e7b5" : "#beafd1"}
              />
            ),
          )}
      </group>
      <MagicFlower world={world} welcome={welcome} />
      <AncientTree world={world} />
      <CollectionSparkles world={world} />
      <Dragon world={world} welcome={welcome} />
      <Fireflies world={world} welcome={welcome} onCollect={onCollect} />
      <group ref={foliage}>
        {[-11, -10, -8.8, 9.7, 11.3, 12].map((x, i) => (
          <Tree
            key={i}
            x={x}
            y={-3.5}
            z={5}
            s={1.65 + (i % 2) * 0.3}
            seed={i + 61}
          />
        ))}
        {data.slice(35).map((d) => (
          <Leaf
            key={d.i}
            x={d.x}
            y={-3.05}
            z={6}
            s={d.s * 1.6}
            r={d.r}
            color={d.i % 3 ? "#4e8263" : "#73986c"}
          />
        ))}
        {[-7, -5, 5, 7, 9].map((x, i) => (
          <Mushroom key={i} x={x} y={-2.6} z={6} s={0.9 + i * 0.06} />
        ))}
      </group>
    </>
  );
}
class SceneBoundary extends Component<
  { children: ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div className="scene-fallback">
        <span>✦</span>
        <h2>A little forest needs a little graphics magic.</h2>
        <p>
          Please enable hardware acceleration or try a browser with WebGL
          support.
        </p>
      </div>
    ) : (
      this.props.children
    );
  }
}
function Framing({ welcome }: { welcome: boolean }) {
  const { camera, size } = useThree();
  useFrame(() => {
    const ortho = camera as THREE.OrthographicCamera;
    const small = size.width < 560;
    const z = small ? (welcome ? 43 : 39) : Math.min(58, size.width / 20.5);
    if (ortho.zoom !== z) {
      ortho.zoom = z;
      ortho.updateProjectionMatrix();
    }
    const x = small ? (welcome ? 3.5 : -0.4) : 0;
    const y = small && welcome ? 6.1 : 1.7;
    camera.position.set(x, y + 3.3, 22);
    camera.lookAt(x, y, 0);
  });
  return null;
}
export const Forest = memo(function Forest({
  world,
  welcome = false,
  onCollect,
}: {
  world: React.RefObject<WorldState>;
  welcome?: boolean;
  onCollect: () => void;
}) {
  return (
    <SceneBoundary>
      <Canvas
        orthographic
        camera={{ position: [0, 5, 22], zoom: 54, near: 0.1, far: 65 }}
        dpr={[1, 1.65]}
        gl={{
          antialias: true,
          powerPreference: "high-performance",
          alpha: false,
        }}
        onCreated={({ camera, gl }) => {
          camera.lookAt(0, 1.7, 0);
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1;
        }}
      >
        <Framing welcome={welcome} />
        <Scenery world={world} welcome={welcome} onCollect={onCollect} />
      </Canvas>
    </SceneBoundary>
  );
});
