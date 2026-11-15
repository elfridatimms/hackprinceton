import { describe, it, expect } from "vitest";
import { AnchorLock, LandmarkSmoother, OneEuro } from "../src/movement/filter";
import { forearmSteering } from "../src/movement/exercises";

const rms = (values: number[], mean: number) =>
  Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);
const noise = (i: number) => Math.sin(i * 2.3) * 0.6 + Math.sin(i * 5.1) * 0.4;

describe("One Euro landmark smoothing", () => {
  it("passes the first sample through unchanged", () => {
    const f = new OneEuro();
    expect(f.update(0.42, 0)).toBe(0.42);
  });
  it("strongly reduces jitter while the hand is still", () => {
    const f = new OneEuro(),
      raw: number[] = [],
      out: number[] = [];
    for (let i = 0; i < 120; i++) {
      const v = 0.5 + noise(i) * 0.01;
      const y = f.update(v, i * 50);
      if (i > 20) {
        raw.push(v);
        out.push(y);
      }
    }
    expect(rms(out, 0.5)).toBeLessThan(rms(raw, 0.5) * 0.45);
  });
  it("follows a real movement with little lag", () => {
    const f = new OneEuro();
    let y = 0;
    for (let i = 0; i <= 20; i++) y = f.update(i * 0.02, i * 50); // 0.4 / s
    expect(Math.abs(y - 0.4)).toBeLessThan(0.05);
  });
  it("restarts after a stale gap instead of gliding", () => {
    const f = new OneEuro();
    f.update(0.1, 0);
    f.update(0.1, 50);
    expect(f.update(0.9, 2000)).toBe(0.9);
  });
  it("smooths every landmark and keeps visibility", () => {
    const s = new LandmarkSmoother();
    const first = s.update([{ x: 0.2, y: 0.3, visibility: 0.9 }], 0);
    expect(first[0]).toEqual({ x: 0.2, y: 0.3, visibility: 0.9 });
    const second = s.update([{ x: 0.24, y: 0.3, visibility: 0.8 }], 50);
    expect(second[0].x).toBeGreaterThan(0.2);
    expect(second[0].x).toBeLessThan(0.24);
    expect(second[0].visibility).toBe(0.8);
    expect(s.update([], 100)).toEqual([]);
  });
});

describe("Fixed reference point for the pivot joint", () => {
  it("keeps a trembling elbow on one steady point", () => {
    const lock = new AnchorLock();
    const out: number[] = [];
    for (let i = 0; i < 80; i++) {
      const p = lock.update({ x: 0.5 + noise(i) * 0.008, y: 0.6 }, i * 50)!;
      if (i > 5) out.push(p.x);
    }
    expect(Math.max(...out) - Math.min(...out)).toBeLessThan(0.004);
  });
  it("re-pins after a real, sustained move of the elbow", () => {
    const lock = new AnchorLock();
    for (let i = 0; i < 10; i++) lock.update({ x: 0.5, y: 0.6 }, i * 50);
    let p = { x: 0, y: 0 };
    for (let i = 10; i < 40; i++) p = lock.update({ x: 0.6, y: 0.6 }, i * 50)!;
    expect(p.x).toBeGreaterThan(0.595);
  });
  it("makes steering from a pinned elbow steadier than from a raw one", () => {
    const lock = new AnchorLock();
    const raw: number[] = [],
      pinned: number[] = [];
    for (let i = 0; i < 80; i++) {
      const elbow = { x: 0.5 + noise(i) * 0.008, y: 0.6 + noise(i + 7) * 0.008, visibility: 1 };
      const wrist = { x: 0.5, y: 0.4, visibility: 1 };
      const pose = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 1 }));
      pose[14] = elbow;
      pose[16] = wrist;
      const a = forearmSteering(pose, "right", 4 / 3)!;
      pose[14] = { ...elbow, ...lock.update(elbow, i * 50) };
      const b = forearmSteering(pose, "right", 4 / 3)!;
      if (i > 5) {
        raw.push(a);
        pinned.push(b);
      }
    }
    expect(rms(pinned, 0)).toBeLessThan(rms(raw, 0) * 0.4);
  });
});

describe("Anchor ignores brief spikes", () => {
  it("does not re-pin after a single outlier frame", () => {
    const lock = new AnchorLock();
    for (let i = 0; i < 10; i++) lock.update({ x: 0.5, y: 0.6 }, i * 50);
    lock.update({ x: 0.56, y: 0.6 }, 500);
    let p = { x: 0, y: 0 };
    for (let i = 11; i < 30; i++)
      p = lock.update({ x: 0.5 + (i % 2 ? 0.008 : -0.008), y: 0.6 }, i * 50)!;
    expect(Math.abs(p.x - 0.5)).toBeLessThan(0.006);
  });
});

describe("Tuned tracking smoothing", () => {
  it("pose settings stay calm when still but still follow a real lift", () => {
    const still = new OneEuro(0.6, 4.5),
      raw: number[] = [],
      out: number[] = [];
    for (let i = 0; i < 120; i++) {
      const v = 0.5 + noise(i) * 0.01;
      const y = still.update(v, i * 50);
      if (i > 20) {
        raw.push(v);
        out.push(y);
      }
    }
    expect(rms(out, 0.5)).toBeLessThan(rms(raw, 0.5) * 0.3);
    const moving = new OneEuro(0.6, 4.5);
    let y = 0;
    for (let i = 0; i <= 20; i++) y = moving.update(i * 0.02, i * 50);
    expect(Math.abs(y - 0.4)).toBeLessThan(0.08);
    for (let i = 21; i <= 30; i++) y = moving.update(0.4, i * 50);
    expect(Math.abs(y - 0.4)).toBeLessThan(0.02);
  });
});
