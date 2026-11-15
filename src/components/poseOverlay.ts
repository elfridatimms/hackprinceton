import { usableLandmark, type Landmark, type TrackingFrame } from "../movement/core";
import type { Exercise } from "../movement/exercises";

/** Live guide data from the game: where the child is, where the next target is. */
export type OverlayGuide = {
  /** Current normalized game input, 0..1. */
  value: number | null;
  /** Next target in the same 0..1 units, or null when the game has none. */
  goal: number | null;
  /** Hold-at-target progress, 0..1. */
  dwell: number;
  range?: { lower: number; upper: number };
};
type Pt = { x: number; y: number };
export type OverlayState = {
  disp: Map<string, Pt>;
  trail: (Pt & { t: number })[];
  anchor: Pt | null;
  lastAt: number;
  /** Eased 0..1 "too close to this edge" levels: left, right, top, bottom (display). */
  edges: [number, number, number, number];
};
export const createOverlayState = (): OverlayState => ({
  disp: new Map(),
  trail: [],
  anchor: null,
  lastAt: 0,
  edges: [0, 0, 0, 0],
});

const themes: Record<Exercise | "scan", { main: string; glow: string; accent: string }> = {
  grip: { main: "#ffb7a8", glow: "255,170,150", accent: "#ffe597" },
  reach: { main: "#ffd36e", glow: "255,210,110", accent: "#fff4c6" },
  elbow: { main: "#7fe3c8", glow: "120,230,200", accent: "#ffc79e" },
  wrist: { main: "#cdb9ff", glow: "200,180,255", accent: "#ffe1f0" },
  ship: { main: "#80d8ec", glow: "128,216,236", accent: "#ffe2a0" },
  scan: { main: "#8df4da", glow: "141,244,218", accent: "#f0fff4" },
};
const MATCH = "#b9f28a";

