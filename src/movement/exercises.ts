import { childInstructions } from "./instructions";
import {
  clamp,
  usableLandmark,
  type Arm,
  type Landmark,
  type TrackingFrame,
} from "./core";
export type Exercise = "grip" | "reach" | "elbow" | "wrist" | "ship";
export const exercises = {
  grip: {
    tab: "Sleepy Flowers",
    hero: ["Little hands.", "Big magic."],
    intro: "Sleepy flowers need a little magic.",
    promise: "Open your hand. Make the forest bloom.",
    title: "Wake a sleepy flower",
    short: "Open. Close. Bloom!",
    description: "Little hands. Lovely blossoms.",
    up: childInstructions.grip.high,
    down: childInstructions.grip.low,
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
    up: childInstructions.reach.high,
    down: childInstructions.reach.low,
    camera:
      "Show the elbow and hand of your playing arm. Rest your elbow and gently lift that hand.",
  },
  elbow: {
    tab: "Dragon Flight",
    hero: ["Little bends.", "Dragon wings."],
    intro: "Luma is learning a lovely new loop.",
    promise: "Bend and return. Give a little dragon a lift.",
    title: "Give Luma a lift",
    short: "Bend & return",
    description: "Little bends. Lovely wingbeats.",
    up: childInstructions.elbow.high,
    down: childInstructions.elbow.low,
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
    up: childInstructions.wrist.high,
    down: childInstructions.wrist.low,
    camera:
      "Show your hand from the side, little finger toward the camera and thumb away from it. Your forearm can rest on a table or point up in the air. Keep your elbow, wrist and knuckles in the picture. Hold your hand straight, in line with your forearm, then bend only at the wrist.",
  },
  ship: {
    tab: "Pirate Ship",
    hero: ["Little captains.", "Big adventures."],
    intro: "Ahoy! A little ship is ready to sail.",
    promise: "Turn your arm. Steer to the sparkling islands.",
    title: "Steer a little pirate ship",
    short: "Turn. Sail. Discover!",
    description: "Little turns. Happy little voyages.",
    up: childInstructions.ship.high,
    down: childInstructions.ship.low,
    camera:
      "Face the camera with your elbow bent and hand up. Keep the elbow in one place and turn your forearm left and right like a steering wheel.",
  },
} as const;
/** Forearm lift relative to this arm's elbow, normalized by this forearm's
 * projected length. Translation, camera distance and the other arm are absent. */
