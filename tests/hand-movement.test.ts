import { describe, it, expect } from "vitest";
import {
  handOpenness,
  gripRange,
  normalizeReach,
  validGripRange,
  handHeight,
  reachRange,
} from "../src/movement/exercises";
import { calibrationEstimate } from "../src/movement/calibration";
import type { Landmark } from "../src/movement/core";
const hand = (open: boolean): Landmark[] => {
  const p = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.6 }));
  p[0] = { x: 0.5, y: 0.8 };
  p[9] = { x: 0.5, y: 0.6 };
  [8, 12, 16, 20].forEach(
    (id, i) => (p[id] = { x: 0.45 + i * 0.035, y: open ? 0.28 : 0.65 }),
  );
  return p;
};
describe("Open / close: wake a sleepy flower", () => {
  it("maps open fingers to more bloom than a softly closed hand", () => {
    const closed = handOpenness(hand(false), 4 / 3)!,
      open = handOpenness(hand(true), 4 / 3)!;
    expect(open).toBeGreaterThan(closed + 0.2);
    const range = gripRange(closed, open)!;
    expect(normalizeReach(closed, range.lower, range.upper)).toBe(0);
    expect(normalizeReach(open, range.lower, range.upper)).toBe(1);
    expect(normalizeReach(open + 1, range.lower, range.upper)).toBe(1);
  });
  it("normalizes hand size rather than requiring the child to move closer", () => {
    const full = hand(true);
    const small = full.map((p) => ({
      x: 0.5 + (p.x - 0.5) * 0.5,
      y: 0.5 + (p.y - 0.5) * 0.5,
    }));
    expect(handOpenness(full, 16 / 9)).toBeCloseTo(
      handOpenness(small, 16 / 9)!,
      8,
    );
  });
  it("does not require a thumb to fully extend", () => {
    const a = hand(true),
      b = hand(true);
    b[4] = { x: 0.3, y: 0.8 };
    expect(handOpenness(a, 1)).toBe(handOpenness(b, 1));
  });
  it("rejects missing, off-screen, degenerate and nonfinite hand data", () => {
    expect(handOpenness([], 1)).toBeNull();
    const p = hand(true);
    p[20].x = 1.2;
    expect(handOpenness(p, 1)).toBeNull();
    expect(
      handOpenness(
        Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5 })),
        1,
      ),
    ).toBeNull();
    expect(handOpenness(hand(true), NaN)).toBeNull();
  });
  it("calibrates stable openness with a hand-specific stability threshold", () => {
    const samples = Array.from({ length: 10 }, (_, i) => ({
      angle: 1.1 + (i % 2) * 0.01,
      at: i * 90,
    }));
    expect(
      calibrationEstimate(samples, 810, {
        min: 0,
        max: 5,
        spread: 0.16,
        precision: 1000,
      }).angle,
    ).toBeCloseTo(1.11);
    expect(validGripRange(1.1, 1.15)).toBe(false);
    expect(gripRange(2.1, 1.1)).toEqual({ lower: 1.1, upper: 2.1 });
  });
});
describe("Optional reach movement stays independent", () => {
  it("uses only the selected elbow and wrist, even without the other shoulder", () => {
    const p = Array.from({ length: 33 }, () => ({
      x: 0.5,
      y: 0.5,
      visibility: 0,
    }));
    p[11] = { x: 0.35, y: 0.4, visibility: 0.9 };
    p[12] = { x: 0.65, y: 0.4, visibility: 0.9 };
    p[14] = { x: 0.6, y: 0.6, visibility: 0.9 };
    p[16] = { x: 0.75, y: 0.4, visibility: 0.9 };
    p[11].visibility = 0;
    expect(handHeight(p, "right", 4 / 3)).toBeCloseTo(Math.SQRT1_2);
    expect(reachRange(-0.9, 0.1)).toEqual({ lower: -0.9, upper: 0.1 });
  });
});
