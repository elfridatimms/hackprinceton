import type { Exercise } from "../movement/exercises";
import type { Mode, Summary } from "../game/session";

/** Example programs a therapist can start from and then adjust. Not a prescription. */
export type PlanId = "wrist" | "hand" | "elbow" | "forearm";
export const CARE_PLANS: Record<
  PlanId,
  { label: string; detail: string; exercises: Exercise[] }
> = {
  wrist: {
    label: "Wrist injury",
    detail: "Wrist bend and gentle grip",
    exercises: ["wrist", "grip"],
  },
  hand: {
    label: "Hand & fingers",
    detail: "Open and close, then wrist bend",
    exercises: ["grip", "wrist"],
  },
  elbow: {
    label: "Elbow stiffness",
    detail: "Elbow bend and forearm turns",
    exercises: ["elbow", "ship"],
  },
  forearm: {
    label: "Forearm / after a cast",
    detail: "Forearm turns and wrist bend",
    exercises: ["ship", "wrist"],
  },
};
export const PLAN_ORDER: PlanId[] = ["wrist", "hand", "elbow", "forearm"];

export type CarePlan = {
  id: PlanId;
  /** Repetitions (movement cycles) per exercise per day. */
  items: { exercise: Exercise; reps: number }[];
  /** ISO day the plan started (YYYY-MM-DD). */
  startedOn: string;
};
export type SessionRecord = {
  id: number;
  /** ISO timestamp of the end of the session. */
  at: string;
  exercise: Exercise;
  mode: Mode;
  cycles: number;
  target: number;
  seconds: number;
  finished: boolean;
  rangeLow: number | null;
  rangeHigh: number | null;
  /** Clearly marked example data for demonstrations. */
  example?: boolean;
};

export const dayKey = (d: Date) => {
  const y = d.getFullYear(),
    m = String(d.getMonth() + 1).padStart(2, "0"),
    day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const addDays = (d: Date, n: number) => {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
};

export function createPlan(id: PlanId, reps = 8, now = new Date()): CarePlan {
  return {
    id,
    items: CARE_PLANS[id].exercises.map((exercise) => ({ exercise, reps })),
    startedOn: dayKey(now),
  };
}

export function toRecord(summary: Summary, now = new Date()): SessionRecord | null {
  if (!summary.exercise) return null;
  return {
    id: summary.id,
    at: now.toISOString(),
    exercise: summary.exercise,
    mode: summary.mode,
    cycles: summary.cycles,
    target: summary.target,
    seconds: summary.seconds,
    finished: summary.finished,
    rangeLow: summary.rangeLow ?? null,
    rangeHigh: summary.rangeHigh ?? null,
  };
}

/** Reps done per exercise on one day (all modes count toward the daily goal). */
export function repsOnDay(history: SessionRecord[], exercise: Exercise, day: string) {
  return history
    .filter((r) => r.exercise === exercise && dayKey(new Date(r.at)) === day)
    .reduce((n, r) => n + r.cycles, 0);
}

export function todayProgress(plan: CarePlan, history: SessionRecord[], now = new Date()) {
  const day = dayKey(now);
  return plan.items.map((item) => {
    const done = repsOnDay(history, item.exercise, day);
    return { ...item, done, complete: done >= item.reps };
  });
}
export function nextExercise(plan: CarePlan, history: SessionRecord[], now = new Date()) {
  return todayProgress(plan, history, now).find((i) => !i.complete)?.exercise ?? null;
}

export type DayStatus = "complete" | "partial" | "none" | "before";
/** Last `days` days, oldest first: did the child do all, some, or none of the plan? */
export function dailyStatus(
  plan: CarePlan,
  history: SessionRecord[],
  now = new Date(),
  days = 14,
) {
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(now, i - days + 1),
      day = dayKey(date);
    if (day < plan.startedOn) return { day, date, status: "before" as DayStatus, reps: 0 };
    const parts = plan.items.map((item) => repsOnDay(history, item.exercise, day));
    const reps = parts.reduce((a, b) => a + b, 0);
    const status: DayStatus = plan.items.every((item, n) => parts[n] >= item.reps)
      ? "complete"
      : reps > 0
        ? "partial"
        : "none";
    return { day, date, status, reps };
  });
}

export function consistency(plan: CarePlan, history: SessionRecord[], now = new Date(), days = 14) {
  const daily = dailyStatus(plan, history, now, days);
  const counted = daily.filter((d) => d.status !== "before");
  const complete = counted.filter((d) => d.status === "complete").length;
  const active = counted.filter((d) => d.status !== "none").length;
  // Streak of complete days ending today (or yesterday, if today is still open).
  let streak = 0;
  for (let i = daily.length - 1; i >= 0; i--) {
    const d = daily[i];
    if (d.status === "complete") streak++;
    else if (i === daily.length - 1 && d.status !== "before") continue;
    else break;
  }
  return { daily, planned: counted.length, complete, active, streak };
}

/** How the range of motion is read for each game, in its own units. */
export const ROM: Record<
  Exercise,
  { label: string; unit: string; value: (r: SessionRecord) => number | null }