export function handHeight(
  points: Landmark[],
  arm: Arm,
  aspect: number,
): number | null {
  const elbow = points[arm === "left" ? 13 : 14],
    wrist = points[arm === "left" ? 15 : 16];
  if (
    !Number.isFinite(aspect) ||
    aspect <= 0 ||
    ![elbow, wrist].every(usableLandmark)
  )
    return null;
  if ((elbow.visibility ?? 0) < 0.55 || (wrist.visibility ?? 0) < 0.55)
    return null;
  const dx = (wrist.x - elbow.x) * aspect,
    dy = elbow.y - wrist.y,
    length = Math.hypot(dx, dy);
  if (length < 0.065) return null;
  return clamp(dy / length, -1, 1);
}
export function validReachRange(lower: number, upper: number) {
  return (
    Number.isFinite(lower) &&
    Number.isFinite(upper) &&
    lower >= -1 &&
    upper <= 1 &&
    upper - lower >= 0.18 - 1e-9
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
  return exercise === "ship"
    ? (frame.steering ?? null)
    : exercise === "wrist"
      ? (frame.tilt ?? null)
      : exercise === "grip"
        ? (frame.openness ?? null)
        : exercise === "reach"
          ? (frame.height ?? null)
          : frame.angle;
}
export function reachTrackingMessage(points: Landmark[], arm: Arm) {
  const side = arm === "left" ? "left" : "right";
  return `Show your ${side} elbow and hand. Luma will wait here.`;
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
/** Signed, aspect-corrected hand lean in the mirrored camera preview.
 * Upright is zero; screen-left is negative, screen-right positive.
 * Uses the palm direction, not finger spread or an anatomical joint angle. */
export function handSteering(
  points: Landmark[],
  aspect: number,
): number | null {
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
  const dx = -(knuckle.x - wrist.x) * aspect,
    dy = wrist.y - knuckle.y;
  if (Math.hypot(dx, dy) < 0.025 || dy <= 0.01) return null;
  const lean = (Math.atan2(dx, dy) * 180) / Math.PI;
  return Math.abs(lean) <= 75 ? lean : null;
}
/** Points displayed by CameraFeed; wrist also includes posePoints for the forearm. */
export const isHandExercise = (exercise: Exercise) =>
  exercise === "grip" || exercise === "wrist";
/** Forearm lean about the elbow in the mirrored picture. No wrist/palm rotation is required. */
export function forearmSteering(
  points: Landmark[],
  arm: Arm,
  aspect: number,
): number | null {
  const elbow = points[arm === "left" ? 13 : 14],
    wrist = points[arm === "left" ? 15 : 16];
  if (
    ![elbow, wrist].every(usableLandmark) ||
    !Number.isFinite(aspect) ||
    aspect <= 0
  )
    return null;
  const x = -(wrist.x - elbow.x) * aspect,
    y = elbow.y - wrist.y;
  if (Math.hypot(x, y) < 0.06 || y <= 0.015) return null;
  const angle = (Math.atan2(x, y) * 180) / Math.PI;
  return Math.abs(angle) <= 75 ? angle : null;
}
const inPicture = (p: Landmark | undefined): p is Landmark =>
  !!p &&
  Number.isFinite(p.x) &&
  Number.isFinite(p.y) &&
  p.x >= 0 &&
  p.x <= 1 &&
  p.y >= 0 &&
  p.y <= 1;
/** Elbow, wrist and the hand's knuckle centre (mean of the four finger knuckles). */
function wristGeometry(
  pose: Landmark[],
  hand: Landmark[],
  arm: Arm,
  aspect: number,
) {
  const elbow = pose[arm === "left" ? 13 : 14],
    w = hand[0];
  if (
    !usableLandmark(elbow) ||
    !inPicture(w) ||
    !Number.isFinite(aspect) ||
    aspect <= 0
  )
    return null;
  const knuckles = [5, 9, 13, 17].map((i) => hand[i]).filter(inPicture);
  if (knuckles.length < 2) return null;
  const k = {
    x: knuckles.reduce((s, p) => s + p.x, 0) / knuckles.length,
    y: knuckles.reduce((s, p) => s + p.y, 0) / knuckles.length,
  };
  const fx = (w.x - elbow.x) * aspect,
    fy = w.y - elbow.y,
    hx = (k.x - w.x) * aspect,
    hy = k.y - w.y;
  const fl = Math.hypot(fx, fy),
    hl = Math.hypot(hx, hy);
  // Forearm must be visible; a hand pointing straight at the camera has no readable bend.
  if (fl < 0.06 || hl < 0.012 || hl < fl * 0.08) return null;
  return { elbow, wrist: w, knuckle: k, fx, fy, hx, hy };
}
/**
 * Signed bend of the hand against the forearm line, in degrees, in the
 * picture plane. 0° means "level": the hand continues the forearm in a
 * straight line. Works with the forearm resting sideways or raised in the
 * air, as long as the hand is seen from its side (little finger toward the camera).
 */
export function wristBendSigned(
  pose: Landmark[],
  hand: Landmark[],
  arm: Arm,
  aspect: number,
): number | null {
  const g = wristGeometry(pose, hand, arm, aspect);
  if (!g) return null;
  const angle =
    (Math.atan2(g.fx * g.hy - g.fy * g.hx, g.fx * g.hx + g.fy * g.hy) * 180) /
    Math.PI;
  return Math.abs(angle) <= 90 ? angle : null;
}
/** Butterfly input: how far the hand bends away from level, either way, 0–90°.
 * Moving or raising the whole arm does not change it; only the wrist bend does. */
export function wristBend(
  pose: Landmark[],
  hand: Landmark[],
  arm: Arm,
  aspect: number,
): number | null {
  const angle = wristBendSigned(pose, hand, arm, aspect);
  return angle === null ? null : Math.abs(angle);
}
/** Games offered to players. The reach (Firefly Trail) game was retired. */
export const exerciseOrder: Exercise[] = [
  "grip",
  "elbow",
  "wrist",
  "ship",
];
export const movementLimits = {
  grip: { min: 0, max: 5, delta: 0.2, spread: 0.16, precision: 1000 },
  reach: { min: -1, max: 1, delta: 0.18, spread: 0.08, precision: 1000 },
  elbow: { min: 10, max: 180, delta: 5, spread: 6, precision: 10 },
  wrist: { min: -90, max: 90, delta: 5, spread: 6, precision: 10 },
  ship: { min: -75, max: 75, delta: 5, spread: 6, precision: 10 },
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
  shipLower: number;
  shipUpper: number;
};
export function getMovementRange(s: RangeSettings) {
  return s.exercise === "ship"
    ? { lower: s.shipLower, upper: s.shipUpper }
    : s.exercise === "grip"
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
  return s.exercise === "ship"
    ? { ...s, shipLower: lower, shipUpper: upper }
    : s.exercise === "grip"
      ? { ...s, gripLower: lower, gripUpper: upper }
      : s.exercise === "reach"
        ? { ...s, reachLower: lower, reachUpper: upper }
        : s.exercise === "wrist"
          ? { ...s, tiltLower: lower, tiltUpper: upper }
          : { ...s, lower, upper };
}
