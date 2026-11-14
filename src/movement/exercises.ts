import {
  clamp,
  usableLandmark,
  type Arm,
  type Landmark,
  type TrackingFrame,
} from "./core";
export type Exercise = "grip" | "reach" | "elbow" | "wrist";
export const exercises = {
  grip: {
    tab: "Sleepy Flowers",
    hero: ["Little hands.", "Big magic."],
    intro: "Sleepy flowers need a little magic.",
    promise: "Open your hand. Make the forest bloom.",
    title: "Wake a sleepy flower",
    short: "Open. Close. Bloom!",
    description: "Little hands. Lovely blossoms.",
    up: "Open your hand to wake the flower.",
    down: "Close it softly. No squeezing.",
    camera:
      "Show one hand to the camera, palm facing forward. Keep your wrist and fingertips in the picture.",
  },
  reach: {
    tab: "Firefly Trail",
    hero: ["Little reaches.", "Firefly wishes."],
    intro: "The little lights are ready to play.",
    promise: "Lift your hand. Help them find their way.",
    title: "Catch a firefly",
    short: "Reach & return",
    description: "A little lift. A little light.",
    up: "Reach up to the little light.",
    down: "Bring your hand softly back.",
    camera: "Face the camera. Keep both shoulders and your hand in view.",
  },
  elbow: {
    tab: "Dragon Flight",
    hero: ["Little bends.", "Dragon wings."],
    intro: "Luma is learning a lovely new loop.",
    promise: "Bend and return. Give a little dragon a lift.",
    title: "Give Luma a lift",
    short: "Bend & return",
    description: "Little bends. Lovely wingbeats.",
    up: "Bend your arm to lift Luma.",
    down: "Let your hand come softly down.",
    camera:
      "Turn a little to the side. Keep your shoulder, elbow and hand in view.",
  },
  wrist: {
    tab: "Butterfly Breeze",
    hero: ["Little tilts.", "Butterfly wings."],
    intro: "A little butterfly is waiting for a breeze.",
    promise: "Gently tilt your hand. Help its wings flutter.",
    title: "Give a butterfly a breeze",
    short: "Tilt. Flutter. Return.",
    description: "A little tilt. A lovely flutter.",
    up: "Gently tilt your hand up.",
    down: "Bring your hand softly back.",
    camera:
      "Show one hand from a slight side view, with your fingers pointing across the picture. Keep your wrist and knuckles visible.",
  },
} as const;
/** Wrist height relative to the selected shoulder, in shoulder-width units. This is a 2D game input, not a clinical measure. */
export function handHeight(
  points: Landmark[],
  arm: Arm,
  aspect: number,
): number | null {
  const left = points[11],
    right = points[12],
    wrist = points[arm === "left" ? 15 : 16];
  if (
    ![left, right, wrist].every(usableLandmark) ||
    !Number.isFinite(aspect) ||
    aspect <= 0
  )
    return null;
  const width = Math.hypot((left.x - right.x) * aspect, left.y - right.y);
  if (width < 0.075) return null;
  const shoulder = arm === "left" ? left : right;
  const value = (shoulder.y - wrist.y) / width;
  return Number.isFinite(value) && value >= -4 && value <= 4 ? value : null;
}
export function validReachRange(lower: number, upper: number) {
  return (
    Number.isFinite(lower) &&
    Number.isFinite(upper) &&
    lower >= -4 &&
    upper <= 4 &&
    upper - lower >= 0.12 - 1e-9
  );
}
export function reachRange(first: number, second: number) {
  const lower = Math.min(first, second),
    upper = Math.max(first, second);
  return validReachRange(lower, upper) ? { lower, upper } : null;
}
export function normalizeReach(value: number, lower: number, upper: number) {
  return clamp((value - lower) / (upper - lower));
}
export function movementValue(frame: TrackingFrame, exercise: Exercise) {
  return exercise === "wrist"
    ? (frame.tilt ?? null)
    : exercise === "grip"
      ? (frame.openness ?? null)
      : exercise === "reach"
        ? (frame.height ?? null)
        : frame.angle;
}
export function reachTrackingMessage(points: Landmark[], arm: Arm) {
  if (!points.length) return "Let’s see your shoulders and your waving hand.";
  if (!usableLandmark(points[11]) || !usableLandmark(points[12]))
    return "Face the camera so both shoulders can say hello.";
  if (!usableLandmark(points[arm === "left" ? 15 : 16]))
    return `Bring your ${arm} hand into the picture.`;
  return "Face the camera and give yourself a little more room.";
}

