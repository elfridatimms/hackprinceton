import { MovementGuide } from "./MovementGuide";
import { exercises, type Exercise } from "../movement/exercises";
import { useEffect, useRef } from "react";
import {
  Camera,
  CameraOff,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  Keyboard,
  Hand,
  ShieldCheck,
} from "lucide-react";
import { FRAME_MAX_AGE_MS } from "../movement/calibration";
import { usableLandmark } from "../movement/core";
import type { Tracking } from "../movement/useTracking";
import type { Session } from "../game/session";
export function CameraFeed({
  tracking,
  arm,
  sourceLabel,
  exercise = "elbow",
}: {
  tracking: Tracking;
  arm: "left" | "right";
  sourceLabel?: string;
  exercise?: Exercise;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(tracking.frame);
  frameRef.current = tracking.frame;
  useEffect(() => {
    let id = 0;
    const draw = () => {
      const c = canvas.current,
        vid = tracking.video.current;
      if (c) {
        const ctx = c.getContext("2d")!;
        ctx.clearRect(0, 0, c.width, c.height);
        if (vid && vid.readyState >= 2) {
          if (c.width !== vid.videoWidth || c.height !== vid.videoHeight) {
            c.width = vid.videoWidth;
            c.height = vid.videoHeight;
          }
          ctx.drawImage(vid, 0, 0, c.width, c.height);
          const frame = frameRef.current;
          if (performance.now() - frame.at < FRAME_MAX_AGE_MS) {
            if (exercise === "grip" || exercise === "wrist") {
              if (frame.valid) {
                const links = [
                  [0, 1],
                  [1, 2],
                  [2, 3],
                  [3, 4],
                  [0, 5],
                  [5, 6],
                  [6, 7],
                  [7, 8],
                  [5, 9],
                  [9, 10],
                  [10, 11],
                  [11, 12],
                  [9, 13],
                  [13, 14],
                  [14, 15],
                  [15, 16],
                  [13, 17],
                  [0, 17],
                  [17, 18],
                  [18, 19],
                  [19, 20],
                ];
                const inside = (p: (typeof frame.points)[number] | undefined) =>
                  !!p && p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1;
                ctx.strokeStyle = "#fce6a1";
                ctx.lineWidth = 3;
                ctx.lineCap = "round";
                for (const [a, b] of links) {
                  const p = frame.points[a],
                    q = frame.points[b];
                  if (inside(p) && inside(q)) {
                    ctx.beginPath();
                    ctx.moveTo(p.x * c.width, p.y * c.height);
                    ctx.lineTo(q.x * c.width, q.y * c.height);
                    ctx.stroke();
                  }
                }
                for (const p of frame.points) {
                  if (inside(p)) {
                    ctx.beginPath();
                    ctx.arc(p.x * c.width, p.y * c.height, 3, 0, Math.PI * 2);
                    ctx.fillStyle = "#fff2bd";
                    ctx.fill();
                  }
                }
              }
            } else {
              const ids =
                exercise === "reach"
                  ? arm === "left"
                    ? [12, 11, 15]
                    : [11, 12, 16]
                  : arm === "left"
                    ? [11, 13, 15]
                    : [12, 14, 16];
              const pts = ids.map((i) => frame.points[i]);
              ctx.strokeStyle = "#ffdf8b";
              ctx.lineWidth = 5;
              ctx.lineCap = "round";
              for (let i = 0; i < 2; i++) {
                const a = pts[i],
                  b = pts[i + 1];
                if (usableLandmark(a) && usableLandmark(b)) {
                  ctx.beginPath();
                  ctx.moveTo(a.x * c.width, a.y * c.height);
                  ctx.lineTo(b.x * c.width, b.y * c.height);
                  ctx.stroke();
                }
              }
              pts.filter(usableLandmark).forEach((p) => {
                ctx.beginPath();
                ctx.arc(p.x * c.width, p.y * c.height, 6, 0, Math.PI * 2);
                ctx.fillStyle = "#fff4c4";
                ctx.fill();
              });
            }
          }
        }
      }
      id = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(id);
  }, [tracking.video, arm, exercise]);
  return (
    <div
      className="camera-feed"
      style={{
        aspectRatio: `${tracking.video.current?.videoWidth || 640}/${tracking.video.current?.videoHeight || 480}`,
      }}
    >
      <canvas
        ref={canvas}
        width={640}
        height={480}
        aria-label="Live mirrored camera preview with selected arm landmarks"
        style={{ transform: "scaleX(-1)" }}
      />
      <span className="live-label">
        <i />{" "}
        {sourceLabel ??
          (tracking.status === "on"
            ? "Live camera"
            : tracking.status === "loading"
              ? "Starting camera…"
              : "Camera off")}
      </span>
      {!tracking.frame.valid && (
        <span className="camera-hint">
          {tracking.status === "loading"
            ? "Waking up the camera…"
            : tracking.frame.message}
        </span>
      )}
    </div>
  );
}
export function InputPanel({
  session,
  tracking,
  arm,
  collapsed,
  setCollapsed,
  onCameraOff,
  onLesson,
  exercise = "grip",
}: {
  session: Session;
  tracking: Tracking;
  arm: "left" | "right";
  collapsed: boolean;
  setCollapsed: (n: boolean) => void;
  onCameraOff: () => void;
  onLesson?: () => void;
  exercise?: Exercise;
}) {
  const demo = session.mode === "demo";
  return (
    <aside className={"input-panel " + (collapsed ? "collapsed" : "")}>
      <button
        className="panel-heading"
        onClick={() => setCollapsed(!collapsed)}
      >
        {demo ? <Keyboard size={17} /> : <Camera size={17} />}
        <span>{demo ? "Demo controls" : "Your camera"}</span>
        {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
      </button>
      {!collapsed && (
        <>
          <div className="panel-inner">
            <div className="panel-move-example">
              <MovementGuide exercise={exercise} compact />
              <strong>{exercises[exercise].short}</strong>
              {onLesson && (
                <button className="watch-again-button" onClick={onLesson}>
                  Show me how ↗
                </button>
              )}
            </div>
            {demo ? (
              <>
                <div className="demo-art">
                  <Hand size={32} strokeWidth={1.3} />
                  <div>
                    <kbd>
                      <ArrowUp size={16} />
                    </kbd>
                    <kbd>
                      <ArrowDown size={16} />
                    </kbd>
                  </div>
                </div>
                <h3>
                  {exercise === "grip"
                    ? "Open. Close. Bloom!"
                    : "Your little magic move."}
                </h3>
                <p>
                  Use your arrow keys, or move the slider. Luma follows you.
                </p>
                <label className="demo-slider">
                  <span>
                    {exercise === "wrist"
                      ? "Lift the butterfly"
                      : exercise === "grip"
                        ? "Open the flower"
                        : "Fly higher"}{" "}
                    <ArrowUp size={14} />
                  </span>
                  <input
                    type="range"
                    aria-label={
                      exercise === "wrist"
                        ? "Demo hand tilt"
                        : exercise === "grip"
                          ? "Demo hand openness"
                          : "Demo flight height"
                    }
                    min="0"
                    max="1"
                    step="0.01"
                    value={session.control.current}
                    onChange={(e) => {
                      session.control.current = +e.target.value;
                    }}
                  />
                  <span>
                    {exercise === "wrist"
                      ? "Come softly back"
                      : exercise === "grip"
                        ? "Close softly"
                        : "Fly lower"}{" "}
                    <ArrowDown size={14} />
                  </span>
                </label>
                <div className="mode-note">
                  Keyboard & slider input
                  <br />
                  No camera measurements
                </div>
              </>
            ) : (
              <>
                <CameraFeed tracking={tracking} arm={arm} exercise={exercise} />
                <div
                  className={
                    "tracking-label " + (tracking.frame.valid ? "valid" : "")
                  }
                >
                  <i />
                  {tracking.frame.message}
                </div>
                <p className="small">
                  {exercise === "wrist"
                    ? "One playing hand · fingers across the picture"
                    : exercise === "grip"
                      ? "One playing hand · palm to camera"
                      : exercise === "reach"
                        ? "Front view · both shoulders visible"
                        : (arm === "left" ? "Left" : "Right") +
                          " arm · side-on view"}
                </p>
                <button className="text-button" onClick={onCameraOff}>
                  <CameraOff size={15} /> Turn camera off
                </button>
                {tracking.error && (
                  <div className="error-message">
                    {tracking.error}
                    <button onClick={() => void tracking.start()}>
                      Reconnect camera
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
          <div className="privacy-note">
            <ShieldCheck size={15} />
            <span>
              {demo
                ? "Made for exploring at your pace."
                : "Your video stays on this device."}
            </span>
          </div>
        </>
      )}
    </aside>
  );
}
