import { describe, expect, it, vi } from "vitest";
import {
  PersonalMotionCapture,
  createPersonalProfile,
  type MotionSample,
} from "../src/movement/personalization";
import { defaultSettings, loadSettings } from "../src/game/session";
import type { TrackingFrame } from "../src/movement/core";
const range = { lower: 1, upper: 2 };
const motion: MotionSample[] = Array.from({ length: 90 }, (_, i) => ({
  value: i % 30 < 15 ? 1.03 : 1.97,
  raw: i % 30 < 15 ? 1.03 : 1.97,
  at: i * 80,
}));
const holds = (noise: number) => [
  Array.from({ length: 15 }, (_, i) => 1 + Math.sin(i * 2) * noise),
  Array.from({ length: 15 }, (_, i) => 2 + Math.sin(i * 2) * noise),
];
describe("Personal calibration from observed movement", () => {
  it("fits a comfortable mapping, never asks for more than the captured range", () => {
    const p = createPersonalProfile(
      "grip",
      "right",
      range,
      motion,
      holds(0.01),
      2,
      9000,
    )!;
    expect(p).not.toBeNull();
    expect(p.lower).toBeGreaterThanOrEqual(1);
    expect(p.upper).toBeLessThanOrEqual(2);
    expect(p.lower).toBeCloseTo(1.03);
    expect(p.upper).toBeCloseTo(1.97);
    expect(p.samples).toBe(90);
    expect(p.cycles).toBe(2);
  });
  it("does not bias the fitted range when a person rests much longer at one endpoint", () => {
    const extra = Array.from({ length: 1200 }, (_, i) => ({
      value: 1.03,
      raw: 1.03,
      at: 9000 + i * 80,
    }));
    const p = createPersonalProfile(
      "grip",
      "right",
      range,
      [...motion, ...extra],
      holds(0.01),
      2,
      110000,
    )!;
    expect(p).not.toBeNull();
    expect(p.lower).toBeCloseTo(1.03);
    expect(p.upper).toBeCloseTo(1.97);
  });
  it("sets stronger smoothing and a larger deadband from a noisier observed hold", () => {
    const still = createPersonalProfile(
      "grip",
      "right",
      range,
      motion,
      holds(0.001),
      2,
      9000,
    )!;
    const noisy = createPersonalProfile(
      "grip",
      "right",
      range,
      motion,
      holds(0.06),
      2,
      9000,
    )!;
    expect(noisy.signalTau).toBeGreaterThan(still.signalTau);
    expect(noisy.signalDeadband).toBeGreaterThan(still.signalDeadband);
    expect(noisy.smoothing).toBeGreaterThan(still.smoothing);
    expect(noisy.signalDeadband).toBeLessThanOrEqual(0.035);
  });
  it("requires two full movements, sufficient observations and two genuine steady holds", () => {
    expect(
      createPersonalProfile("grip", "right", range, motion, holds(0), 1, 9000),
    ).toBeNull();
    expect(
      createPersonalProfile(
        "grip",
        "right",
        range,
        motion.slice(0, 3),
        holds(0),
        2,
        9000,
      ),
    ).toBeNull();
    expect(
      createPersonalProfile("grip", "right", range, motion, [], 2, 9000),
    ).toBeNull();
    expect(
      createPersonalProfile(
        "grip",
        "right",
        range,
        motion.map((s) => ({ ...s, value: 1.5 })),
        holds(0),
        2,
        9000,
      ),
    ).toBeNull();
  });
  it("retains valid anchors for the smallest accepted range and reverses elbow mapping", () => {
    const samples = motion.map((s) => ({
      ...s,
      value: 90 + (s.value - 1) * 5,
    }));
    const p = createPersonalProfile(
      "elbow",
      "left",
      { lower: 95, upper: 90 },
      samples,
      holds(0.01),
      2,
      9000,
    )!;
    expect(p.lower).toBe(95);
    expect(p.upper).toBe(90);
  });
  it("does not restore a previous person's profile from saved preferences", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    vi.stubGlobal("localStorage", {
      getItem: () =>
        JSON.stringify({
          ...defaultSettings,
          personalization: { exercise: "grip", lower: 0, upper: 3 },
        }),
    });
    expect(loadSettings().personalization).toBeNull();
    vi.unstubAllGlobals();
  });
});
describe("Live scan counting", () => {
  function frame(value: number, at: number, valid = true): TrackingFrame {
    return {
      valid,
      angle: null,
      openness: value,
      rawValue: value,
      at,
      points: [],
      message: "",
    };
  }
  it("counts only two complete endpoint movements, with no duplicate-frame progress", () => {
    const c = new PersonalMotionCapture();
    let t = 0;
    const hold = (v: number) => {
      for (let i = 0; i < 6; i++) {
        t += 100;
        c.update(frame(v, t), "grip", range, t);
      }
    };
    hold(1);
    hold(2);
    hold(1);
    expect(c.counter.count).toBe(1);
    hold(2);
    hold(1);
    expect(c.counter.count).toBe(2);
    const before = c.samples.length;
    c.update(frame(1, t), "grip", range, t + 200);
    expect(c.samples.length).toBe(before);
  });
  it("breaks pending cycles on missing input, stale frames and inference gaps", () => {
    const c = new PersonalMotionCapture();
    let t = 0;
    const hold = (v: number) => {
      for (let i = 0; i < 6; i++) {
        t += 100;
        c.update(frame(v, t), "grip", range, t);
      }
    };
    hold(1);
    hold(2);
    c.update(frame(1, t + 100, false), "grip", range, t + 100);
    t += 100;
    hold(1);
    expect(c.counter.count).toBe(0);
    c.update(frame(2, t), "grip", range, t + 600);
    expect(c.counter.phase).toBe("seek-low");
    hold(1);
    hold(2);
    t += 900;
    hold(1);
    expect(c.counter.count).toBe(0);
  });
});
