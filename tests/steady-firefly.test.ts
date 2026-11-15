import { describe, it, expect } from "vitest";
import { handHeight } from "../src/movement/exercises";
import { QuickPracticeCapture } from "../src/movement/quickPractice";
import { ReachStability } from "../src/movement/reach";
import { MovementFilter } from "../src/movement/filter";
import {
  steadyFireflyPosition,
  fireflyHeight,
  fireflyTravel,
  FireflyTarget,
} from "../src/game/fireflyControl";
import type { Landmark } from "../src/movement/core";
const arm = () => {
  const p: Landmark[] = Array.from({ length: 33 }, () => ({
    x: -1,
    y: -1,
    visibility: 0,
  }));
  p[14] = { x: 0.45, y: 0.6, visibility: 0.9 };
  p[16] = { x: 0.65, y: 0.4, visibility: 0.9 };
  return p;
};
describe("One elbow anchors Firefly input", () => {
  it("works when the entire other arm and both shoulders are absent", () => {
    expect(handHeight(arm(), "right", 1)).toBeCloseTo(Math.SQRT1_2);
    expect(handHeight(arm(), "left", 1)).toBeNull();
  });
  it("does not change when the player translates or moves towards the camera", () => {
    const p = arm(),
      expected = handHeight(p, "right", 1);
    const transformed = p.map((v) => ({
      ...v,
      x: 0.5 + (v.x - 0.5) * 1.3 + 0.04,
      y: 0.5 + (v.y - 0.5) * 1.3 - 0.05,
    }));
    expect(handHeight(transformed, "right", 1)).toBeCloseTo(expected!);
  });
  it("requires a reliable selected elbow and wrist, and rejects a collapsed forearm", () => {
    const p = arm();
    p[14].visibility = 0.5;
    expect(handHeight(p, "right", 1)).toBeNull();
    p[14].visibility = 0.9;
    p[16].x = 1.1;
    expect(handHeight(p, "right", 1)).toBeNull();
    p[16] = { ...p[14] };
    expect(handHeight(p, "right", 1)).toBeNull();
  });
});
describe("Fresh, stable observations without arm swapping", () => {
  it("requires three distinct observations before acquisition and after a missing joint", () => {
    const s = new ReachStability();
    expect(s.update(0.4, 0)).toBeNull();
    expect(s.update(0.4, 70)).toBeNull();
    expect(s.update(0.4, 140)).toBe(0.4);
    expect(s.update(null, 210)).toBeNull();
    expect(s.update(0.4, 280)).toBeNull();
    expect(s.update(0.4, 350)).toBeNull();
    expect(s.update(0.4, 420)).toBe(0.4);
  });
  it("rejects a single impossible landmark jump and accepts a supported new position", () => {
    const s = new ReachStability();
    [0, 70, 140].forEach((t) => s.update(0, t));
    expect(s.update(0.9, 210)).toBeNull();
    expect(s.update(0, 280)).toBe(0);
    expect(s.update(0.8, 350)).toBeNull();
    expect(s.update(0.81, 420)).toBeNull();
    expect(s.update(0.8, 490)).toBe(0.8);
  });
  it("does not use duplicate or stale video observations to reacquire", () => {
    const s = new ReachStability();
    s.update(0.3, 0);
    for (let i = 0; i < 5; i++) expect(s.update(0.3, 0)).toBeNull();
    expect(s.update(0.3, 70)).toBeNull();
    expect(s.update(0.3, 140)).toBe(0.3);
    expect(s.update(0.3, 1000)).toBeNull();
  });
  it("keeps ordinary landmark jitter inside the signal deadband", () => {
    const s = new ReachStability(),
      f = new MovementFilter(0.2, 0.02);
    const out: number[] = [];
    for (let i = 0; i < 120; i++) {
      const value = f.update(
        s.update(0.5 + Math.sin(i * 2) * 0.009, i * 70),
        i * 70,
      );
      if (i > 10 && value !== null) out.push(value);
    }
    expect(Math.max(...out) - Math.min(...out)).toBeLessThan(0.001);
  });
});
describe("A calm vertical flight lane", () => {
  it("does not move Luma for small wobbles or missing tracking", () => {
    let p = 0.5;
    for (let i = 0; i < 300; i++)
      p = steadyFireflyPosition(p, 0.5 + Math.sin(i) * 0.03, 1 / 30);
    expect(p).toBe(0.5);
    for (let i = 0; i < 30; i++) p = steadyFireflyPosition(p, 1, 1 / 30, false);
    expect(p).toBe(0.5);
  });
  it("bounds travel on reacquisition and responds smoothly to a deliberate lift", () => {
    let p = 0,
      previous = 0;
    for (let i = 0; i < 100; i++) {
      p = steadyFireflyPosition(p, 1, 1 / 30);
      expect(p - previous).toBeLessThanOrEqual(0.38 / 30 + 1e-9);
      expect(p).toBeGreaterThanOrEqual(previous);
      previous = p;
    }
    expect(p).toBeGreaterThan(0.9);
    expect(p).toBeLessThanOrEqual(1);
    expect(fireflyHeight(1) - fireflyHeight(0)).toBeCloseTo(1.6);
  });
  it("does not amplify a small comfortable range into a full-screen flight", () => {
    const travel = fireflyTravel(0.2);
    expect(travel).toBe(0.5);
    expect(fireflyHeight(1, travel) - fireflyHeight(0, travel)).toBeCloseTo(
      0.5,
    );
    expect(fireflyTravel(1.5)).toBe(1.6);
  });
  it("offers just one fixed light, rewards a real arrival once, and pauses dwell on loss", () => {
    const goal = new FireflyTarget();
    let n = 0;
    for (let i = 0; i < 100; i++) if (goal.update(0.1, 0.04, true)) n++;
    expect(n).toBe(1);
    expect(goal.position).toBe(0.9);
    for (let i = 0; i < 5; i++) goal.update(0.9, 0.04, true);
    goal.update(0.9, 0.04, false);
    for (let i = 0; i < 5; i++)
      expect(goal.update(0.9, 0.04, true)).toBe(false);
    expect(goal.position).toBe(0.9);
    for (let i = 0; i < 5; i++) if (goal.update(0.9, 0.04, true)) n++;
    expect(n).toBe(2);
  });
});

describe("Firefly setup across brief gaps", () => {
  it("remembers observed positions without inventing a continuous repetition", () => {
    const c = new QuickPracticeCapture("reach");
    let at = 0;
    const hold = (height: number, valid = true, n = 10) => {
      for (let i = 0; i < n; i++) {
        at += 80;
        c.update(
          { valid, angle: null, height, at, points: [], message: "" },
          at,
        );
      }
    };
    hold(-0.5);
    hold(-0.5, false, 1);
    hold(0.5);
    expect(c.phase).toBe("return-low");
    expect(c.profile("right", at)).toBeNull();
    hold(0.5, false, 1);
    hold(-0.5);
    expect(c.profile("right", at)).toMatchObject({
      cycles: 0,
      lower: -0.5,
      upper: 0.5,
    });
  });
  it("does not fit a range from disappearance or a partial movement", () => {
    const c = new QuickPracticeCapture("reach");
    let at = 0;
    for (const [height, valid] of [
      [-0.5, true],
      [0.5, true],
      [0.5, false],
    ] as const)
      for (let i = 0; i < 10; i++) {
        at += 80;
        c.update(
          { valid, angle: null, height, at, points: [], message: "" },
          at,
        );
      }
    expect(c.profile("right", at)).toBeNull();
  });
});
