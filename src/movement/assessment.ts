import { clamp } from "./core";
/** Task progress within a personally calibrated range, not a clinical quality score. */
export function assessMovement(
  position: number | null,
  target: "low" | "high",
) {
  if (position === null || !Number.isFinite(position))
    return {
      state: "waiting" as const,
      progress: 0,
      message: "Bring your hand into view.",
    };
  const p = clamp(position),
    progress = target === "high" ? p : 1 - p;
  const reached = target === "high" ? p >= 0.82 : p <= 0.18;
  return {
    state: reached ? ("holding" as const) : ("moving" as const),
    progress,
    message: reached
      ? "That’s it. Hold gently."
      : target === "high"
        ? "A little more, if it feels comfy."
        : "Come softly back.",
  };
}