/** Four fingertip distances / wrist-to-middle-knuckle distance. The thumb is not required to open fully. */
export function handOpenness(
  points: Landmark[],
  aspect: number,
): number | null {
  const ids = [0, 9, 8, 12, 16, 20];
  const valid = ids.every((id) => {
    const p = points[id];
    return (
      !!p &&
      Number.isFinite(p.x) &&
      Number.isFinite(p.y) &&
      p.x >= 0 &&
      p.x <= 1 &&
      p.y >= 0 &&
      p.y <= 1
    );
  });
  if (!valid || !Number.isFinite(aspect) || aspect <= 0) return null;
  const distance = (a: Landmark, b: Landmark) =>
    Math.hypot((a.x - b.x) * aspect, a.y - b.y);
  const palm = distance(points[0], points[9]);
  if (palm < 0.025) return null;
  const ratio =
    [8, 12, 16, 20].reduce(
      (sum, id) => sum + distance(points[0], points[id]),
      0,
    ) /
    (4 * palm);
  return Number.isFinite(ratio) && ratio >= 0 && ratio <= 5 ? ratio : null;
}
export function validGripRange(lower: number, upper: number) {
  return (
    Number.isFinite(lower) &&
    Number.isFinite(upper) &&
    lower >= 0 &&
    upper <= 5 &&
    upper - lower >= 0.2 - 1e-9
  );
}
export function gripRange(first: number, second: number) {
  const lower = Math.min(first, second),
    upper = Math.max(first, second);
  return validGripRange(lower, upper) ? { lower, upper } : null;
}

export function handTilt(points: Landmark[], aspect: number): number | null {
  const wrist = points[0],
    knuckle = points[9];
  if (
    !wrist ||
    !knuckle ||
    !Number.isFinite(aspect) ||
    aspect <= 0 ||
    ![wrist, knuckle].every(
      (p) =>
        Number.isFinite(p.x) &&
        Number.isFinite(p.y) &&
        p.x >= 0 &&
        p.x <= 1 &&
        p.y >= 0 &&
        p.y <= 1,
    )
  )
    return null;
  const dx = (knuckle.x - wrist.x) * aspect,
    dy = wrist.y - knuckle.y;
  if (Math.hypot(dx, dy) < 0.025) return null;
  return (Math.atan2(dy, Math.abs(dx)) * 180) / Math.PI;
}
export const exerciseOrder: Exercise[] = ["grip", "reach", "elbow", "wrist"];
export const movementLimits = {
  grip: { min: 0, max: 5, delta: 0.2, spread: 0.16, precision: 1000 },
  reach: { min: -4, max: 4, delta: 0.12, spread: 0.1, precision: 1000 },
  elbow: { min: 10, max: 180, delta: 5, spread: 6, precision: 10 },
  wrist: { min: -90, max: 90, delta: 5, spread: 6, precision: 10 },
};
export function validMovementRange(
  exercise: Exercise,
  lower: number,
  upper: number,
) {
  const limits = movementLimits[exercise];
  return (
    Number.isFinite(lower) &&
    Number.isFinite(upper) &&
    Math.min(lower, upper) >= limits.min &&
    Math.max(lower, upper) <= limits.max &&
    (exercise === "elbow" ? lower - upper : upper - lower) >=
      limits.delta - 1e-9
  );
}
export function movementRange(
  exercise: Exercise,
  first: number,
  second: number,
) {
  const lower =
      exercise === "elbow" ? Math.max(first, second) : Math.min(first, second),
    upper =
      exercise === "elbow" ? Math.min(first, second) : Math.max(first, second);
  return validMovementRange(exercise, lower, upper) ? { lower, upper } : null;
}

export type RangeSettings = {
  exercise: Exercise;
  lower: number;
  upper: number;
  gripLower: number;
  gripUpper: number;
  reachLower: number;
  reachUpper: number;
  tiltLower: number;
  tiltUpper: number;
};
export function getMovementRange(s: RangeSettings) {
  return s.exercise === "grip"
    ? { lower: s.gripLower, upper: s.gripUpper }
    : s.exercise === "reach"
      ? { lower: s.reachLower, upper: s.reachUpper }
      : s.exercise === "wrist"
        ? { lower: s.tiltLower, upper: s.tiltUpper }
        : { lower: s.lower, upper: s.upper };
}
export function applyMovementRange<T extends RangeSettings>(
  s: T,
  lower: number,
  upper: number,
): T {
  return s.exercise === "grip"
    ? { ...s, gripLower: lower, gripUpper: upper }
    : s.exercise === "reach"
      ? { ...s, reachLower: lower, reachUpper: upper }
      : s.exercise === "wrist"
        ? { ...s, tiltLower: lower, tiltUpper: upper }
        : { ...s, lower, upper };
}
