import { calibrationEstimate } from "./calibration";
export type Landmark = {
  x: number;
  y: number;
  visibility?: number;
  presence?: number;
};
export type Arm = "left" | "right";
export type TrackingFrame = {
  valid: boolean;
  angle: number | null;
  height?: number | null;
  openness?: number | null;
  at: number;
  points: Landmark[];
  message: string;
};
export const ARM_VISIBILITY_THRESHOLD = 0.35;
export const clamp = (n: number, min = 0, max = 1) =>
  Math.max(min, Math.min(max, n));
export function usableLandmark(p: Landmark | undefined): p is Landmark {
  return (
    !!p &&
    Number.isFinite(p.x) &&
    Number.isFinite(p.y) &&
    p.x >= 0 &&
    p.x <= 1 &&
    p.y >= 0 &&
    p.y <= 1 &&
    (p.visibility ?? 0) >= ARM_VISIBILITY_THRESHOLD &&
    (p.presence ?? 1) >= ARM_VISIBILITY_THRESHOLD
  );
}
/** Interior elbow angle: 180° is extended, smaller angles are more flexed. */
export function elbowAngle(
  points: Landmark[],
  arm: Arm,
  aspect: number,
): number | null {
  const ids = arm === "left" ? [11, 13, 15] : [12, 14, 16];
  const [s, e, w] = ids.map((i) => points[i]);
  if (
    !Number.isFinite(aspect) ||
    aspect <= 0 ||
    ![s, e, w].every(usableLandmark)
  )
    return null;
  const a = { x: (s.x - e.x) * aspect, y: s.y - e.y },
    b = { x: (w.x - e.x) * aspect, y: w.y - e.y };
  const lengths = Math.hypot(a.x, a.y) * Math.hypot(b.x, b.y);
  if (lengths < 0.001) return null;
  return (
    (Math.acos(clamp((a.x * b.x + a.y * b.y) / lengths, -1, 1)) * 180) / Math.PI
  );
}
export function normalizeAngle(angle: number, lower: number, upper: number) {
  return clamp((lower - angle) / (lower - upper));
}
export function smooth(
  previous: number,
  next: number,
  dt: number,
  tau: number,
) {
  return (
    previous +
    (next - previous) *
      (1 - Math.exp(-Math.min(dt, 0.15) / Math.max(0.01, tau)))
  );
}
export function validRange(lower: number, upper: number) {
  return (
    Number.isFinite(lower) &&
    Number.isFinite(upper) &&
    lower <= 180 &&
    upper >= 10 &&
    lower - upper >= 5
  );
}
export function estimateEndpoint(
  samples: { angle: number; at: number }[],
  now: number,
) {
  return calibrationEstimate(samples, now).angle;
}

export class CycleCounter {
  phase: "seek-low" | "seek-high" | "return-low" = "seek-low";
  dwellAt: number | null = null;
  count = 0;
  reset() {
    this.phase = "seek-low";
    this.dwellAt = null;
    this.count = 0;
  }
  invalidate() {
    this.phase = "seek-low";
    this.dwellAt = null;
  }
  update(value: number, at: number, valid: boolean) {
    if (!valid) {
      this.invalidate();
      return false;
    }
    const high = this.phase === "seek-high";
    const reached = high ? value >= 0.82 : value <= 0.18;
    const released = high ? value < 0.72 : value > 0.28;
    if (released) this.dwellAt = null;
    if (!reached) return false;
    if (this.dwellAt === null) {
      this.dwellAt = at;
      return false;
    }
    if (at - this.dwellAt < 220) return false;
    this.dwellAt = null;
    if (this.phase === "seek-low") this.phase = "seek-high";
    else if (this.phase === "seek-high") this.phase = "return-low";
    else {
      this.count++;
      this.phase = "seek-high";
      return true;
    }
    return false;
  }
}
export class TrackingGate {
  validSince: number | null = null;
  lastValid: number | null = null;
  ready = false;
  update(valid: boolean, at: number) {
    if (valid) {
      this.lastValid = at;
      if (this.validSince === null) this.validSince = at;
      this.ready = at - this.validSince >= 650;
    } else {
      this.validSince = null;
      this.ready = false;
    }
    return {
      canCount: valid && this.ready,
      canProgress: valid && this.ready,
      waiting: this.lastValid === null || at - this.lastValid > 550,
    };
  }
  reset() {
    this.validSince = null;
    this.lastValid = null;
    this.ready = false;
  }
}

export function armTrackingMessage(points: Landmark[], arm: Arm) {
  const label = arm === "left" ? "left" : "right";
  const ids = arm === "left" ? [11, 13, 15] : [12, 14, 16];
  const names = ["shoulder", "elbow", "wrist"];
  const missing = ids.flatMap((id, i) =>
    usableLandmark(points[id]) ? [] : [names[i]],
  );
  if (!points.length)
    return "Move back a little so your upper body is in view.";
  return missing.length
    ? `Bring your ${label} ${missing.join(" and ")} into view.`
    : `Keep your ${label} arm a little farther from the camera.`;
}