const HAND_LINKS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [0, 17], [17, 18], [18, 19], [19, 20],
];
const BODY_LINKS = [
  [11, 12], [11, 13], [13, 15], [15, 17], [15, 19], [17, 19], [15, 21],
  [12, 14], [14, 16], [16, 18], [16, 20], [18, 20], [16, 22],
  [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [27, 29], [29, 31],
  [27, 31], [24, 26], [26, 28], [28, 30], [30, 32], [28, 32],
];
const FINGERTIPS = new Set([4, 8, 12, 16, 20]);

const insideFrame = (p: Landmark | undefined): p is Landmark =>
  !!p &&
  Number.isFinite(p.x) &&
  Number.isFinite(p.y) &&
  p.x >= 0 &&
  p.x <= 1 &&
  p.y >= 0 &&
  p.y <= 1;

/**
 * Draws a mirrored camera picture plus a calm, glowing skeleton. Landmarks are
 * already One-Euro smoothed in tracking; here they are additionally eased per
 * render frame, so 20 Hz inference never looks like stepping or shaking.
 */
export function drawPoseOverlay(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  frame: TrackingFrame,
  o: {
    exercise: Exercise;
    arm: "left" | "right";
    scan: boolean;
    fresh: boolean;
    guide: OverlayGuide | null;
    reduced: boolean;
    state: OverlayState;
    now: number;
  },
) {
  const W = ctx.canvas.width,
    H = ctx.canvas.height,
    u = H / 100,
    s = o.state;
  const dt = s.lastAt ? Math.min(0.1, (o.now - s.lastAt) / 1000) : 0;
  s.lastAt = o.now;
  const theme = themes[o.scan ? "scan" : o.exercise];

  // Mirrored video, so every overlay below is drawn in display coordinates.
  ctx.setTransform(-1, 0, 0, 1, W, 0);
  ctx.drawImage(video, 0, 0, W, H);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.85);
  vignette.addColorStop(0, "rgba(16,38,32,0)");
  vignette.addColorStop(1, o.scan ? "rgba(16,38,32,0.35)" : "rgba(16,38,32,0.5)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);
  if (!o.fresh) {
    s.disp.clear();
    s.trail = [];
    s.anchor = null;
    // Keep pointing to where the hand left the picture for a little while.
    const fade = Math.exp(-dt / 1.6);
    s.edges = s.edges.map((v) => v * fade) as OverlayState["edges"];
    if (!o.scan && s.edges.some((v) => v > 0.05))
      drawEdges(ctx, W, H, s.edges, o.now, o.reduced, o.exercise === "grip" || o.exercise === "wrist");
    return;
  }

  const ease = 1 - Math.exp(-dt / 0.075);
  const live = new Set<string>();
  const place = (key: string, p: Landmark | undefined): Pt | null => {
    if (!insideFrame(p)) return null;
    const target = { x: (1 - p.x) * W, y: p.y * H };
    live.add(key);
    const d = s.disp.get(key);
    if (!d || dt === 0 || Math.hypot(d.x - target.x, d.y - target.y) > H * 0.25) {
      s.disp.set(key, target);
      return target;
    }
    d.x += (target.x - d.x) * ease;
    d.y += (target.y - d.y) * ease;
    return d;
  };

  const hand = o.exercise === "grip" || o.exercise === "wrist";
  const side = frame.arm ?? o.arm;
  const [sh, el, wr] = side === "left" ? [11, 13, 15] : [12, 14, 16];
  const pose = (hand ? frame.posePoints : frame.points) ?? [];
  const bones: [Pt, Pt, number][] = [];
  const joints: [Pt, number][] = [];
  let tip: Pt | null = null,
    pivot: Pt | null = null,
    shoulder: Pt | null = null,
    wristPt: Pt | null = null,
    knucklePt: Pt | null = null;

  if (hand) {
    // Sleepy Flowers: hang the whole hand from the pinned wrist, so small
    // whole-hand wobbles do not shake the drawing; finger shape stays live.
    const w0 = frame.points[0],
      pin = o.exercise === "grip" ? frame.anchor : null;
    const steady =
      pin && w0
        ? frame.points.map((p) => ({ ...p, x: p.x - w0.x + pin.x, y: p.y - w0.y + pin.y }))
        : frame.points;
    const pts = steady.map((p, i) => place("h" + i, p));
    for (const [a, b] of HAND_LINKS)
      if (pts[a] && pts[b]) bones.push([pts[a]!, pts[b]!, a === 0 || b === 0 ? 1.15 : 1]);
    pts.forEach((p, i) => p && joints.push([p, FINGERTIPS.has(i) ? 1.25 : i === 0 ? 1.4 : 0.8]));
    if (o.exercise === "wrist" && usableLandmark(pose[el]) && pts[0]) {
      pivot = place("p" + el, pose[el]);
      if (pivot) bones.push([pivot, pts[0]!, 1.6]);
      tip = pts[9];
      wristPt = pts[0];
      const ks = [5, 9, 13, 17].map((i) => pts[i]).filter((p): p is Pt => !!p);
      if (ks.length >= 2)
        knucklePt = {
          x: ks.reduce((a, p) => a + p.x, 0) / ks.length,
          y: ks.reduce((a, p) => a + p.y, 0) / ks.length,
        };
    } else {
      pivot = frame.anchor ? place("anchor", frame.anchor) : pts[0];
      tip = pts[12] ?? pts[8];
    }
  } else if (o.scan) {
    const pts = frame.points.map((p, i) => (usableLandmark(p) ? place("p" + i, p) : null));
    for (const [a, b] of BODY_LINKS)
      if (pts[a] && pts[b]) bones.push([pts[a]!, pts[b]!, 1]);
    [...new Set(BODY_LINKS.flat())].forEach((i) => pts[i] && joints.push([pts[i]!, 1]));
  } else {
    const get = (i: number) => (usableLandmark(pose[i]) ? place("p" + i, pose[i]) : null);
    shoulder = get(sh);
    pivot = get(el);
    tip = get(wr);
    const fingers = (side === "left" ? [17, 19, 21] : [18, 20, 22]).map(get);
    if (shoulder && pivot) bones.push([shoulder, pivot, o.exercise === "elbow" ? 1.5 : 0.9]);
    if (pivot && tip) bones.push([pivot, tip, 1.7]);
    if (tip) fingers.forEach((f) => f && bones.push([tip!, f, 0.7]));
    if (shoulder) joints.push([shoulder, 1.2]);
    if (tip) joints.push([tip, 1.5]);
    fingers.forEach((f) => f && joints.push([f, 0.6]));
  }
  for (const key of [...s.disp.keys()]) if (!live.has(key)) s.disp.delete(key);

  const g = o.guide;
  const matched =
    !o.scan && frame.valid && g?.value != null && g.goal != null && Math.abs(g.value - g.goal) < 0.12;

  // Ghost arm: where the forearm should point for the next target.
  if (!o.scan && frame.valid && g?.goal != null && g.range && pivot && tip) {
    const length = Math.hypot(tip.x - pivot.x, tip.y - pivot.y);
    const target = g.range.lower + g.goal * (g.range.upper - g.range.lower);
    let ghost: Pt | null = null;
    if (o.exercise === "ship") {
      const a = (target * Math.PI) / 180;
      ghost = { x: pivot.x + Math.sin(a) * length, y: pivot.y - Math.cos(a) * length };
    } else if (o.exercise === "reach") {
      const lift = Math.max(-1, Math.min(1, target));
      const sign = tip.x >= pivot.x ? 1 : -1;
      ghost = {
        x: pivot.x + sign * Math.sqrt(1 - lift * lift) * length,
        y: pivot.y - lift * length,
      };
    } else if (o.exercise === "elbow" && shoulder) {
      const ux = shoulder.x - pivot.x,
        uy = shoulder.y - pivot.y,
        ul = Math.hypot(ux, uy) || 1;
      const cross = ux * (tip.y - pivot.y) - uy * (tip.x - pivot.x);
      const rotated = (sign: number) => {
        const a = (sign * target * Math.PI) / 180;
        return {
          x: pivot.x + ((ux * Math.cos(a) - uy * Math.sin(a)) / ul) * length,
          y: pivot.y + ((ux * Math.sin(a) + uy * Math.cos(a)) / ul) * length,
        };
      };
      // A nearly straight arm has no clear bend side: bend the hand upward.
      const clear = Math.abs(cross) > 0.2 * ul * length;
      const up = rotated(1),
        down = rotated(-1);
      ghost = clear ? (cross >= 0 ? up : down) : up.y < down.y ? up : down;
    }
    if (ghost) {
      const pulse = o.reduced ? 0.5 : 0.5 + Math.sin(o.now / 260) * 0.5;
      ctx.save();
      ctx.setLineDash([u * 1.6, u * 1.4]);
      ctx.lineDashOffset = o.reduced ? 0 : -o.now / 40;
      ctx.lineCap = "round";
      ctx.strokeStyle = matched ? "rgba(185,242,138,0.75)" : "rgba(255,255,255,0.55)";
      ctx.lineWidth = u * 1.3;
      ctx.beginPath();
      ctx.moveTo(pivot.x, pivot.y);
      ctx.lineTo(ghost.x, ghost.y);
      ctx.stroke();
      ctx.restore();
      drawTarget(ctx, ghost, u * (3.2 + pulse * 0.6), matched ? MATCH : theme.accent, g.dwell, o.now, o.reduced);
    }
  }

  // Butterfly: "level" line continuing the forearm, the bend arc, and a ghost hand.
  if (!o.scan && o.exercise === "wrist" && pivot && wristPt && knucklePt) {
    const fa = Math.atan2(wristPt.y - pivot.y, wristPt.x - pivot.x);
    const ha = Math.atan2(knucklePt.y - wristPt.y, knucklePt.x - wristPt.x);
    let bend = ha - fa;
    while (bend > Math.PI) bend -= Math.PI * 2;
    while (bend < -Math.PI) bend += Math.PI * 2;
    const hl = Math.hypot(knucklePt.x - wristPt.x, knucklePt.y - wristPt.y);
    const reach = Math.max(hl * 1.6, u * 9);
    ctx.save();
    ctx.setLineDash([u * 1.2, u * 1.1]);
    ctx.strokeStyle = "rgba(255,255,244,0.75)";
    ctx.lineWidth = u * 0.55;
    ctx.beginPath();
    ctx.moveTo(wristPt.x, wristPt.y);
    ctx.lineTo(wristPt.x + Math.cos(fa) * reach, wristPt.y + Math.sin(fa) * reach);
    ctx.stroke();
    ctx.setLineDash([]);
    const r = Math.max(hl * 0.75, u * 5);
    ctx.beginPath();
    ctx.moveTo(wristPt.x, wristPt.y);
    ctx.arc(wristPt.x, wristPt.y, r, fa, fa + bend, bend < 0);
    ctx.closePath();
    ctx.fillStyle = frame.valid ? `rgba(${theme.glow},0.35)` : "rgba(220,220,210,0.2)";
    ctx.fill();
    ctx.strokeStyle = theme.main;
    ctx.lineWidth = u * 0.6;
    ctx.beginPath();
    ctx.arc(wristPt.x, wristPt.y, r, fa, fa + bend, bend < 0);
    ctx.stroke();
    if (frame.valid && g?.goal != null && g.range) {
      const target =
        ((g.range.lower + g.goal * (g.range.upper - g.range.lower)) * Math.PI) / 180;
      const side = (sign: number) => ({
        x: wristPt!.x + Math.cos(fa + sign * target) * hl * 1.15,
        y: wristPt!.y + Math.sin(fa + sign * target) * hl * 1.15,
      });
      const a = side(1),
        b = side(-1);
      const ghost =
        Math.abs(bend) > (6 * Math.PI) / 180 ? (bend > 0 ? a : b) : a.y < b.y ? a : b;
      ctx.setLineDash([u * 1.4, u * 1.2]);
      ctx.strokeStyle = matched ? "rgba(185,242,138,0.8)" : "rgba(255,255,255,0.6)";
      ctx.lineWidth = u * 1.2;
      ctx.beginPath();
      ctx.moveTo(wristPt.x, wristPt.y);
      ctx.lineTo(ghost.x, ghost.y);
      ctx.stroke();
      ctx.setLineDash([]);
      drawTarget(ctx, ghost, u * 3, matched ? MATCH : theme.accent, g.dwell, o.now, o.reduced);
    }
    ctx.restore();
  }

  // Trail of the moving end.
  if (tip && !o.scan) {
    s.trail.push({ x: tip.x, y: tip.y, t: o.now });
    while (s.trail.length && o.now - s.trail[0].t > 650) s.trail.shift();
    for (let i = 1; i < s.trail.length; i++) {
      const a = s.trail[i - 1],
        b = s.trail[i],
        life = 1 - (o.now - b.t) / 650;
      ctx.strokeStyle = `rgba(${theme.glow},${(life * 0.55).toFixed(3)})`;
      ctx.lineWidth = u * (0.6 + life * 2.2);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  } else s.trail = [];

  const color = frame.valid || o.scan ? (matched ? MATCH : theme.main) : "#c9d2c4";
  const glow = frame.valid || o.scan ? (matched ? "185,242,138" : theme.glow) : "200,210,196";
  const width = o.scan ? Math.max(3, W / 230) : u * 1.05;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const [a, b, w] of bones) {
    ctx.strokeStyle = `rgba(${glow},0.28)`;
    ctx.lineWidth = width * w * 3.2;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  for (const [a, b, w] of bones) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width * w;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  for (const [p, size] of joints) {
    const r = (o.scan ? Math.max(4, W / 160) : u * 0.95) * size;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * 1.9, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${glow},0.25)`;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fillStyle = "#fffdf4";
    ctx.fill();
    ctx.lineWidth = r * 0.45;
    ctx.strokeStyle = color;
    ctx.stroke();
  }

  // Fixed reference point: the pinned pivot joint.
  if (pivot && !o.scan) {
    s.anchor = pivot;
    const r = u * 3.6,
      spin = o.reduced ? 0 : o.now / 1800;
    ctx.save();
    ctx.beginPath();
    ctx.arc(pivot.x, pivot.y, r * 1.55, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${glow},0.12)`;
    ctx.fill();
    ctx.setLineDash([r * 0.42, r * 0.32]);
    ctx.lineDashOffset = -spin * r * 4;
    ctx.strokeStyle = "rgba(255,253,240,0.85)";
    ctx.lineWidth = u * 0.55;
    ctx.beginPath();
    ctx.arc(pivot.x, pivot.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = color;
    ctx.lineWidth = u * 0.5;
    for (let i = 0; i < 4; i++) {
      const a = spin + (i * Math.PI) / 2;
      ctx.beginPath();
      ctx.moveTo(pivot.x + Math.cos(a) * r * 1.2, pivot.y + Math.sin(a) * r * 1.2);
      ctx.lineTo(pivot.x + Math.cos(a) * r * 1.55, pivot.y + Math.sin(a) * r * 1.55);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(pivot.x, pivot.y, u * 1.25, 0, Math.PI * 2);
    ctx.fillStyle = "#fffdf4";
    ctx.fill();
    ctx.lineWidth = u * 0.6;
    ctx.stroke();
    ctx.restore();
  }

  if (!o.scan && frame.valid && g?.value != null)
    drawGauge(ctx, W, H, o.exercise === "ship", g, theme, matched, o.now, o.reduced);

  if (o.scan) return;
  // Which limb is playing: a clear label on the tracked hand or arm.
  const labelAt = tip ?? pivot;
  if (labelAt) {
    const text =
      o.exercise === "grip"
        ? "PLAYING HAND"
        : `${side.toUpperCase()} ${hand ? "HAND" : "ARM"}`;
    drawPill(ctx, text, labelAt.x, labelAt.y - u * 10, u, theme.main, W);
  }
  // Staying in the picture: glow the edge the hand is drifting out of.
  const ids = hand
    ? frame.points.map((_, i) => i)
    : [sh, el, wr, ...(side === "left" ? [17, 19, 21] : [18, 20, 22])];
  const src = frame.points;
  const near = [false, false, false, false];
  const margin = 0.07;
  for (const i of ids) {
    const p = src[i];
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
    // Arm joints count when seen confidently, or when already past the edge.
    const outside = p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1;
    if (!hand && !outside && (p.visibility ?? 0) < 0.35) continue;
    const dx = 1 - p.x;
    if (dx < margin) near[0] = true;
    if (dx > 1 - margin) near[1] = true;
    if (p.y < margin) near[2] = true;
    if (p.y > 1 - margin) near[3] = true;
  }
  const k = 1 - Math.exp(-dt / 0.15);
  s.edges = s.edges.map((v, i) => v + ((near[i] ? 1 : 0) - v) * k) as OverlayState["edges"];
  if (s.edges.some((v) => v > 0.05)) drawEdges(ctx, W, H, s.edges, o.now, o.reduced, hand);
}

function drawPill(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  u: number,
  color: string,
  W: number,
) {
  ctx.save();
  ctx.font = `800 ${Math.round(u * 3.4)}px Nunito, "DM Sans", system-ui, sans-serif`;
  const w = ctx.measureText(text).width + u * 4,
    h = u * 5.6;
  const cx = Math.max(w / 2 + u, Math.min(W - w / 2 - u, x)),
    cy = Math.max(h / 2 + u, y);
  roundRect(ctx, cx - w / 2, cy - h / 2, w, h, h / 2);
  ctx.fillStyle = "rgba(255,253,244,0.94)";
  ctx.fill();
  ctx.lineWidth = u * 0.5;
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.fillStyle = "#24483e";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, cx, cy + u * 0.2);
  ctx.restore();
}

function drawEdges(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  edges: [number, number, number, number],
  now: number,
  reduced: boolean,
  hand: boolean,
) {
  const u = H / 100,
    pulse = reduced ? 0.8 : 0.65 + Math.sin(now / 180) * 0.35;
  ctx.save();
  const band = (i: number, level: number) => {
    const size = (i < 2 ? W : H) * 0.12;
    const g =
      i === 0
        ? ctx.createLinearGradient(0, 0, size, 0)
        : i === 1
          ? ctx.createLinearGradient(W, 0, W - size, 0)
          : i === 2
            ? ctx.createLinearGradient(0, 0, 0, size)
            : ctx.createLinearGradient(0, H, 0, H - size);
    g.addColorStop(0, `rgba(255,150,70,${(0.75 * level * pulse).toFixed(3)})`);
    g.addColorStop(1, "rgba(255,150,70,0)");
    ctx.fillStyle = g;
    if (i === 0) ctx.fillRect(0, 0, size, H);
    else if (i === 1) ctx.fillRect(W - size, 0, size, H);
    else if (i === 2) ctx.fillRect(0, 0, W, size);
    else ctx.fillRect(0, H - size, W, size);
    // Chevron pointing back toward the middle.
    const c =
      i === 0 ? { x: u * 6, y: H / 2, a: 0 }
      : i === 1 ? { x: W - u * 6, y: H / 2, a: Math.PI }
      : i === 2 ? { x: W / 2, y: u * 6, a: Math.PI / 2 }
      : { x: W / 2, y: H - u * 6, a: -Math.PI / 2 };
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.a);
    ctx.globalAlpha = level;
    ctx.strokeStyle = "#fffdf4";
    ctx.lineWidth = u * 1.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const off of [0, u * 3]) {
      ctx.beginPath();
      ctx.moveTo(off - u * 1.6, -u * 3);
      ctx.lineTo(off + u * 1.6, 0);
      ctx.lineTo(off - u * 1.6, u * 3);
      ctx.stroke();
    }
    ctx.restore();
  };
  edges.forEach((level, i) => level > 0.05 && band(i, level));
  const level = Math.max(...edges);
  ctx.globalAlpha = Math.min(1, level * 1.4);
  drawPill(
    ctx,
    hand ? "Bring your hand back to the middle" : "Bring your arm back to the middle",
    W / 2,
    H * 0.16,
    u,
    "#ff9646",
    W,
  );
  ctx.restore();
}

