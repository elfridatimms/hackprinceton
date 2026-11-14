import { describe, it, expect } from "vitest";
import {
  elbowAngle,
  normalizeAngle,
  smooth,
  validRange,
  estimateEndpoint,
  CycleCounter,
  TrackingGate,
  type Landmark,
} from "../src/movement/core";
const points = (s: Landmark, e: Landmark, w: Landmark, arm = "right") => {
  const p = Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.5,
    visibility: 1,
    presence: 1,
  }));
  const ids = arm === "right" ? [12, 14, 16] : [11, 13, 15];
  [s, e, w].forEach(
    (v, i) => (p[ids[i]] = { visibility: 1, presence: 1, ...v }),
  );
  return p;
};
describe("Projected elbow movement", () => {
  it("uses a consistent 180° extended / 90° flexed convention", () => {
    expect(
      elbowAngle(
        points({ x: 0.5, y: 0.2 }, { x: 0.5, y: 0.5 }, { x: 0.5, y: 0.8 }),
        "right",
        4 / 3,
      ),
    ).toBeCloseTo(180);
    expect(
      elbowAngle(
        points({ x: 0.5, y: 0.2 }, { x: 0.5, y: 0.5 }, { x: 0.8, y: 0.5 }),
        "right",
        4 / 3,
      ),
    ).toBeCloseTo(90);
  });
  it("corrects x coordinates for video aspect ratio", () => {
    const angle = elbowAngle(
      points({ x: 0.3, y: 0.3 }, { x: 0.5, y: 0.5 }, { x: 0.7, y: 0.3 }),
      "right",
      2,
    );
    expect(angle).toBeCloseTo(126.869897);
  });
  it("uses the selected arm and rejects missing, occluded, degenerate, and out-of-frame points", () => {
    expect(elbowAngle([], "right", 1)).toBeNull();
    expect(
      elbowAngle(
        points(
          { x: 0.2, y: 0.2, visibility: 0.2 },
          { x: 0.5, y: 0.5 },
          { x: 0.7, y: 0.3 },
        ),
        "right",
        1,
      ),
    ).toBeNull();
    expect(
      elbowAngle(
        points({ x: 0.5, y: 0.5 }, { x: 0.5, y: 0.5 }, { x: 0.7, y: 0.3 }),
        "right",
        1,
      ),
    ).toBeNull();
    expect(
      elbowAngle(
        points({ x: 1.2, y: 0.2 }, { x: 0.5, y: 0.5 }, { x: 0.7, y: 0.3 }),
        "right",
        1,
      ),
    ).toBeNull();
    expect(
      elbowAngle(
        points(
          { x: 0.5, y: 0.2 },
          { x: 0.5, y: 0.5 },
          { x: 0.8, y: 0.5 },
          "left",
        ),
        "left",
        1,
      ),
    ).toBe(90);
  });
  it("maps a small 5° configured range to the entire play space without rewarding overreach", () => {
    expect(validRange(95, 90)).toBe(true);
    expect(normalizeAngle(95, 95, 90)).toBe(0);
    expect(normalizeAngle(90, 95, 90)).toBe(1);
    expect(normalizeAngle(92.5, 95, 90)).toBe(0.5);
    expect(normalizeAngle(30, 95, 90)).toBe(1);
    expect(validRange(91, 90)).toBe(false);
    expect(validRange(90, 110)).toBe(false);
  });
  it("smooths consistently across different render frame intervals", () => {
    let at30 = 0,
      at60 = 0;
    for (let i = 0; i < 30; i++) at30 = smooth(at30, 1, 1 / 30, 0.22);
    for (let i = 0; i < 60; i++) at60 = smooth(at60, 1, 1 / 60, 0.22);
    expect(at30).toBeCloseTo(at60, 8);
  });
});
describe("Comfortable endpoint calibration", () => {
  it("requires sufficient recent stable samples over time", () => {
    expect(estimateEndpoint([{ angle: 100, at: 1000 }], 1000)).toBeNull();
    const data = Array.from({ length: 18 }, (_, i) => ({
      angle: 100 + ((i % 3) - 1),
      at: 66 * i,
    }));
    expect(estimateEndpoint(data, 1122)).toBe(100);
    expect(estimateEndpoint(data, 4000)).toBeNull();
  });
  it("rejects an unsteady arm rather than claiming a successful calibration", () => {
    const data = Array.from({ length: 18 }, (_, i) => ({
      angle: 80 + i * 3,
      at: 66 * i,
    }));
    expect(estimateEndpoint(data, 1122)).toBeNull();
  });
});
function hold(c: CycleCounter, value: number, start: number, valid = true) {
  for (let t = start; t <= start + 300; t += 50) c.update(value, t, valid);
}
describe("Complete movement cycles", () => {
  it("counts only low → high → low with dwell at each endpoint", () => {
    const c = new CycleCounter();
    hold(c, 0.1, 0);
    expect(c.count).toBe(0);
    hold(c, 0.9, 400);
    expect(c.count).toBe(0);
    hold(c, 0.1, 800);
    expect(c.count).toBe(1);
    hold(c, 0.9, 1200);
    hold(c, 0.1, 1600);
    expect(c.count).toBe(2);
  });
  it("rejects partial oscillations and endpoint jitter", () => {
    const c = new CycleCounter();
    hold(c, 0.1, 0);
    for (let t = 400; t < 4000; t += 50)
      c.update(t % 100 ? 0.7 : 0.35, t, true);
    expect(c.count).toBe(0);
    for (let t = 4000; t < 6000; t += 50)
      c.update(t % 100 ? 0.85 : 0.65, t, true);
    expect(c.count).toBe(0);
  });
  it("never counts movement after tracking loss, and requires a new full cycle on recovery", () => {
    const c = new CycleCounter();
    hold(c, 0.1, 0);
    hold(c, 0.9, 400);
    c.update(0.9, 750, false);
    hold(c, 0.1, 800);
    expect(c.count).toBe(0);
    hold(c, 0.9, 1200);
    hold(c, 0.1, 1600);
    expect(c.count).toBe(1);
  });
  it("does not count a high → low half-cycle at the beginning", () => {
    const c = new CycleCounter();
    hold(c, 0.9, 0);
    hold(c, 0.1, 400);
    expect(c.count).toBe(0);
  });
});
describe("Tracking loss and recovery", () => {
  it("halts counting immediately, waits calmly after a tolerance, and requires stable reacquisition", () => {
    const g = new TrackingGate();
    expect(g.update(true, 0).canCount).toBe(false);
    expect(g.update(true, 700).canCount).toBe(true);
    expect(g.update(false, 710).canCount).toBe(false);
    expect(g.update(false, 1300).waiting).toBe(true);
    expect(g.update(true, 1400).canProgress).toBe(false);
    expect(g.update(true, 2100).canProgress).toBe(true);
  });
  it("requires stable frames again after a background-tab reset", () => {
    const g = new TrackingGate();
    g.update(true, 0);
    g.update(true, 700);
    g.reset();
    expect(g.update(true, 4000).canCount).toBe(false);
  });
});

import { canTransition } from "../src/game/stateMachine";
describe("Explicit adventure state machine", () => {
  it("supports setup, calibration, practice, play, rest, resume, and completion", () => {
    for (const [from, to] of [
      ["welcome", "setup"],
      ["setup", "calibration"],
      ["calibration", "practice"],
      ["practice", "playing"],
      ["playing", "paused"],
      ["paused", "playing"],
      ["playing", "completed"],
    ] as const)
      expect(canTransition(from, to)).toBe(true);
  });
  it("prevents jumping straight from welcome into measured play or from calibration into completion", () => {
    expect(canTransition("welcome", "playing")).toBe(false);
    expect(canTransition("calibration", "completed")).toBe(false);
  });
});
