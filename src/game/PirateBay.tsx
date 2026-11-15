import { useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { WorldState } from "./session";
import { Burst, Trail } from "./Effects";
import {
  createTreasureCourse,
  LANE_GOAL,
  LANE_X,
  nextTreasure,
  SHIP_Z,
  shipX,
  START_Z,
  stepTreasures,
} from "./treasureCourse";

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
    flag = useRef<THREE.Mesh>(null),
    sailMesh = useRef<THREE.Mesh>(null),
    captain = useRef<THREE.Group>(null);
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
    const t = clock.elapsedTime;
    // Captain hops for joy after every caught treasure.
    const joy = performance.now() / 1000 - w.collectAt;
    if (captain.current)
      captain.current.position.y =
        joy >= 0 && joy < 0.7 && !w.reduced ? Math.sin((joy / 0.7) * Math.PI) * 0.35 : 0;
    if (sailMesh.current && !w.reduced)
      sailMesh.current.scale.x =
        1 + Math.min(0.18, Math.abs(w.velocity) * 0.25) + Math.sin(t * 2.4) * 0.025;
    if (live || welcome) {
      ship.current.rotation.x = w.reduced ? 0 : Math.sin(t * 1.3) * 0.04;
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
      <mesh ref={sailMesh} position={[0, 0, 0.06]}>
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
      <group ref={captain}>
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
    </group>
  );
}
function TreasureModel({ kind }: { kind: number }) {
  if (kind === 0)
    return (
      <group>
        <mesh position={[0, 0.12, 0]}>
          <boxGeometry args={[0.62, 0.36, 0.42]} />
          <meshStandardMaterial color="#a8724f" />
        </mesh>
        <mesh position={[0, 0.34, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 1.35]}>
          <cylinderGeometry args={[0.21, 0.21, 0.62, 14, 1, false, 0, Math.PI]} />
          <meshStandardMaterial color="#c58b5e" />
        </mesh>
        {[-0.2, 0.2].map((x) => (
          <mesh key={x} position={[x, 0.2, 0]}>
            <boxGeometry args={[0.06, 0.5, 0.45]} />
            <meshStandardMaterial color="#f2cf7a" metalness={0.4} roughness={0.4} />
          </mesh>
        ))}
        <mesh position={[0, 0.22, 0.22]}>
          <sphereGeometry args={[0.05, 10, 8]} />
          <meshStandardMaterial color="#ffe08a" emissive="#ffc94f" emissiveIntensity={0.6} />
        </mesh>
      </group>
    );
  if (kind === 1)
    return (
      <group rotation={[0, 0, Math.PI / 2]}>
        <mesh>
          <cylinderGeometry args={[0.24, 0.24, 0.6, 16]} />
          <meshStandardMaterial color="#b88a5c" />
        </mesh>
        {[-0.2, 0.2].map((y) => (
          <mesh key={y} position={[0, y, 0]}>
            <torusGeometry args={[0.245, 0.025, 6, 20]} />
            <meshStandardMaterial color="#6f6a5a" />
          </mesh>
        ))}
      </group>
    );
  if (kind === 2)
    return (
      <group rotation={[0, 0, 1.2]}>
        <mesh>
          <cylinderGeometry args={[0.15, 0.15, 0.48, 14]} />
          <meshStandardMaterial color="#bfe6dc" transparent opacity={0.6} roughness={0.1} />
        </mesh>
        <mesh position={[0, 0.3, 0]}>
          <cylinderGeometry args={[0.06, 0.1, 0.16, 10]} />
          <meshStandardMaterial color="#bfe6dc" transparent opacity={0.6} />
        </mesh>
        <mesh position={[0, 0.4, 0]}>
          <cylinderGeometry args={[0.055, 0.055, 0.07, 8]} />
          <meshStandardMaterial color="#a0744f" />
        </mesh>
        <mesh>
          <cylinderGeometry args={[0.08, 0.08, 0.34, 10]} />
          <meshStandardMaterial color="#f6e9c8" />
        </mesh>
      </group>
    );
  return (
    <group>
      <mesh position={[0, 0.12, 0]} scale={[1, 0.9, 1]}>
        <sphereGeometry args={[0.28, 16, 12]} />
        <meshStandardMaterial color="#c7a06a" />
      </mesh>
      <mesh position={[0, 0.38, 0]}>
        <cylinderGeometry args={[0.07, 0.12, 0.12, 10]} />
        <meshStandardMaterial color="#b08b58" />
      </mesh>
      {[0, 1, 2].map((n) => (
        <mesh key={n} position={[-0.18 + n * 0.18, 0.02, 0.26]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.03, 14]} />
          <meshStandardMaterial color="#ffd86b" metalness={0.5} roughness={0.35} />
        </mesh>
      ))}
    </group>
  );
}
/** Floating treasures: steer the ship so they bump into its hull. */
function TreasureRiver({
  world,
  onCollect,
}: {
  world: RefObject<WorldState>;
  onCollect: () => void;
}) {
  const root = useRef<THREE.Group>(null);
  const course = useRef(createTreasureCourse());
  const caughtAt = useRef(new THREE.Vector3()),
    catches = useRef(0);
  const previous = useRef(world.current.phase);
  useFrame(({ clock }, dt) => {
    const w = world.current,
      t = clock.elapsedTime;
    if (w.phase !== previous.current && (w.phase === "practice" || w.phase === "welcome"))
      course.current = createTreasureCourse();
    previous.current = w.phase;
    const events = stepTreasures(course.current, dt, w);
    for (const c of events.caught) {
      caughtAt.current.set(LANE_X[c.side], -0.6, SHIP_Z);
      catches.current++;
      onCollect();
    }
    if (events.missed) w.streak = 0;
    const next = nextTreasure(course.current);
    w.goal = next ? LANE_GOAL[next.side] : null;
    w.dwell = next ? Math.max(0, Math.min(1, (next.z - START_Z) / (SHIP_Z - START_Z))) : 0;
    const items = course.current.items;
    const sx = shipX(w.position);
    root.current!.children.forEach((slot, i) => {
      const item = items[i];
      if (!item) {
        slot.visible = false;
        return;
      }
      slot.visible = true;
      const model = slot.children[0],
        beacon = slot.children[1],
        ring = slot.children[2];
      model.children.forEach((k, n) => (k.visible = n === item.kind));
      const age = course.current.time - item.at;
      const bob = w.reduced ? 0 : Math.sin(t * 2.2 + item.id) * 0.07;
      if (item.state === "caught") {
        const f = Math.min(1, age / 0.9);
        slot.position.set(
          THREE.MathUtils.lerp(LANE_X[item.side], sx, f),
          -1.1 + Math.sin(f * Math.PI) * 1.6 + f * 0.4,
          SHIP_Z + 0.2,
        );
        slot.scale.setScalar(Math.max(0.001, 1 - f * f));
        model.rotation.y = age * 9;
        beacon.visible = ring.visible = false;
        return;
      }
      slot.scale.setScalar(item.state === "missed" ? Math.max(0.001, 1 - (item.z - SHIP_Z) / 6) : 1);
      slot.position.set(LANE_X[item.side], -1.15 + bob, item.z);
      model.rotation.y = w.reduced ? 0 : Math.sin(t * 0.9 + item.id) * 0.5;
      model.rotation.z = w.reduced ? 0 : Math.sin(t * 1.7 + item.id) * 0.08;
      const isNext = item === next;
      beacon.visible = isNext;
      ring.visible = item.state === "floating";
      ring.scale.setScalar(1 + (w.reduced ? 0 : Math.sin(t * 3) * 0.08) + (isNext ? 0.15 : 0));
      ((beacon as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity =
        0.18 + (w.reduced ? 0 : Math.sin(t * 4) * 0.06);
    });
  });
  return (
    <>
      <Burst
        world={world}
        trigger={() => catches.current}
        at={() => caughtAt.current}
        colors={["#ffd86b", "#f6c04f", "#fff3c0", "#ffffff"]}
        count={28}
        speed={3.2}
        size={0.11}
      />
      <group ref={root}>
        {[0, 1, 2, 3].map((i) => (
          <group key={i} visible={false}>
            <group>
              {[0, 1, 2, 3].map((k) => (
                <group key={k} visible={false}>
                  <TreasureModel kind={k} />
                </group>
              ))}
            </group>
            <mesh position={[0, 1.6, 0]}>
              <cylinderGeometry args={[0.12, 0.4, 3.2, 16, 1, true]} />
              <meshBasicMaterial color="#fff2b3" transparent opacity={0.2} depthWrite={false} side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[0, -0.18, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.62, 0.035, 8, 40]} />
              <meshBasicMaterial color="#fff6d6" transparent opacity={0.85} />
            </mesh>
          </group>
        ))}
      </group>
    </>
  );
}
function Dolphin({ world }: { world: RefObject<WorldState> }) {
  const root = useRef<THREE.Group>(null);
  const jump = useRef({ start: 3, x: 5, z: -5, dir: -1 });
  useFrame(({ clock }) => {
    const t = clock.elapsedTime,
      j = jump.current,
      g = root.current!;
    if (world.current.reduced) {
      g.visible = false;
      return;
    }
    const f = (t - j.start) / 1.5;
    if (f > 1) {
      if (t - j.start > 6.5) {
        j.start = t;
        j.dir = Math.random() < 0.5 ? -1 : 1;
        j.x = j.dir * -(4.6 + Math.random() * 1.2);
        j.z = -8 + Math.random() * 5;
      }
      g.visible = false;
      return;
    }
    g.visible = f >= 0;
    g.position.set(j.x + j.dir * f * 2.2, -1.45 + Math.sin(f * Math.PI) * 1.5, j.z);
    g.rotation.set(0, j.dir > 0 ? 0 : Math.PI, Math.cos(f * Math.PI) * 0.9);
  });
  return (
    <group ref={root} visible={false}>
      <mesh scale={[0.6, 0.2, 0.2]}>
        <sphereGeometry args={[1, 18, 12]} />
        <meshStandardMaterial color="#7fa6b3" />
      </mesh>
      <mesh position={[0.05, 0.22, 0]} rotation={[0, 0, -0.5]} scale={[0.14, 0.18, 0.04]}>
        <coneGeometry args={[1, 1, 8]} />
        <meshStandardMaterial color="#6f97a5" />
      </mesh>
      <mesh position={[-0.62, 0.02, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.18, 0.08, 0.3]}>
        <coneGeometry args={[1, 1, 8]} />
        <meshStandardMaterial color="#6f97a5" />
      </mesh>
      <mesh position={[0.5, 0.06, 0.12]}>
        <sphereGeometry args={[0.03, 8, 6]} />
        <meshBasicMaterial color="#26393f" />
      </mesh>
      <mesh position={[0.1, -0.08, 0]} scale={[0.4, 0.1, 0.16]}>
        <sphereGeometry args={[1, 14, 10]} />
        <meshStandardMaterial color="#e6f0ee" />
      </mesh>
    </group>
  );
}
function Seagulls({ world }: { world: RefObject<WorldState> }) {
  const root = useRef<THREE.Group>(null);
  const wing = useMemo(() => {
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.22, 0.16, 0),
      new THREE.Vector3(0.45, 0.02, 0),
    );
    return new THREE.TubeGeometry(curve, 8, 0.025, 5, false);
  }, []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime,
      reduced = world.current.reduced;
    root.current?.children.forEach((g, i) => {
      const a = (reduced ? 0 : t * (0.18 + i * 0.05)) + i * 2.1;
      g.position.set(Math.cos(a) * (5 + i * 1.5), 4 + i * 0.7 + Math.sin(a * 2) * 0.3, -4 - i);
      const flap = reduced ? 0.3 : 0.3 + Math.sin(t * 6 + i) * 0.35;
      g.children[0].rotation.z = flap;
      g.children[1].rotation.z = -flap;
    });
  });
  return (
    <group ref={root}>
      {[0, 1, 2].map((i) => (
        <group key={i} scale={0.9 - i * 0.15}>
          <mesh geometry={wing} scale={[-1, 1, 1]}>
            <meshStandardMaterial color="#f8f6ee" />
          </mesh>
          <mesh geometry={wing}>
            <meshStandardMaterial color="#f8f6ee" />
          </mesh>
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
  const waves = useRef<THREE.Group>(null),
    islands = useRef<THREE.Group>(null);
  useFrame(({ clock }, dt) => {
    const w = world.current;
    const sailing =
      !w.reduced && !welcome && w.phase === "playing" && !w.waiting;
    if (waves.current && !w.reduced)
      waves.current.position.x = Math.sin(clock.elapsedTime * 0.4) * 0.15;
    // The lagoon flows past while sailing.
    const flow = Math.min(dt, 0.06) * w.speed;
    if (sailing) {
      waves.current?.children.forEach((m) => {
        m.position.z += flow * 2;
        if (m.position.z > 9) m.position.z -= 25;
      });
      islands.current?.children.forEach((g) => {
        g.position.z += flow * 0.9;
        if (g.position.z > 7) g.position.z -= 26;
      });
    }
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
      <group ref={islands}>
        <group position={[-0.9, 0, -4]}>
          <Island side={-1} />
        </group>
        <group position={[0.9, 0, -11]}>
          <Island side={1} />
        </group>
      </group>
      <Dolphin world={world} />
      <ToyShip world={world} welcome={welcome} />
      <Seagulls world={world} />
      <Trail
        world={world}
        color="#ffffff"
        count={24}
        size={0.13}
        get={() => {
          const w = world.current;
          return (w.phase === "playing" || w.phase === "practice") && !welcome
            ? new THREE.Vector3((w.position - 0.5) * 6.4, -1.28, 2.6)
            : null;
        }}
      />
      <TreasureRiver world={world} onCollect={onCollect} />
    </>
  );
}
