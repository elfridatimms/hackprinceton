import type { WorldState } from "./session";
export type SkyGate = {
  x: number;
  center: number;
  halfGap: number;
  judged: boolean;
  hit: boolean;
  pulse: number;
};
export const DRAGON_X = -3;
/** Height of the dragon's visual centre for a normalized input. */
export const flightHeight = (position: number) => -0.3 + position * 4.2;
/**
 * One shared geometry for drawing and rules. The dragon is drawn at
 * FLIGHT_SCALE with its lantern tucked in; its body, head and lantern then
 * span ±DRAGON_HALF_HEIGHT around its centre, and wings reach DRAGON_REACH.
 */
export const FLIGHT_SCALE = 0.48;
/** Visual centre of the dragon above its model origin, in world units. */
export const DRAGON_CENTER_OFFSET = 0.09;
export const DRAGON_HALF_HEIGHT = 0.78;
export const DRAGON_REACH = 0.6;
export const PILLAR_RADIUS = 0.42;
export const GATE_HALF_GAP = 1.5;
/** The dragon's centre must stay this close to the gap centre to fit through. */
export const SAFE_BAND = GATE_HALF_GAP - DRAGON_HALF_HEIGHT;
/** Whole dragon fits between the columns at this height. */
export const fitsGap = (height: number, center: number) =>
  Math.abs(height - center) <= SAFE_BAND;
export function createSkyGates(): SkyGate[] {
  return [0, 1, 2, 3].map((i) => ({
    x: 2.5 + i * 7.4,
    center: [1, 2.6, 0.45, 2.1][i],
    halfGap: GATE_HALF_GAP,
    judged: false,
    hit: false,
    pulse: 0,
  }));
}
/** Real geometric crossings; an obstacle touch never earns a gate. */
export function advanceGate(
  g: SkyGate,
  dt: number,
  position: number,
  speed: number,
): "pass" | "touch" | null {
  const previous = g.x;
  g.x -= Math.min(dt, 0.06) * 1.45 * speed;
  g.pulse = Math.max(0, g.pulse - dt);
  const outside = Math.abs(flightHeight(position) - g.center) >
    g.halfGap - DRAGON_HALF_HEIGHT;
  // Columns overlap the dragon horizontally while within column radius + wing reach.
  const overlapping = Math.abs(g.x - DRAGON_X) < PILLAR_RADIUS + DRAGON_REACH;
  let event: "pass" | "touch" | null = null;
  if (!g.judged && !g.hit && overlapping && outside) {
    g.hit = true;
    g.pulse = 0.8;
    event = "touch";
  }
  if (!g.judged && previous >= DRAGON_X && g.x < DRAGON_X) {
    g.judged = true;
    if (!g.hit && !outside) {
      g.pulse = 0.8;
      event = "pass";
    }
  }
  if (g.x < -10) {
    g.x += 29.6;
    g.judged = false;
    g.hit = false;
    g.pulse = 0;
    g.center = 0.35 + ((g.center * 1.7 + 0.6) % 2.5);
  }
  return event;
}

/** Hidden courses must neither move nor award points in another game. */
export function stepSkyCourse(
  gates: SkyGate[],
  dt: number,
  world: Pick<
    WorldState,
    "exercise" | "phase" | "waiting" | "position" | "speed"
  >,
) {
  const events = { passed: 0, touched: 0 };
  if (world.exercise !== "elbow" || world.phase !== "playing" || world.waiting)
    return events;
  for (const gate of gates) {
    const e = advanceGate(gate, dt, world.position, world.speed);
    if (e === "pass") events.passed++;
    if (e === "touch") events.touched++;
  }
  return events;
}
