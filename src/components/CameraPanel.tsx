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
import {
  createOverlayState,
  drawPoseOverlay,
  type OverlayGuide,
} from "./poseOverlay";
import type { Tracking } from "../movement/useTracking";
import type { Session } from "../game/session";
export function CameraFeed({
  tracking,
  arm,
  sourceLabel,
  exercise = "elbow",
  scan = false,
  guide,
  reduced = false,
}: {
  tracking: Tracking;
  arm: "left" | "right";
  sourceLabel?: string;
  exercise?: Exercise;
  scan?: boolean;
  /** Live game guide (current input, next target, hold progress). */
  guide?: () => OverlayGuide | null;
  reduced?: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(tracking.frame);
  frameRef.current = tracking.frame;
  const guideRef = useRef(guide);
  guideRef.current = guide;
  useEffect(() => {
    let id = 0,
      lastDraw = -100;
    const state = createOverlayState();
    const draw = () => {
      const now = performance.now();
      if (now - lastDraw < 1000 / 50) {
        id = requestAnimationFrame(draw);
        return;
      }
      lastDraw = now;
      const c = canvas.current,
        vid = tracking.video.current;
      if (c) {
        const ctx = c.getContext("2d");
        if (ctx && vid && vid.readyState >= 2) {
          if (c.width !== vid.videoWidth || c.height !== vid.videoHeight) {
            c.width = vid.videoWidth;
            c.height = vid.videoHeight;
          }
          const frame = frameRef.current;
          drawPoseOverlay(ctx, vid, frame, {
            exercise,
            arm,
            scan,
            reduced,
            now,
            state,
            guide: guideRef.current?.() ?? null,
            fresh:
              now - frame.at < FRAME_MAX_AGE_MS &&
              (frame.valid || (frame.pointsValid ?? false)),
          });
        } else if (ctx) ctx.clearRect(0, 0, c.width, c.height);
      }
      id = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(id);
  }, [tracking.video, arm, exercise, scan, reduced]);
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
  range,
  reduced = false,
}: {
  range?: { lower: number; upper: number };
  reduced?: boolean;
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
                <CameraFeed
                  tracking={tracking}
                  arm={arm}
                  exercise={exercise}
                  reduced={reduced}
                  guide={() => {
                    const w = session.world.current;
                    const live = w.phase === "playing" || w.phase === "practice";
                    return live
                      ? {
                          value: w.position,
                          goal: w.phase === "playing" ? (w.goal ?? null) : null,
                          dwell: w.dwell ?? 0,
                          range,
                        }
                      : null;
                  }}
                />
                <div
                  className={
                    "tracking-label " + (tracking.frame.valid ? "valid" : "")
                  }
                >
                  <i />
                  {tracking.frame.message}
                </div>
                <p className="which-hand">
                  {exercise === "grip" ? (
                    <>
                      <strong>Use one hand</strong> · left or right, palm to the
                      camera
                    </>
                  ) : (
                    <>
                      <strong>
                        Your {(tracking.frame.arm ?? arm).toUpperCase()}{" "}
                        {exercise === "wrist" ? "hand" : "arm"}
                      </strong>{" "}
                      ·{" "}
                      {exercise === "ship"
                        ? "elbow still, turn the forearm"
                        : exercise === "wrist"
                          ? "side-on, little finger to the camera"
                          : "side-on, shoulder to hand in view"}
                    </>
                  )}
                </p>
                <p className="small">Keep it inside the picture, near the middle.</p>
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
