import { steadyFireflyPosition, fireflyTravel } from "./fireflyControl";
import type { PersonalProfile } from "../movement/personalization";
import {
  movementValue,
  normalizeReach,
  type Exercise,
} from "../movement/exercises";
import { FRAME_MAX_AGE_MS } from "../movement/calibration";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  clamp,
  CycleCounter,
  normalizeAngle,
  smooth,
  TrackingGate,
  type TrackingFrame,
} from "../movement/core";
import { canTransition } from "./stateMachine";
import { audio } from "../audio/sound";
export type Phase =
  | "welcome"
  | "setup"
  | "calibration"
  | "practice"
  | "playing"
  | "paused"
  | "completed";
export type Mode = "demo" | "camera";
/** Fraction trimmed from each end of the grip range so smaller hand movements count. */
export const GRIP_INSET = 0.12;
/** Game characters ignore input changes smaller than this (residual tracking wobble). */
export const GAME_DEADBAND = 0.012;
export type Settings = {
  exercise: Exercise;
  personalization: PersonalProfile | null;
  gripLower: number;
  gripUpper: number;
  tiltLower: number;
  tiltUpper: number;
  shipLower: number;
  shipUpper: number;
  reachLower: number;
  reachUpper: number;
  arm: "left" | "right";
  lower: number;
  upper: number;
  target: number;
  speed: number;
  smoothing: number;
  muted: boolean;
  reducedMotion: boolean;
  saveSummaries: boolean;
};
export type Summary = {
  exercise?: Exercise;
  id: number;
  cycles: number;
  seconds: number;
  fireflies: number;
  mode: Mode;
  trace: { t: number; v: number }[];
  finished: boolean;
  target: number;
  /** Robust low/high (5th/95th percentile) of the camera-measured movement, in
   * the exercise's own units (degrees, or hand-opening ratio). Camera only. */
  rangeLow?: number | null;
  rangeHigh?: number | null;
};
/** 5th and 95th percentile; isolated spikes cannot define the range. */
export function robustRange(values: number[]) {
  if (values.length < 10) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
  return { low: at(0.05), high: at(0.95) };
}
export const defaultSettings: Settings = {
  exercise: "grip",
  personalization: null,
  gripLower: 1.1,
  gripUpper: 2.2,
  tiltLower: 0,
  tiltUpper: 40,
  shipLower: -25,
  shipUpper: 25,
  reachLower: -0.5,
  reachUpper: 0.5,
  arm: "right",
  lower: 150,
  upper: 65,
  target: 8,
  speed: 1,
  smoothing: 0.12,
  muted: true,
  reducedMotion: false,
  saveSummaries: false,
};
export function loadSettings(): Settings {
  try {
    const stored = JSON.parse(localStorage.getItem("luma-settings") ?? "{}");
    return {
      ...defaultSettings,
      reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
      ...stored,
      ...(stored.inputVersion >= 2
        ? {}
        : {
            reachLower: 0.2,
            reachUpper: 0.8,
            tiltLower: 0,
            tiltUpper: 40,
            shipLower: -25,
            shipUpper: 25,
            smoothing: 0.12,
          }),
      ...(stored.inputVersion >= 3
        ? {}
        : { reachLower: -0.5, reachUpper: 0.5 }),
      // Butterfly now measures bend away from a straight hand (0–90°).
      ...(stored.inputVersion >= 4 ? {} : { tiltLower: 0, tiltUpper: 40 }),
      personalization: null,
      // Firefly Trail was retired; old saved choices open Sleepy Flowers.
      ...(stored.exercise === "reach" ? { exercise: "grip" as const } : {}),
    };
  } catch {
    return defaultSettings;
  }
}
export type WorldState = {
  bumpAt?: number;
  /** Next target in normalized input units, set by the active game. */
  goal?: number | null;
  /** Hold-at-target progress 0..1 for the active target. */
  dwell?: number;
  /** Completed movement cycles, for in-world rewards. */
  cycles?: number;
  /** Flowers sown and grown in Sleepy Flowers. */
  planted?: number;
  /** Consecutive collections without an obstacle touch. */
  streak?: number;
  reachTravel?: number;
  exercise?: Exercise;
  celebrating: boolean;
  position: number;
  velocity: number;
  progress: number;
  phase: Phase;
  waiting: boolean;
  fireflies: number;
  collectAt: number;
  reduced: boolean;
  speed: number;
};
export function useSession(
  settings: Settings,
  frame: TrackingFrame,
  trackingOn: boolean,
) {
  const [phase, setPhase] = useState<Phase>("welcome"),
    [mode, setMode] = useState<Mode>("demo");
  const [cycles, setCycles] = useState(0),
    [seconds, setSeconds] = useState(0),
    [fireflies, setFireflies] = useState(0),
    [position, setPosition] = useState(0.5),
    [waiting, setWaiting] = useState(false),
    [summary, setSummary] = useState<Summary | null>(null);
  const world = useRef<WorldState>({
    celebrating: false,
    position: 0.5,
    velocity: 0,
    progress: 0,
    phase: "welcome",
    waiting: false,
    fireflies: 0,
    collectAt: -100,
    reduced: false,
    speed: 1,
  });
  const control = useRef(0.5),
    counter = useRef(new CycleCounter()),
    gate = useRef(new TrackingGate()),
    trace = useRef<Summary["trace"]>([]),
    measured = useRef<number[]>([]),
    lastMeasured = useRef(0),
    active = useRef(0),
    collected = useRef(0),
    lastTrace = useRef(0),
    keys = useRef({ up: false, down: false });
  const current = useRef({ phase, mode, settings, frame, trackingOn });
  current.current = { phase, mode, settings, frame, trackingOn };
  world.current.phase = phase;
  world.current.reduced = settings.reducedMotion;
  world.current.speed = settings.speed;
  world.current.exercise = settings.exercise;
  world.current.reachTravel = fireflyTravel(
    settings.reachUpper - settings.reachLower,
  );
  const pausedFrom = useRef<"practice" | "playing">("playing");
  const transition = useCallback((next: Phase) => {
    if (!canTransition(current.current.phase, next)) return;
    if (
      next === "paused" &&
      (current.current.phase === "practice" ||
        current.current.phase === "playing")
    )
      pausedFrom.current = current.current.phase;
    counter.current.invalidate();
    gate.current.reset();
    current.current.phase = next;
    world.current.phase = next;
    setPhase(next);
  }, []);
  const resume = useCallback(() => {
    transition(pausedFrom.current);
  }, [transition]);
  const reset = useCallback((next: Phase = "practice") => {
    counter.current.reset();
    gate.current.reset();
    active.current = 0;
    collected.current = 0;
    trace.current = [];
    measured.current = [];
    lastMeasured.current = 0;
    lastTrace.current = 0;
    control.current = 0.5;
    world.current.position = 0.5;
    world.current.progress = 0;
    world.current.celebrating = false;
    world.current.collectAt = -100;
    world.current.bumpAt = -100;
    world.current.fireflies = 0;
    world.current.goal = null;
    world.current.dwell = 0;
    world.current.cycles = 0;
    world.current.streak = 0;
    setCycles(0);
    setSeconds(0);
    setFireflies(0);
    setSummary(null);
    setWaiting(false);
    current.current.phase = next;
    world.current.phase = next;
    setPhase(next);
  }, []);
  const finish = useCallback((finished = true) => {
    const c = current.current;
    const range = c.mode === "camera" ? robustRange(measured.current) : null;
    const result: Summary = {
      id: Date.now(),
      cycles: counter.current.count,
      seconds: Math.floor(active.current),
      fireflies: collected.current,
      mode: c.mode,
      trace: [...trace.current],
      finished,
      target: c.settings.target,
      exercise: c.settings.exercise,
      rangeLow: range ? +range.low.toFixed(3) : null,
      rangeHigh: range ? +range.high.toFixed(3) : null,
    };
    setSummary(result);
    current.current.phase = "completed";
    world.current.phase = "completed";
    world.current.celebrating = finished;
    setPhase("completed");
    if (finished) audio.finish();
    if (c.settings.saveSummaries) {
      try {
        const old = JSON.parse(localStorage.getItem("luma-sessions") ?? "[]");
        localStorage.setItem(
          "luma-sessions",
          JSON.stringify([result, ...old].slice(0, 10)),
        );
      } catch {
        /* Private browsing may disallow storage. */
      }
    }
  }, []);
  const collect = useCallback(() => {
    if (current.current.phase !== "playing" || world.current.waiting) return;
    collected.current++;
    world.current.collectAt = performance.now() / 1000;
    world.current.fireflies = collected.current;
    world.current.streak = (world.current.streak ?? 0) + 1;
    setFireflies(collected.current);
    audio.chime(collected.current);
  }, []);
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).matches("input,select,textarea")) return;
      const ship = current.current.settings.exercise === "ship";
      if ((e.target as HTMLElement).closest('[role="tablist"]')) return;
      if (
        e.key === "ArrowUp" ||
        e.key === "ArrowDown" ||
        (ship && (e.key === "ArrowLeft" || e.key === "ArrowRight"))
      ) {
        e.preventDefault();
        keys.current[
          e.key === "ArrowUp" || e.key === "ArrowRight" ? "up" : "down"
        ] = true;
      }
      if (e.key === "Escape" && current.current.phase === "playing")
        transition("paused");
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "ArrowRight")
        keys.current.up = false;
      if (e.key === "ArrowDown" || e.key === "ArrowLeft")
        keys.current.down = false;
    };
    const blur = () => {
      keys.current = { up: false, down: false };
      counter.current.invalidate();
      gate.current.reset();
      if (
        current.current.phase === "playing" ||
        current.current.phase === "practice"
      )
        transition("paused");
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    const visibility = () => {
      if (document.hidden) blur();
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [transition]);
  useEffect(() => {
    let raf = 0,
      last = performance.now(),
      lastUI = 0;
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.06);
      last = now;
      const c = current.current;
      const live = c.phase === "playing" || c.phase === "practice";
      let valid = c.mode === "demo";
      let waitingNow = false;
      if (c.mode === "camera") {
        valid =
          c.trackingOn && c.frame.valid && now - c.frame.at < FRAME_MAX_AGE_MS;
        const g = gate.current.update(valid, now);
        valid = g.canCount;
        waitingNow = g.waiting || !valid;
        if (valid) {
          if (c.settings.exercise === "ship" && c.frame.steering != null)
            control.current = normalizeReach(
              c.frame.steering,
              c.settings.shipLower,
              c.settings.shipUpper,
            );
          else if (
            c.settings.exercise === "wrist" &&
            c.frame.tilt !== null &&
            c.frame.tilt !== undefined
          )
            control.current = normalizeReach(
              c.frame.tilt,
              c.settings.tiltLower,
              c.settings.tiltUpper,
            );
          else if (
            c.settings.exercise === "grip" &&
            c.frame.openness !== null &&
            c.frame.openness !== undefined
          ) {
            // A little more sensitive: a slightly smaller open/close reaches the ends.
            const inset = (c.settings.gripUpper - c.settings.gripLower) * GRIP_INSET;
            control.current = normalizeReach(
              c.frame.openness,
              c.settings.gripLower + inset,
              c.settings.gripUpper - inset,
            );
          }
          else if (
            c.settings.exercise === "reach" &&
            c.frame.height !== null &&
            c.frame.height !== undefined
          )
            control.current = normalizeReach(
              c.frame.height,
              c.settings.reachLower,
              c.settings.reachUpper,
            );
          else if (c.settings.exercise === "elbow" && c.frame.angle !== null)
            control.current = normalizeAngle(
              c.frame.angle,
              c.settings.lower,
              c.settings.upper,
            );
          else valid = false;
        }
      }
      if (live && c.mode === "demo") {
        control.current = clamp(
          control.current +
            ((keys.current.up ? 1 : 0) - (keys.current.down ? 1 : 0)) *
              dt *
              0.65,
        );
      }
      const old = world.current.position;
      if (live && valid)
        world.current.position =
          c.settings.exercise === "reach"
            ? steadyFireflyPosition(old, control.current, dt)
            : c.mode === "camera" &&
                Math.abs(control.current - old) < GAME_DEADBAND
              ? old
              : smooth(old, control.current, dt, c.settings.smoothing);
      world.current.velocity = smooth(
        world.current.velocity,
        (world.current.position - old) / Math.max(dt, 0.001),
        dt,
        0.18,
      );
      world.current.waiting = live && waitingNow;
      if (live) {
        setWaiting(waitingNow);
        if (c.phase === "playing" && valid) {
          active.current += dt;
          // Real movement range in the exercise's units, sampled at 10 Hz.
          if (c.mode === "camera" && now - lastMeasured.current > 100) {
            const raw = movementValue(c.frame, c.settings.exercise);
            if (raw !== null && Number.isFinite(raw)) {
              measured.current.push(raw);
              lastMeasured.current = now;
              if (measured.current.length > 6000)
                measured.current = measured.current.filter((_, i) => i % 2 === 0);
            }
          }
          if (counter.current.update(world.current.position, now, true)) {
            setCycles(counter.current.count);
            world.current.cycles = counter.current.count;
            if (c.settings.exercise === "grip") audio.chime(counter.current.count);
            if (counter.current.count >= c.settings.target) {
              world.current.progress = 1;
              finish(true);
            }
          }
          if (c.settings.exercise === "grip") {
            world.current.goal =
              counter.current.phase === "seek-high" ? 0.9 : 0.1;
            world.current.dwell =
              counter.current.dwellAt === null
                ? 0
                : Math.min(1, (now - counter.current.dwellAt) / 220);
          }
          const sub =
            counter.current.phase === "return-low"
              ? 0.5 + (1 - world.current.position) * 0.5
              : counter.current.phase === "seek-high"
                ? world.current.position * 0.5
                : 0;
          world.current.progress = smooth(
            world.current.progress,
            clamp((counter.current.count + sub) / c.settings.target),
            dt,
            0.6,
          );
          if (active.current - lastTrace.current > 0.2) {
            trace.current.push({
              t: +active.current.toFixed(2),
              v: +world.current.position.toFixed(3),
            });
            if (trace.current.length > 3000)
              trace.current = trace.current.filter((_, i) => i % 2 === 0);
            lastTrace.current = active.current;
          }
        } else if (!valid) counter.current.invalidate();
      }
      if (now - lastUI > 100) {
        setPosition(world.current.position);
        setSeconds(Math.floor(active.current));
        lastUI = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [finish]);
  return {
    phase,
    mode,
    setMode,
    transition,
    resume,
    reset,
    finish,
    cycles,
    seconds,
    fireflies,
    position,
    waiting,
    summary,
    world,
    control,
    collect,
  };
}
export type Session = ReturnType<typeof useSession>;