function drawTarget(
  ctx: CanvasRenderingContext2D,
  p: Pt,
  r: number,
  color: string,
  dwell: number,
  now: number,
  reduced: boolean,
) {
  ctx.save();
  const halo = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 2.2);
  halo.addColorStop(0, "rgba(255,248,214,0.75)");
  halo.addColorStop(1, "rgba(255,248,214,0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(p.x, p.y, r * 2.2, 0, Math.PI * 2);
  ctx.fill();
  // Four-point star.
  const spin = reduced ? 0 : now / 900;
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = spin + (i * Math.PI) / 4,
      rr = i % 2 ? r * 0.38 : r;
    ctx.lineTo(p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
  if (dwell > 0) {
    ctx.strokeStyle = MATCH;
    ctx.lineWidth = r * 0.28;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * 1.45, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, dwell));
    ctx.stroke();
  }
  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** A calm movement meter: vertical for lifting games, horizontal for steering. */
function drawGauge(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  horizontal: boolean,
  g: OverlayGuide,
  theme: { main: string; glow: string; accent: string },
  matched: boolean,
  now: number,
  reduced: boolean,
) {
  const u = H / 100,
    thick = u * 4.4,
    pad = u * 5;
  const len = horizontal ? W * 0.56 : H * 0.62;
  const x0 = horizontal ? (W - len) / 2 : W - pad - thick,
    y0 = horizontal ? H - pad - thick : (H - len) / 2;
  const at = (v: number): Pt =>
    horizontal
      ? { x: x0 + v * len, y: y0 + thick / 2 }
      : { x: x0 + thick / 2, y: y0 + (1 - v) * len };
  ctx.save();
  roundRect(ctx, x0, y0, horizontal ? len : thick, horizontal ? thick : len, thick / 2);
  ctx.fillStyle = "rgba(20,48,40,0.55)";
  ctx.fill();
  ctx.lineWidth = u * 0.35;
  ctx.strokeStyle = "rgba(255,255,240,0.35)";
  ctx.stroke();
  const v = Math.max(0, Math.min(1, g.value ?? 0));
  const cur = at(v);
  const fill = horizontal
    ? ctx.createLinearGradient(x0, 0, x0 + len, 0)
    : ctx.createLinearGradient(0, y0 + len, 0, y0);
  fill.addColorStop(0, `rgba(${theme.glow},0.15)`);
  fill.addColorStop(1, `rgba(${theme.glow},0.75)`);
  ctx.fillStyle = fill;
  if (horizontal) {
    const mid = at(0.5).x;
    roundRect(ctx, Math.min(mid, cur.x), y0 + thick * 0.2, Math.abs(cur.x - mid), thick * 0.6, thick * 0.3);
  } else roundRect(ctx, x0 + thick * 0.2, cur.y, thick * 0.6, y0 + len - cur.y, thick * 0.3);
  ctx.fill();
  if (g.goal != null) {
    const target = at(g.goal);
    drawTarget(ctx, target, thick * 0.62, matched ? MATCH : theme.accent, g.dwell, now, reduced);
  }
  ctx.beginPath();
  ctx.arc(cur.x, cur.y, thick * 0.75, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${theme.glow},0.35)`;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cur.x, cur.y, thick * 0.46, 0, Math.PI * 2);
  ctx.fillStyle = "#fffdf4";
  ctx.fill();
  ctx.lineWidth = u * 0.7;
  ctx.strokeStyle = matched ? MATCH : theme.main;
  ctx.stroke();
  ctx.restore();
}