> = {
  wrist: {
    label: "Largest wrist bend",
    unit: "°",
    value: (r) => r.rangeHigh,
  },
  grip: {
    label: "Hand opening span",
    unit: "×",
    value: (r) => (r.rangeHigh !== null && r.rangeLow !== null ? r.rangeHigh - r.rangeLow : null),
  },
  elbow: {
    label: "Elbow bend arc",
    unit: "°",
    value: (r) => (r.rangeHigh !== null && r.rangeLow !== null ? r.rangeHigh - r.rangeLow : null),
  },
  ship: {
    label: "Forearm turn arc",
    unit: "°",
    value: (r) => (r.rangeHigh !== null && r.rangeLow !== null ? r.rangeHigh - r.rangeLow : null),
  },
  reach: {
    label: "Forearm lift span",
    unit: "×",
    value: (r) => (r.rangeHigh !== null && r.rangeLow !== null ? r.rangeHigh - r.rangeLow : null),
  },
};

/** Camera sessions only: demo controls never count as measured movement. */
export function romTrend(history: SessionRecord[], exercise: Exercise) {
  const points = history
    .filter((r) => r.exercise === exercise && r.mode === "camera")
    .map((r) => ({ at: new Date(r.at), value: ROM[exercise].value(r), cycles: r.cycles }))
    .filter((p): p is { at: Date; value: number; cycles: number } =>
      p.value !== null && Number.isFinite(p.value),
    )
    .sort((a, b) => a.at.getTime() - b.at.getTime());
  const first = points[0]?.value ?? null,
    latest = points[points.length - 1]?.value ?? null;
  return {
    points,
    first,
    latest,
    change: first !== null && latest !== null && points.length > 1 ? latest - first : null,
  };
}

/** Two weeks of clearly labelled example sessions for demonstrations. */
export function exampleHistory(plan: CarePlan, now = new Date()): SessionRecord[] {
  const records: SessionRecord[] = [];
  let id = now.getTime() - 20 * 86400000;
  const skip = new Set([3, 8]);
  const partial = new Set([5, 11]);
  for (let d = 13; d >= 1; d--) {
    if (skip.has(d)) continue;
    const date = addDays(now, -d);
    date.setHours(17, 10, 0, 0);
    const progress = (13 - d) / 12;
    plan.items.forEach((item, n) => {
      if (partial.has(d) && n === 1) return;
      const base =
        item.exercise === "wrist"
          ? { low: 2, high: 24 + progress * 16 }
          : item.exercise === "grip"
            ? { low: 1.15 - progress * 0.1, high: 1.7 + progress * 0.45 }
            : item.exercise === "elbow"
              ? { low: 112 - progress * 30, high: 158 }
              : { low: -14 - progress * 10, high: 13 + progress * 11 };
      const wobble = Math.sin(d * 1.7 + n) * (item.exercise === "grip" ? 0.04 : 2);
      records.push({
        id: id++,
        at: addDays(date, 0).toISOString(),
        exercise: item.exercise,
        mode: "camera",
        cycles: partial.has(d) && n === 0 ? Math.round(item.reps / 2) : item.reps,
        target: item.reps,
        seconds: 140 + Math.round(progress * 40) + n * 15,
        finished: true,
        rangeLow: +(base.low + (item.exercise === "wrist" ? 0 : wobble * 0.3)).toFixed(3),
        rangeHigh: +(base.high + wobble).toFixed(3),
        example: true,
      });
    });
  }
  return records;
}

export function toCsv(history: SessionRecord[]) {
  const rows = [
    ["date", "time", "game", "mode", "cycles", "target", "active_seconds", "range_low", "range_high", "example"],
    ...history.map((r) => {
      const d = new Date(r.at);
      return [
        dayKey(d),
        d.toTimeString().slice(0, 5),
        r.exercise,
        r.mode,
        r.cycles,
        r.target,
        r.seconds,
        r.rangeLow ?? "",
        r.rangeHigh ?? "",
        r.example ? "yes" : "",
      ];
    }),
  ];
  return rows.map((r) => r.join(",")).join("\n");
}

const PLAN_KEY = "luma-care-plan",
  HISTORY_KEY = "luma-history";
export function loadPlan(): CarePlan | null {
  try {
    const p = JSON.parse(localStorage.getItem(PLAN_KEY) ?? "null");
    return p && CARE_PLANS[p.id as PlanId] && Array.isArray(p.items) ? p : null;
  } catch {
    return null;
  }
}
export function savePlan(plan: CarePlan | null) {
  try {
    if (plan) localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
    else localStorage.removeItem(PLAN_KEY);
  } catch {
    /* Private browsing may disallow storage. */
  }
}
export function loadHistory(): SessionRecord[] {
  try {
    const h = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
    return Array.isArray(h) ? h : [];
  } catch {
    return [];
  }
}
export function saveHistory(history: SessionRecord[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-500)));
  } catch {
    /* Private browsing may disallow storage. */
  }
}
