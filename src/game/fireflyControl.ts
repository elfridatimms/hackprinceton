import { clamp, smooth } from "../movement/core";
/** A compact vertical lane. Screen travel is intentionally smaller than Dragon Flight. */
export const fireflyTravel = (observedSpan: number) =>
  clamp(Math.abs(observedSpan) * 1.6, 0.5, 1.6);
export const fireflyHeight = (position: number, travel = 1.6) =>
  1.4 + (clamp(position) - 0.5) * travel;
/** Small wobbles cannot move Luma; a reacquisition cannot teleport her. */
export function steadyFireflyPosition(
  previous: number,
  target: number,
  dt: number,
  valid = true,
) {
  if (
    !valid ||
    !Number.isFinite(target) ||
    Math.abs(target - previous) <= 0.035
  )
    return previous;
  const step = smooth(previous, clamp(target), dt, 0.23) - previous,
    limit = Math.min(dt, 0.06) * 0.38;
  return clamp(previous + clamp(step, -limit, limit));
}
export class FireflyTarget {
  target = 0;
  dwell = 0;
  reset() {
    this.target = 0;
    this.dwell = 0;
  }
  get position() {
    return this.target === 0 ? 0.1 : 0.9;
  }
  update(position: number, dt: number, active: boolean) {
    if (!active) {
      this.dwell = 0;
      return false;
    }
    if (Math.abs(position - this.position) > 0.08) {
      this.dwell = 0;
      return false;
    }
    this.dwell += Math.min(dt, 0.06);
    if (this.dwell < 0.35) return false;
    this.target = 1 - this.target;
    this.dwell = 0;
    return true;
  }
}
