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
export type Settings = {
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
  id: number;
  cycles: number;
  seconds: number;
  fireflies: number;
  mode: Mode;
  trace: { t: number; v: number }[];
  finished: boolean;
  target: number;
};
export const defaultSettings: Settings = {
  arm: "right",
  lower: 150,
  upper: 65,
  target: 8,
  speed: 1,
  smoothing: 0.22,
  muted: true,
  reducedMotion: false,
  saveSummaries: false,
};
export function loadSettings(): Settings {
  try {
    return {
      ...defaultSettings,
      reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
      ...JSON.parse(localStorage.getItem("luma-settings") ?? "{}"),
    };
  } catch {
    return defaultSettings;
  }
}
export type WorldState = {
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
    active = useRef(0),
    collected = useRef(0),
    lastTrace = useRef(0),
    keys = useRef({ up: false, down: false });
  const current = useRef({ phase, mode, settings, frame, trackingOn });
  current.current = { phase, mode, settings, frame, trackingOn };
  world.current.phase = phase;
  world.current.reduced = settings.reducedMotion;
  world.current.speed = settings.speed;
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
    lastTrace.current = 0;
    control.current = 0.5;
    world.current.position = 0.5;
    world.current.progress = 0;
    world.current.celebrating = false;
    world.current.collectAt = -100;
    world.current.fireflies = 0;
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
    const result: Summary = {
      id: Date.now(),
      cycles: counter.current.count,
      seconds: Math.floor(active.current),
      fireflies: collected.current,
      mode: c.mode,
      trace: [...trace.current],
      finished,
      target: c.settings.target,
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
    setFireflies(collected.current);
    audio.chime(collected.current);
  }, []);
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).matches("input,select,textarea")) return;
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        keys.current[e.key === "ArrowUp" ? "up" : "down"] = true;
      }
      if (e.key === "Escape" && current.current.phase === "playing")
        transition("paused");
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") keys.current.up = false;
      if (e.key === "ArrowDown") keys.current.down = false;
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
        valid = c.trackingOn && c.frame.valid && now - c.frame.at < 300;
        const g = gate.current.update(valid, now);
        valid = g.canCount;
        waitingNow = g.waiting || !valid;
        if (valid && c.frame.angle !== null)
          control.current = normalizeAngle(
            c.frame.angle,
            c.settings.lower,
            c.settings.upper,
          );
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
        world.current.position = smooth(
          old,
          control.current,
          dt,
          c.settings.smoothing,
        );
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
          if (counter.current.update(world.current.position, now, true)) {
            setCycles(counter.current.count);
            if (counter.current.count >= c.settings.target) {
              world.current.progress = 1;
              finish(true);
            }
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
