import { describe, it, expect } from "vitest";
import {
  CARE_PLANS,
  consistency,
  createPlan,
  dayKey,
  exampleHistory,
  nextExercise,
  romTrend,
  toCsv,
  todayProgress,
  toRecord,
  type SessionRecord,
} from "../src/care/plan";
import { robustRange } from "../src/game/session";

const now = new Date(2026, 10, 15, 18, 0);
const at = (daysAgo: number, hour = 17) => {
  const d = new Date(now);
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};
const rec = (
  exercise: SessionRecord["exercise"],
  daysAgo: number,
  cycles: number,
  extra: Partial<SessionRecord> = {},
): SessionRecord => ({
  id: Math.random(),
  at: at(daysAgo),
  exercise,
  mode: "camera",
  cycles,
  target: 8,
  seconds: 120,
  finished: true,
  rangeLow: null,
  rangeHigh: null,
  ...extra,
});

describe("Care plans", () => {
  it("prescribes two exercises for a wrist injury", () => {
    expect(CARE_PLANS.wrist.exercises).toEqual(["wrist", "grip"]);
    const plan = createPlan("wrist", 10, now);
    expect(plan.items).toEqual([
      { exercise: "wrist", reps: 10 },
      { exercise: "grip", reps: 10 },
    ]);
  });
  it("tracks today's reps and picks the next unfinished exercise", () => {
    const plan = createPlan("wrist", 8, new Date(2026, 10, 1));
    const history = [rec("wrist", 0, 5), rec("wrist", 0, 3), rec("grip", 1, 8)];
    const today = todayProgress(plan, history, now);
    expect(today[0]).toMatchObject({ exercise: "wrist", done: 8, complete: true });
    expect(today[1]).toMatchObject({ exercise: "grip", done: 0, complete: false });
    expect(nextExercise(plan, history, now)).toBe("grip");
    expect(nextExercise(plan, [...history, rec("grip", 0, 8)], now)).toBeNull();
  });
  it("measures consistency as complete, partial and missed days since the plan began", () => {
    const start = new Date(now);
    start.setDate(start.getDate() - 4);
    const plan = createPlan("wrist", 8, start);
    const history = [
      rec("wrist", 4, 8), rec("grip", 4, 8),
      rec("wrist", 3, 8), rec("grip", 3, 8),
      rec("wrist", 2, 4),
      rec("wrist", 1, 8), rec("grip", 1, 8),
    ];
    const c = consistency(plan, history, now);
    expect(c.planned).toBe(5);
    expect(c.complete).toBe(3);
    expect(c.active).toBe(4);
    expect(c.streak).toBe(1);
    expect(c.daily.filter((d) => d.status === "before")).toHaveLength(9);
  });
  it("shows range-of-motion progress from camera sessions only", () => {
    const history = [
      rec("wrist", 3, 8, { rangeLow: 0, rangeHigh: 22 }),
      rec("wrist", 2, 8, { mode: "demo", rangeLow: 0, rangeHigh: 80 }),
      rec("wrist", 1, 8, { rangeLow: 0, rangeHigh: 31 }),
    ];
    const t = romTrend(history, "wrist");
    expect(t.points.map((p) => p.value)).toEqual([22, 31]);
    expect(t.change).toBe(9);
    const elbow = romTrend([rec("elbow", 1, 8, { rangeLow: 90, rangeHigh: 150 })], "elbow");
    expect(elbow.latest).toBe(60);
    expect(elbow.change).toBeNull();
  });
  it("labels example data and exports a CSV with no images or landmarks", () => {
    const plan = createPlan("wrist", 8, new Date(2026, 10, 1));
    const example = exampleHistory(plan, now);
    expect(example.length).toBeGreaterThan(15);
    expect(example.every((r) => r.example)).toBe(true);
    expect(romTrend(example, "wrist").change).toBeGreaterThan(0);
    const csv = toCsv(example);
    expect(csv.split("\n")[0]).toBe(
      "date,time,game,mode,cycles,target,active_seconds,range_low,range_high,example",
    );
    expect(csv).not.toMatch(/points|landmark|image/);
  });
  it("turns a finished session into a stored record and ignores spikes in the range", () => {
    const values = [...Array.from({ length: 40 }, (_, i) => i), 500];
    const r = robustRange(values)!;
    expect(r.high).toBeLessThan(45);
    expect(robustRange([1, 2])).toBeNull();
    const record = toRecord(
      {
        id: 1, cycles: 8, seconds: 90, fireflies: 3, mode: "camera", trace: [],
        finished: true, target: 8, exercise: "grip", rangeLow: 1.1, rangeHigh: 2.2,
      },
      now,
    )!;
    expect(record).toMatchObject({ exercise: "grip", cycles: 8, rangeLow: 1.1, rangeHigh: 2.2 });
    expect(dayKey(new Date(record.at))).toBe(dayKey(now));
  });
});
