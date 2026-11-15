import type { WorldState } from "./session";

/** Treasures float down the lagoon toward the ship, alternating left and right. */
export const SHIP_Z = 2.2;
export const START_Z = -12;
export const DRIFT_SPEED = 2;
/** Ship hull half-width at the waterline, used both for drawing and catching. */
export const CATCH_HALF_WIDTH = 1.05;
/** Left and right lanes, matching input positions 0.1 and 0.9. */
export const LANE_X = [-2.56, 2.56] as const;
export const LANE_GOAL = [0.1, 0.9] as const;
export const shipX = (position: number) => (position - 0.5) * 6.4;
const SPAWN_GAP = 7.5;

export type Treasure = {
  id: number;
  side: 0 | 1;
  kind: number;
  z: number;
  state: "floating" | "caught" | "missed";
  at: number;
};
export type TreasureCourse = {
  items: Treasure[];
  nextSide: 0 | 1;
  nextId: number;
  time: number;
};
export const createTreasureCourse = (): TreasureCourse => ({
  items: [],
  nextSide: 0,
  nextId: 0,
  time: 0,
});

/** The treasure closest to the ship that can still be caught. */
export function nextTreasure(course: TreasureCourse) {
  return course.items
    .filter((t) => t.state === "floating")
    .sort((a, b) => b.z - a.z)[0];
}

/** Real catches only: the hull must be over the treasure when it reaches the ship. */
export function stepTreasures(
  course: TreasureCourse,
  dt: number,
  world: Pick<WorldState, "exercise" | "phase" | "waiting" | "position" | "speed">,
) {
  const events = { caught: [] as Treasure[], missed: 0 };
  if (world.exercise !== "ship" || world.phase !== "playing" || world.waiting)
    return events;
  const step = Math.min(dt, 0.06);
  course.time += step;
  const floating = course.items.filter((t) => t.state === "floating");
  const newest = floating.reduce<Treasure | undefined>(
    (a, t) => (!a || t.z < a.z ? t : a),
    undefined,
  );
  if (!newest || (floating.length < 2 && newest.z > START_Z + SPAWN_GAP)) {
    course.items.push({
      id: course.nextId,
      side: course.nextSide,
      kind: course.nextId % 4,
      z: START_Z,
      state: "floating",
      at: course.time,
    });
    course.nextId++;
    course.nextSide = course.nextSide === 0 ? 1 : 0;
  }
  const x = shipX(world.position);
  for (const t of course.items) {
    if (t.state === "caught") continue;
    const before = t.z;
    t.z += step * DRIFT_SPEED * world.speed;
    if (t.state === "floating" && before < SHIP_Z && t.z >= SHIP_Z) {
      t.at = course.time;
      if (Math.abs(x - LANE_X[t.side]) <= CATCH_HALF_WIDTH) {
        t.state = "caught";
        events.caught.push(t);
      } else {
        t.state = "missed";
        events.missed++;
      }
    }
  }
  course.items = course.items.filter(
    (t) =>
      !(t.state === "caught" && course.time - t.at > 1.2) &&
      !(t.state === "missed" && t.z > 9),
  );
  return events;
}
