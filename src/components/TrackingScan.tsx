import { useEffect, useRef, useState } from "react";
import { ScanLine, ShieldCheck, Activity, Sparkles } from "lucide-react";
import type { Tracking } from "../movement/useTracking";
import { FRAME_MAX_AGE_MS } from "../movement/calibration";
import {
  isHandExercise,
  movementLimits,
  movementValue,
  type Exercise,
} from "../movement/exercises";
import { usableLandmark, clamp, type Arm } from "../movement/core";
import { CameraFeed } from "./CameraPanel";
export function TrackingScan({
  tracking,
  exercise,
  arm,
  range,
  compact = false,
}: {
  tracking: Tracking;
  exercise: Exercise;
  arm: Arm;
  range?: { lower: number; upper: number };
  compact?: boolean;
}) {
  const [now, setNow] = useState(performance.now());
  const trace = useRef<{ value: number | null; at: number }[]>([]);
  const value = movementValue(tracking.frame, exercise);
  const clockNow = Math.max(now, performance.now());
  const fresh =
    tracking.status === "on" &&
    tracking.frame.valid &&
    value !== null &&
    clockNow >= tracking.frame.at &&
    clockNow - tracking.frame.at < FRAME_MAX_AGE_MS;
  useEffect(() => {
    const id = setInterval(() => setNow(performance.now()), 100);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    const f = tracking.frame,
      last = trace.current.at(-1);
    if (last?.at === f.at) return;
    trace.current.push({
      value: f.valid ? movementValue(f, exercise) : null,
      at: f.at,
    });
    trace.current = trace.current
      .filter((s) => performance.now() - s.at < 4500)
      .slice(-80);
    setNow(performance.now());
  }, [tracking.frame, exercise]);
  const limits = movementLimits[exercise];
  const lo = range?.lower ?? limits.min,
    hi = range?.upper ?? limits.max;
  const segments: string[] = [];
  let path = "";
  let previous = 0;
  for (const s of trace.current) {
    if (s.value === null || now - s.at > 4500) {
      if (path) segments.push(path);
      path = "";
      continue;
    }
    if (previous && s.at - previous > FRAME_MAX_AGE_MS) {
      if (path) segments.push(path);
      path = "";
    }
    const x = clamp(1 - (now - s.at) / 4500) * 240,
      y = 53 - clamp((s.value - lo) / (hi - lo)) * 42;
    path += `${path ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)} `;
    previous = s.at;
  }
  if (path) segments.push(path);
  const hand = isHandExercise(exercise);
  const pointFresh =
    tracking.status === "on" &&
    clockNow >= tracking.frame.at &&
    clockNow - tracking.frame.at < FRAME_MAX_AGE_MS;
  const visible = pointFresh
    ? tracking.frame.points.filter((p) =>
        hand
          ? (tracking.frame.pointsValid || tracking.frame.valid) &&
            Number.isFinite(p.x) &&
            Number.isFinite(p.y) &&
            p.x >= 0 &&
            p.x <= 1 &&
            p.y >= 0 &&
            p.y <= 1
          : usableLandmark(p),
      ).length
    : 0;
  return (
    <div
      className={`tracking-scan ${compact ? "scan-compact" : ""} ${fresh ? "scan-found" : ""}`}
    >
      <div className="scan-toolbar">
        <span>
          <ScanLine size={15} /> MEDIAPIPE · LIVE TRACKING
        </span>
        <span className="scan-state">
          <i />
          {tracking.status === "loading"
            ? "Loading tracker"
            : fresh
              ? "Movement found"
              : tracking.status === "off"
                ? "Camera off"
                : "Finding your movement"}
        </span>
      </div>
      <div className="scan-window">
        <CameraFeed tracking={tracking} exercise={exercise} arm={arm} scan />
        <div className="scan-grid" aria-hidden="true" />
        <div className="scan-sweep" aria-hidden="true" />
        <i className="scan-corner corner-tl" />
        <i className="scan-corner corner-tr" />
        <i className="scan-corner corner-bl" />
        <i className="scan-corner corner-br" />
        <div className="scan-bottom-label">
          <span>
            <Sparkles size={13} />
            {fresh
              ? "Your movement is the magic."
              : hand
                ? "Show your playing hand."
                : "Let the camera see your body."}
          </span>
          <b>
            {visible} <small>landmarks visible</small>
          </b>
        </div>
      </div>
      <div className="scan-telemetry">
        <div>
          <span className="scan-small-label">
            <Activity size={12} /> LIVE MOVEMENT
          </span>
          <svg
            viewBox="0 0 240 64"
            role="img"
            aria-label="Recent camera movement signal; gaps mean tracking was lost"
          >
            <path
              d="M0 16H240M0 36H240M0 56H240"
              stroke="#c8d8c8"
              strokeWidth=".7"
              strokeDasharray="2 5"
            />
            {segments.map((d, i) => (
              <path
                key={i}
                d={d}
                stroke="#5f9685"
                strokeWidth="2.3"
                fill="none"
                strokeLinecap="round"
              />
            ))}
          </svg>
        </div>
        <div className="scan-engine">
          <strong>{hand ? "Hand Landmarker" : "Pose Landmarker"}</strong>
          <span>
            {fresh ? "Following your movement" : "Waiting for a clear view"}
          </span>
          <small>
            {tracking.diagnostics?.inferenceMs != null
              ? `${tracking.diagnostics.inferenceMs} ms · on-device`
              : "On-device processing"}
          </small>
        </div>
      </div>
      <p className="scan-privacy">
        <ShieldCheck size={12} /> Camera stays here. Nothing is uploaded.
      </p>
    </div>
  );
}
