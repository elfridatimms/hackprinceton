export type AngleSample = { angle: number; at: number };
export const FRAME_MAX_AGE_MS = 450;
export const CALIBRATION_WINDOW_MS = 1600;
export const CALIBRATION_HOLD_MS = 650;
export const AUTO_SPOT_HOLD_MS = 1800;
export const AUTO_SPOT_WINDOW_MS = 2400;
export const AUTO_SPOT_PREPARE_MS = 1200;
/** A time window, not a camera frame-rate requirement. Missing frames are never invented. */
export function calibrationEstimate(
  samples: AngleSample[],
  now: number,
  options: {
    min: number;
    max: number;
    spread: number;
    precision: number;
    holdMs?: number;
    windowMs?: number;
  } = { min: 0, max: 180, spread: 6, precision: 10 },
) {
  const recent = samples
    .filter(
      (s) =>
        Number.isFinite(s.angle) &&
        s.angle >= options.min &&
        s.angle <= options.max &&
        now >= s.at &&
        now - s.at <= (options.windowMs ?? CALIBRATION_WINDOW_MS),
    )
    .sort((a, b) => a.at - b.at);
  const distinct = recent.filter((s, i) => !i || s.at !== recent[i - 1].at);
  if (distinct.length < 5 || now - distinct.at(-1)!.at > FRAME_MAX_AGE_MS)
    return { angle: null, progress: 0 };
  let start = 0;
  for (let i = 1; i < distinct.length; i++)
    if (distinct[i].at - distinct[i - 1].at > FRAME_MAX_AGE_MS) start = i;
  const continuous = distinct.slice(start);
  if (continuous.length < 5) return { angle: null, progress: 0 };
  const sorted = continuous.map((s) => s.angle).sort((a, b) => a - b);
  const spread =
    sorted[Math.floor(sorted.length * 0.9)] -
    sorted[Math.floor(sorted.length * 0.1)];
  if (spread > options.spread) return { angle: null, progress: 0 };
  const elapsed = continuous.at(-1)!.at - continuous[0].at;
  const progress = Math.min(
    1,
    elapsed / (options.holdMs ?? CALIBRATION_HOLD_MS),
  );
  return {
    angle:
      progress === 1
        ? Math.round(
            sorted[Math.floor(sorted.length / 2)] * options.precision,
          ) / options.precision
        : null,
    progress,
  };
}
/** Flexion always raises Luma, even when endpoints were captured in reverse order. */
export function calibratedRange(first: number, second: number) {
  const lower = Math.max(first, second),
    upper = Math.min(first, second);
  return Number.isFinite(lower) &&
    Number.isFinite(upper) &&
    lower <= 180 &&
    upper >= 10 &&
    lower - upper >= 5
    ? { lower, upper }
    : null;
}
