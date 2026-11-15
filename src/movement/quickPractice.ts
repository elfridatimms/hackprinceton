import { clamp, type Arm, type TrackingFrame } from "./core";
import { FRAME_MAX_AGE_MS } from "./calibration";
import {
  movementLimits,
  movementRange,
  movementValue,
  type Exercise,
} from "./exercises";
import {
  createPersonalProfile,
  PersonalMotionCapture,
  type MotionSample,
} from "./personalization";
/** Learns the range during one ordinary practice movement. There is no endpoint-saving step. */
export class QuickPracticeCapture {
  samples: MotionSample[] = [];
  range: { lower: number; upper: number } | null = null;
  motion = new PersonalMotionCapture();
  private lastAt: number | null = null;
  constructor(readonly exercise: Exercise) {}
  invalidate() {
    this.motion.counter.invalidate();
    this.samples = [];
  }
  update(frame: TrackingFrame, now: number) {
    const value = movementValue(frame, this.exercise),
      limits = movementLimits[this.exercise];
    if (
      !frame.valid ||
      value === null ||
      !Number.isFinite(value) ||
      value < limits.min ||
      value > limits.max ||
      now < frame.at ||
      now - frame.at > FRAME_MAX_AGE_MS
    ) {
      this.invalidate();
      return;
    }
    if (this.lastAt !== null && frame.at <= this.lastAt) return;
    if (this.lastAt !== null && frame.at - this.lastAt > FRAME_MAX_AGE_MS)
      this.invalidate();
    this.lastAt = frame.at;
    this.samples.push({ value, raw: frame.rawValue ?? value, at: frame.at });
    if (this.samples.length > 1800) this.samples.shift();
    if (this.samples.length < 20) return;
    const values = this.samples.map((s) => s.value).sort((a, b) => a - b),
      low = values[4],
      high = values[values.length - 5];
    const range = movementRange(this.exercise, low, high);
    if (!range) return;
    const band = Math.min(limits.spread, (high - low) * 0.15);
    const lowSamples = this.samples.filter(
        (s) => Math.abs(s.value - low) <= band,
      ),
      highSamples = this.samples.filter(
        (s) => Math.abs(s.value - high) <= band,
      );
    const supported = (group: MotionSample[]) =>
      group.length >= 5 && group.at(-1)!.at - group[0].at >= 220;
    if (!supported(lowSamples) || !supported(highSamples)) return;
    this.range = range;
    this.motion = new PersonalMotionCapture();
    // Replay only the real, timestamped observations already seen during this attempt.
    for (const sample of this.samples) {
      const f: TrackingFrame = {
        valid: true,
        angle: this.exercise === "elbow" ? sample.value : null,
        openness: this.exercise === "grip" ? sample.value : null,
        height: this.exercise === "reach" ? sample.value : null,
        tilt: this.exercise === "wrist" ? sample.value : null,
        steering: this.exercise === "ship" ? sample.value : null,
        rawValue: sample.raw,
        at: sample.at,
        points: [],
        message: "",
      };
      this.motion.update(f, this.exercise, range, sample.at);
    }
  }
  position(frame: TrackingFrame, now: number) {
    const v = movementValue(frame, this.exercise);
    return this.range &&
      frame.valid &&
      v !== null &&
      now >= frame.at &&
      now - frame.at <= FRAME_MAX_AGE_MS
      ? clamp((v - this.range.lower) / (this.range.upper - this.range.lower))
      : null;
  }
  profile(arm: Arm, now: number) {
    if (!this.range || this.motion.counter.count < 1) return null;
    const min = Math.min(this.range.lower, this.range.upper),
      max = Math.max(this.range.lower, this.range.upper),
      band = (max - min) * 0.2;
    const holds = [
      this.motion.samples
        .filter((s) => Math.abs(s.value - min) <= band)
        .map((s) => s.raw),
      this.motion.samples
        .filter((s) => Math.abs(s.value - max) <= band)
        .map((s) => s.raw),
    ];
    return createPersonalProfile(
      this.exercise,
      arm,
      this.range,
      this.motion.samples,
      holds,
      this.motion.counter.count,
      now,
      1,
    );
  }
}
