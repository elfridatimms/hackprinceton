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
import {FRAME_MAX_AGE_MS} from "../movement/calibration";
import { usableLandmark } from "../movement/core";
import type { Tracking } from "../movement/useTracking";
import type { Session } from "../game/session";
export function CameraFeed({
  tracking,
  arm,
  sourceLabel,
}: {
  tracking: Tracking;
  arm: "left" | "right";
  sourceLabel?:string;
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
            const ids = arm === "left" ? [11, 13, 15] : [12, 14, 16];
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
              ctx.strokeStyle = "#416d58";
              ctx.lineWidth = 2;
              ctx.stroke();
            });
          }
        }
      }
      id = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(id);
  }, [tracking.video, arm]);
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
        <i /> {sourceLabel??(tracking.status==='on'?'Live camera':tracking.status==='loading'?'Starting camera…':'Camera off')}
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
}: {
  session: Session;
  tracking: Tracking;
  arm: "left" | "right";
  collapsed: boolean;
  setCollapsed: (n: boolean) => void;
  onCameraOff: () => void;
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
                <h3>A little lift. A little lower.</h3>
                <p>
                  Use your arrow keys, or move the slider. Luma follows you.
                </p>
                <label className="demo-slider">
                  <span>
                    Fly higher <ArrowUp size={14} />
                  </span>
                  <input
                    type="range"
                    aria-label="Demo flight height"
                    min="0"
                    max="1"
                    step="0.01"
                    value={session.control.current}
                    onChange={(e) => {
                      session.control.current = +e.target.value;
                    }}
                  />
                  <span>
                    Fly lower <ArrowDown size={14} />
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
                <CameraFeed tracking={tracking} arm={arm} />
                <div
                  className={
                    "tracking-label " + (tracking.frame.valid ? "valid" : "")
                  }
                >
                  <i />
                  {tracking.frame.message}
                </div>
                <p className="small">
                  {arm === "left" ? "Left" : "Right"} arm · Side-on view
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
