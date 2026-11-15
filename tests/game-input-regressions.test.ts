import { describe, it, expect } from "vitest";
import {
  handHeight,
  wristBend,
  forearmSteering,
} from "../src/movement/exercises";
import {
  advanceGate,
  stepSkyCourse,
  createSkyGates,
  DRAGON_X,
  flightHeight,
} from "../src/game/flightCourse";
import { QuickPracticeCapture } from "../src/movement/quickPractice";
import type { Landmark, TrackingFrame } from "../src/movement/core";
const pose = () =>
  Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0.99 }));
describe("Reported movement failures", () => {
  it("anchors Firefly to one elbow instead of absolute screen position", () => {
    const p = pose();
    p[14] = { x: 0.4, y: 0.6, visibility: 0.99 };
    p[16] = { x: 0.65, y: 0.35, visibility: 0.99 };
    expect(handHeight(p, "right", 1)).toBeCloseTo(Math.SQRT1_2);
    const translated = p.map((point) => ({
      ...point,
      x: point.x - 0.1,
      y: point.y - 0.1,
    }));
    expect(handHeight(translated, "right", 1)).toBeCloseTo(Math.SQRT1_2);
    p[14].visibility = 0;
    expect(handHeight(p, "right", 1)).toBeNull();
  });
  it("measures butterfly wrist bend relative to the forearm and is invariant to rotating the whole arm", () => {
    const p = pose(),
      h = Array.from({ length: 21 }, () => ({ x: 0.6, y: 0.5 }));
    p[14] = { x: 0.3, y: 0.5, visibility: 0.99 };
    h[9] = { x: 0.8, y: 0.4 };
    const angle = wristBend(p, h, "right", 1)!;
    expect(angle).toBeCloseTo(26.565);
    const rotate = (point: Landmark) => ({
      ...point,
      x:
        0.5 +
        (point.x - 0.5) * Math.cos(0.35) -
        (point.y - 0.5) * Math.sin(0.35),
      y:
        0.5 +
        (point.x - 0.5) * Math.sin(0.35) +
        (point.y - 0.5) * Math.cos(0.35),
    });
    expect(wristBend(p.map(rotate), h.map(rotate), "right", 1)).toBeCloseTo(
      angle,
    );
    h[9] = { x: 0.8, y: 0.5 };
    expect(wristBend(p, h, "right", 1)).toBeCloseTo(0);
    p[14].visibility = 0.1;
    expect(wristBend(p, h, "right", 1)).toBeNull();
  });
  it("turns the ship from elbow to wrist rather than finger or palm orientation", () => {
    const p = pose();
    p[14] = { x: 0.5, y: 0.7, visibility: 0.99 };
    p[16] = { x: 0.5, y: 0.3, visibility: 0.99 };
    expect(forearmSteering(p, "right", 2)).toBeCloseTo(0);
    p[16].x = 0.6;
    expect(forearmSteering(p, "right", 2)).toBeCloseTo(-26.565);
    p[16].x = 0.4;
    expect(forearmSteering(p, "right", 2)).toBeCloseTo(26.565);
    p[16].y = 0.9;
    expect(forearmSteering(p, "right", 2)).toBeNull();
  });
  it("keeps expanding a supported practice range until the movement returns, instead of freezing a small early range", () => {
    const c = new QuickPracticeCapture("grip");
    let t = 0;
    const hold = (value: number) => {
      for (let i = 0; i < 10; i++) {
        t += 70;
        const f: TrackingFrame = {
          valid: true,
          angle: null,
          openness: value,
          rawValue: value,
          at: t,
          points: [],
          message: "",
        };
        c.update(f, t);
      }
    };
    hold(1);
    hold(1.4);
    expect(c.range?.upper).toBeCloseTo(1.4);
    expect(c.profile("right", t)).toBeNull();
    hold(2.2);
    expect(c.range?.upper).toBeCloseTo(2.2);
    expect(c.profile("right", t)).toBeNull();
    hold(1);
    expect(c.profile("right", t)?.upper).toBeGreaterThan(2);
  });
});
describe("Unhurried practice", () => {
  it("keeps the initial anchor through a long pause at the top", () => {
    const c = new QuickPracticeCapture("reach");
    let t = 0;
    const hold = (height: number, n: number) => {
      for (let i = 0; i < n; i++) {
        t += 70;
        c.update(
          {
            valid: true,
            angle: null,
            height,
            rawValue: height,
            at: t,
            points: [],
            message: "",
          },
          t,
        );
      }
    };
    hold(0.2, 10);
    hold(0.65, 700);
    hold(0.2, 12);
    expect(c.profile("right", t)?.cycles).toBe(1);
  });
});
describe("Flappy-style sky gates", () => {
  it.each(["grip", "reach", "wrist", "ship"] as const)(
    "cannot move or award hidden gates in %s",
    (exercise) => {
      const gates = createSkyGates();
      gates[0].x = DRAGON_X + 0.02;
      const before = gates[0].x;
      const event = stepSkyCourse(gates, 0.06, {
        exercise,
        phase: "playing",
        waiting: false,
        position: (gates[0].center + 0.3) / 4.2,
        speed: 1,
      });
      expect(event).toEqual({ passed: 0, touched: 0 });
      expect(gates[0].x).toBe(before);
    },
  );
  it("freezes the course on pause or missing tracking", () => {
    const gates = createSkyGates(),
      before = gates[0].x;
    stepSkyCourse(gates, 0.06, {
      exercise: "elbow",
      phase: "paused",
      waiting: false,
      position: 0.5,
      speed: 1,
    });
    stepSkyCourse(gates, 0.06, {
      exercise: "elbow",
      phase: "playing",
      waiting: true,
      position: 0.5,
      speed: 1,
    });
    expect(gates[0].x).toBe(before);
  });
  it("rewards only a real crossing through the gap and never twice", () => {
    const g = createSkyGates()[0];
    g.x = DRAGON_X + 0.02;
    const p = (g.center + 0.3) / 4.2;
    expect(flightHeight(p)).toBeCloseTo(g.center);
    expect(advanceGate(g, 0.04, p, 1)).toBe("pass");
    expect(advanceGate(g, 0.04, p, 1)).toBeNull();
  });
  it("gives obstacle-touch feedback and no reward after hitting a column", () => {
    const g = createSkyGates()[0];
    g.x = DRAGON_X + 0.4;
    expect(advanceGate(g, 0.06, 1, 1)).toBe("touch");
    let rewarded = false;
    for (let i = 0; i < 15; i++)
      if (advanceGate(g, 0.06, 0.3, 1) === "pass") rewarded = true;
    expect(rewarded).toBe(false);
    expect(g.judged).toBe(true);
  });
  it("recycles gates, preserves a reachable opening and resets collision state", () => {
    const g = createSkyGates()[1];
    g.x = -10.1;
    g.judged = true;
    g.hit = true;
    advanceGate(g, 0.01, 0.5, 1);
    expect(g.x).toBeGreaterThan(10);
    expect(g.judged).toBe(false);
    expect(g.hit).toBe(false);
    expect(g.center).toBeGreaterThanOrEqual(0.35);
    expect(g.center).toBeLessThan(2.85);
  });
});
describe("Dragon size matches the gate rules", () => {
  it("lets the whole drawn dragon through exactly when it fits between the columns", async () => {
    const { GATE_HALF_GAP, DRAGON_HALF_HEIGHT, SAFE_BAND, fitsGap } =
      await import("../src/game/flightCourse");
    expect(SAFE_BAND).toBeCloseTo(GATE_HALF_GAP - DRAGON_HALF_HEIGHT);
    expect(SAFE_BAND).toBeGreaterThan(0.5);
    expect(fitsGap(1 + SAFE_BAND - 0.01, 1)).toBe(true);
    expect(fitsGap(1 + SAFE_BAND + 0.01, 1)).toBe(false);
  });
  it("counts a touch when the dragon's wing reaches a column it does not fit through", () => {
    const g = createSkyGates()[0];
    g.x = DRAGON_X + 0.95;
    const tooHigh = (g.center + 0.9 + 0.3) / 4.2;
    expect(advanceGate(g, 0.01, tooHigh, 1)).toBe("touch");
  });
});
describe("Butterfly bend in any arm position", () => {
  const pose = () =>
    Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0.99 }));
  const hand = (wx: number, wy: number, kx: number, ky: number) => {
    const h = Array.from({ length: 21 }, () => ({ x: wx, y: wy }));
    for (const i of [5, 9, 13, 17]) h[i] = { x: kx, y: ky };
    return h;
  };
  it("reads a straight hand as level (0°) with the forearm resting sideways", async () => {
    const { wristBend } = await import("../src/movement/exercises");
    const p = pose();
    p[14] = { x: 0.3, y: 0.6, visibility: 0.99 };
    expect(wristBend(p, hand(0.55, 0.6, 0.65, 0.6), "right", 1)).toBeCloseTo(0);
    expect(wristBend(p, hand(0.55, 0.6, 0.65, 0.5), "right", 1)).toBeCloseTo(45);
  });
  it("works with the forearm raised in the air", async () => {
    const { wristBend, wristBendSigned } = await import("../src/movement/exercises");
    const p = pose();
    p[14] = { x: 0.5, y: 0.8, visibility: 0.99 };
    expect(wristBend(p, hand(0.5, 0.5, 0.5, 0.4), "right", 1)).toBeCloseTo(0);
    const forward = wristBendSigned(p, hand(0.5, 0.5, 0.6, 0.4), "right", 1)!;
    const back = wristBendSigned(p, hand(0.5, 0.5, 0.4, 0.4), "right", 1)!;
    expect(Math.abs(forward)).toBeCloseTo(45);
    expect(Math.sign(forward)).toBe(-Math.sign(back));
    expect(wristBend(p, hand(0.5, 0.5, 0.4, 0.4), "right", 1)).toBeCloseTo(45);
  });
  it("needs the elbow and a visible hand side", async () => {
    const { wristBend } = await import("../src/movement/exercises");
    const p = pose();
    p[14] = { x: 0.3, y: 0.6, visibility: 0.1 };
    expect(wristBend(p, hand(0.55, 0.6, 0.65, 0.6), "right", 1)).toBeNull();
    p[14].visibility = 0.99;
    expect(wristBend(p, hand(0.55, 0.6, 0.551, 0.6), "right", 1)).toBeNull();
  });
});
