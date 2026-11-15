import { GameGlyph } from "./GameTabs";
import { exercises, type Exercise } from "../movement/exercises";
import { useEffect, useRef } from "react";
import {
  Camera,
  CameraOff,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowLeft,
  ArrowRight,
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
  scan = false,
}: {
  tracking: Tracking;
  arm: "left" | "right";
  sourceLabel?: string;
  exercise?: Exercise;
  scan?: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(tracking.frame);
  frameRef.current = tracking.frame;
  useEffect(() => {
    let id = 0,
      lastDraw = -100;
    const draw = () => {
      const now = performance.now();
      if (now - lastDraw < 1000 / 30) {
        id = requestAnimationFrame(draw);
        return;
      }
      lastDraw = now;
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
              if (frame.valid || (scan && frame.pointsValid)) {
                if (exercise === "wrist" && frame.posePoints) {
                  const elbow =
                      frame.posePoints[(frame.arm ?? arm) === "left" ? 13 : 14],
                    wrist = frame.points[0];
                  if (usableLandmark(elbow) && wrist) {
                    ctx.beginPath();
                    ctx.moveTo(elbow.x * c.width, elbow.y * c.height);
                    ctx.lineTo(wrist.x * c.width, wrist.y * c.height);
                    ctx.strokeStyle = "#f5dc97";
                    ctx.lineWidth = 5;
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.arc(
                      elbow.x * c.width,
                      elbow.y * c.height,
                      6,
                      0,
                      Math.PI * 2,
                    );
                    ctx.fillStyle = "#f5dc97";
                    ctx.fill();
                  }
                }
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
                ctx.strokeStyle = scan ? "#8df4da" : "#fce6a1";
                ctx.lineWidth = scan ? Math.max(3, c.width / 230) : 3;
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
                    ctx.fillStyle = scan ? "#f0fff4" : "#fff2bd";
                    ctx.fill();
                  }
                }
              }
            } else {
              const left = (frame.arm ?? arm) === "left";
              const pairs =
                exercise === "reach"
                  ? left
                    ? [
                        [11, 13],
                        [13, 15],
                      ]
                    : [
                        [12, 14],
                        [14, 16],
                      ]
                  : scan
                    ? [
                        [11, 12],
                        [11, 13],
                        [13, 15],
                        [15, 17],
                        [15, 19],
                        [17, 19],
                        [15, 21],
                        [12, 14],
                        [14, 16],
                        [16, 18],
                        [16, 20],
                        [18, 20],
                        [16, 22],
                        [11, 23],
                        [12, 24],
                        [23, 24],
                        [23, 25],
                        [25, 27],
                        [27, 29],
                        [29, 31],
                        [27, 31],
                        [24, 26],
                        [26, 28],
                        [28, 30],
                        [30, 32],
                        [28, 32],
                      ]
                    : left
                      ? [
                          [11, 13],
                          [13, 15],
                        ]
                      : [
                          [12, 14],
                          [14, 16],
                        ];
              ctx.strokeStyle = scan ? "#8df4da" : "#ffdf8b";
              ctx.lineWidth = scan ? Math.max(3, c.width / 230) : 5;
              ctx.lineCap = "round";
              for (const [a, b] of pairs) {
                const p = frame.points[a],
                  q = frame.points[b];
                if (usableLandmark(p) && usableLandmark(q)) {
                  ctx.beginPath();
                  ctx.moveTo(p.x * c.width, p.y * c.height);
                  ctx.lineTo(q.x * c.width, q.y * c.height);
                  ctx.stroke();
                }
              }
              const ids = [...new Set(pairs.flat())];
              ids.forEach((id) => {
                const p = frame.points[id];
                if (!usableLandmark(p)) return;
                ctx.beginPath();
                ctx.arc(
                  p.x * c.width,
                  p.y * c.height,
                  scan ? Math.max(4, c.width / 150) : 6,
                  0,
                  Math.PI * 2,
                );
                ctx.fillStyle = scan ? "#effff4" : "#fff4c4";
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
  }, [tracking.video, arm, exercise, scan]);
  return (
    <div
      className={"camera-feed " + (scan ? "scan-camera-feed" : "")}
      style={{
        aspectRatio: `${tracking.video.current?.videoWidth || 640}/${tracking.video.current?.videoHeight || 480}`,
      }}
    >
      <canvas
        ref={canvas}
        width={640}
        height={480}
        aria-label={
          scan
            ? "Live MediaPipe landmark scan from the camera"
            : "Live mirrored camera preview with selected arm landmarks"
        }
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
              <span className="panel-game-glyph">
                <GameGlyph exercise={exercise} />
              </span>
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
                      {exercise === "ship" ? (
                        <ArrowLeft size={16} />
                      ) : (
                        <ArrowUp size={16} />
                      )}
                    </kbd>
                    <kbd>
                      {exercise === "ship" ? (
                        <ArrowRight size={16} />
                      ) : (
                        <ArrowDown size={16} />
                      )}
                    </kbd>
                  </div>
                </div>
                <h3>
                  {exercise === "ship"
                    ? "Ahoy, little captain!"
                    : exercise === "grip"
                      ? "Open. Close. Bloom!"
                      : "Your little magic move."}
                </h3>
                <p>
                  {exercise === "ship"
                    ? "Use ← → or slide left and right. Your little ship follows you."
                    : "Use your arrow keys, or move the slider. Luma follows you."}
                </p>
                <label
                  className={
                    "demo-slider " + (exercise === "ship" ? "ship-slider" : "")
                  }
                >
                  <span>
                    {exercise === "ship"
                      ? "Left island"
                      : exercise === "wrist"
                        ? "Lift the butterfly"
                        : exercise === "grip"
                          ? "Open the flower"
                          : "Fly higher"}{" "}
                    {exercise === "ship" ? (
                      <ArrowLeft size={14} />
                    ) : (
                      <ArrowUp size={14} />
                    )}
                  </span>
                  <input
                    type="range"
                    aria-label={
                      exercise === "ship"
                        ? "Demo ship steering"
                        : exercise === "wrist"
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
                    {exercise === "ship"
                      ? "Right island"
                      : exercise === "wrist"
                        ? "Come softly back"
                        : exercise === "grip"
                          ? "Close softly"
                          : "Fly lower"}{" "}
                    {exercise === "ship" ? (
                      <ArrowRight size={14} />
                    ) : (
                      <ArrowDown size={14} />
                    )}
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
                  {exercise === "ship"
                    ? "Elbow in view · turn your forearm like a wheel"
                    : exercise === "wrist"
                      ? "Rest your forearm · show your elbow and hand"
                      : exercise === "grip"
                        ? "One playing hand · palm to camera"
                        : exercise === "reach"
                          ? (arm === "left" ? "Left" : "Right") +
                            " arm only · elbow and hand in view"
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
