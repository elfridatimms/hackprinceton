import { clamp, CycleCounter, type Arm, type TrackingFrame } from "./core";
import { FRAME_MAX_AGE_MS } from "./calibration";
import { movementValue, validMovementRange, type Exercise } from "./exercises";
export type MotionSample = { value: number; raw: number; at: number };
export type PersonalProfile = {
  exercise: Exercise;
  arm: Arm;
  lower: number;
  upper: number;
  signalTau: number;
  signalDeadband: number;
  smoothing: number;
  noiseRatio: number;
  samples: number;
  cycles: number;
  createdAt: number;
};
const percentile = (values: number[], q: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * q,
    lo = Math.floor(index),
    hi = Math.ceil(index);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (index - lo);
};
/** Personal input calibration only. MediaPipe model weights are unchanged. */
export function createPersonalProfile(
  exercise: Exercise,
  arm: Arm,
  range: { lower: number; upper: number },
  motion: MotionSample[],
  holds: number[][],
  cycles: number,
  now: number,
): PersonalProfile | null {
  if (!validMovementRange(exercise, range.lower, range.upper) || cycles < 2)
    return null;
  const samples = motion.filter(
    (s) =>
      Number.isFinite(s.value) &&
      Number.isFinite(s.raw) &&
      Number.isFinite(s.at),
  );
  if (samples.length < 15) return null;
  const min = Math.min(range.lower, range.upper),
    max = Math.max(range.lower, range.upper),
    span = max - min;
  const values = samples.map((s) => s.value);
  const lowValues = values.filter((v) => v <= min + span * 0.25),
    highValues = values.filter((v) => v >= max - span * 0.25);
  if (lowValues.length < 5 || highValues.length < 5) return null;
  // Balance the two endpoints so taking a long rest at one end cannot bias the fit.
  // Trim at most 8% at either comfortable endpoint; never ask for a larger movement.
  const learnedMin = clamp(percentile(lowValues, 0.5), min, min + span * 0.08);
  const learnedMax = clamp(percentile(highValues, 0.5), max - span * 0.08, max);
  let lower = exercise === "elbow" ? learnedMax : learnedMin,
    upper = exercise === "elbow" ? learnedMin : learnedMax;
  if (!validMovementRange(exercise, lower, upper)) {
    lower = range.lower;
    upper = range.upper;
  }
  const deviations = holds.flatMap((hold) => {
    const clean = hold.filter(Number.isFinite);
    if (clean.length < 5) return [];
    const median = percentile(clean, 0.5);
    return clean.map((v) => Math.abs(v - median));
  });
  if (deviations.length < 10) return null;
  const noise = percentile(deviations, 0.5) * 1.4826;
  const noiseRatio = clamp(noise / span, 0, 0.1);
  return {
    exercise,
    arm,
    lower,
    upper,
    signalTau: clamp(0.12 + noiseRatio * 2, 0.12, 0.3),
    signalDeadband: clamp(noise * 1.5, span * 0.002, span * 0.035),
    smoothing: clamp(0.14 + noiseRatio * 1.6, 0.14, 0.3),
    noiseRatio,
    samples: samples.length,
    cycles,
    createdAt: now,
  };
}
/** Counts only distinct current observations. Gaps and tracking loss break a pending cycle. */
export class PersonalMotionCapture {
  counter = new CycleCounter();
  samples: MotionSample[] = [];
  private lastAt: number | null = null;
  update(
    frame: TrackingFrame,
    exercise: Exercise,
    range: { lower: number; upper: number },
    now: number,
  ) {
    const value = movementValue(frame, exercise);
    const valid =
      frame.valid &&
      value !== null &&
      Number.isFinite(value) &&
      now >= frame.at &&
      now - frame.at <= FRAME_MAX_AGE_MS;
    if (!valid) {
      this.counter.invalidate();
      return false;
    }
    if (this.lastAt !== null && frame.at <= this.lastAt) return false;
    if (this.lastAt !== null && frame.at - this.lastAt > FRAME_MAX_AGE_MS)
      this.counter.invalidate();
    this.lastAt = frame.at;
    const raw = frame.rawValue ?? value;
    this.samples.push({ value, raw, at: frame.at });
    if (this.samples.length > 1800) this.samples.shift();
    const position = clamp((value - range.lower) / (range.upper - range.lower));
    return this.counter.update(position, frame.at, true);
  }
}
