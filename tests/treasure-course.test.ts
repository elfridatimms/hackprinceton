import { describe, it, expect } from "vitest";
import {
  createTreasureCourse,
  LANE_GOAL,
  nextTreasure,
  SHIP_Z,
  stepTreasures,
} from "../src/game/treasureCourse";

const world = (position: number, phase: "playing" | "paused" = "playing") => ({
  exercise: "ship" as const,
  phase,
  waiting: false,
  position,
  speed: 1,
});
const sail = (c: ReturnType<typeof createTreasureCourse>, position: number, seconds: number) => {
  let caught = 0,
    missed = 0;
  for (let t = 0; t < seconds; t += 0.05) {
    const e = stepTreasures(c, 0.05, world(position));
    caught += e.caught.length;
    missed += e.missed;
  }
  return { caught, missed };
};

describe("Pirate treasure lagoon", () => {
  it("catches a treasure only when the hull is over it at arrival", () => {
    const c = createTreasureCourse();
    stepTreasures(c, 0.05, world(0.1));
    const first = nextTreasure(c)!;
    expect(first.side).toBe(0);
    expect(LANE_GOAL[first.side]).toBe(0.1);
    const r = sail(c, 0.1, 8);
    expect(r.caught).toBeGreaterThanOrEqual(1);
  });
  it("lets a treasure float past when the ship is on the other side, with no penalty", () => {
    const c = createTreasureCourse();
    const r = sail(c, 0.9, 7.2);
    expect(r.caught).toBe(0);
    expect(r.missed).toBe(1);
  });
  it("alternates left and right so play needs both turns", () => {
    const c = createTreasureCourse();
    sail(c, 0.5, 6);
    const sides = c.items.map((t) => t.side);
    expect(new Set(sides).size).toBe(2);
  });
  it("freezes when paused or in another game", () => {
    const c = createTreasureCourse();
    stepTreasures(c, 0.05, world(0.1));
    const z = c.items[0].z;
    stepTreasures(c, 0.05, world(0.1, "paused"));
    stepTreasures(c, 0.05, { ...world(0.1), exercise: "elbow" as never });
    expect(c.items[0].z).toBe(z);
    expect(z).toBeLessThan(SHIP_Z);
  });
});
