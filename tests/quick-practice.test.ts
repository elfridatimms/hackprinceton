import { describe, it, expect } from "vitest";
import { QuickPracticeCapture } from "../src/movement/quickPractice";
import type { TrackingFrame } from "../src/movement/core";
const frame = (value: number, at: number, valid = true): TrackingFrame => ({
  valid,
  angle: null,
  openness: value,
  rawValue: value,
  at,
  points: [],
  message: "",
});
describe("Range learned in the movement, without saving separate positions", () => {
  it("uses actual observed endpoints and one full low-high-low movement", () => {
    const c = new QuickPracticeCapture("grip");
    let t = 0;
    const hold = (v: number, n = 10) => {
      for (let i = 0; i < n; i++) {
        t += 100;
        c.update(frame(v, t), t);
      }
    };
    hold(1);
    hold(2);
    expect(c.range).toEqual({ lower: 1, upper: 2 });
    expect(c.profile("right", t)).toBeNull();
    hold(1);
    expect(c.profile("right", t)).toMatchObject({
      lower: 1,
      upper: 2,
      cycles: 1,
    });
  });
  it("does not let a long initial rest bias the observed range", () => {
    const c = new QuickPracticeCapture("grip");
    let t = 0;
    for (let i = 0; i < 300; i++) {
      t += 100;
      c.update(frame(1, t), t);
    }
    for (let i = 0; i < 8; i++) {
      t += 100;
      c.update(frame(2, t), t);
    }
    expect(c.range).toEqual({ lower: 1, upper: 2 });
  });
  it("rejects duplicates, an isolated spike, stale data and out-of-bounds input", () => {
    const c = new QuickPracticeCapture("grip");
    for (let t = 100; t <= 2000; t += 100) c.update(frame(1, t), t);
    c.update(frame(2, 2100), 2100);
    for (let i = 0; i < 20; i++) c.update(frame(2, 2100), 2100);
    expect(c.range).toBeNull();
    c.update(frame(2, 2200), 3000);
    expect(c.samples).toHaveLength(0);
    c.update(frame(6, 3100), 3100);
    expect(c.range).toBeNull();
  });
  it("breaks an unfinished cycle when tracking is lost", () => {
    const c = new QuickPracticeCapture("grip");
    let t = 0;
    const hold = (v: number) => {
      for (let i = 0; i < 10; i++) {
        t += 100;
        c.update(frame(v, t), t);
      }
    };
    hold(1);
    hold(2);
    t += 100;
    c.update(frame(1, t, false), t);
    hold(1);
    expect(c.profile("right", t)).toBeNull();
    hold(2);
    hold(1);
    expect(c.profile("right", t)).not.toBeNull();
  });
});
