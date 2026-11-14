import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Camera,
  Check,
  ChevronLeft,
  ShieldCheck,
  X,
  LoaderCircle,
} from "lucide-react";
import { estimateEndpoint, validRange } from "../movement/core";
import type { Settings, Session } from "../game/session";
import type { Tracking } from "../movement/useTracking";
import { SeatIllustration } from "./Illustrations";
import { CameraFeed } from "./CameraPanel";
export function Setup({
  session,
  settings,
  setSettings,
  tracking,
  onClose,
  onDemo,
}: {
  session: Session;
  settings: Settings;
  setSettings: (s: Settings) => void;
  tracking: Tracking;
  onClose: () => void;
  onDemo: () => void;
}) {
  const [step, setStep] = useState(0),
    [endpoint, setEndpoint] = useState<"lower" | "upper">("lower"),
    [lower, setLower] = useState<number | null>(null),
    [captureError, setCaptureError] = useState(""),
    [stable, setStable] = useState<number | null>(null);
  const samples = useRef<{ angle: number; at: number }[]>([]);
  useEffect(() => {
    if (tracking.frame.valid && tracking.frame.angle !== null) {
      samples.current.push({
        angle: tracking.frame.angle,
        at: tracking.frame.at,
      });
      samples.current = samples.current.filter(
        (s) => tracking.frame.at - s.at < 1400,
      );
      setStable(estimateEndpoint(samples.current, tracking.frame.at));
    } else {
      samples.current = [];
      setStable(null);
    }
  }, [tracking.frame]);
  const capture = () => {
    if (
      stable === null ||
      !tracking.frame.valid ||
      performance.now() - tracking.frame.at > 300
    )
      return;
    if (endpoint === "lower") {
      setLower(stable);
      setEndpoint("upper");
      samples.current = [];
      setStable(null);
      setCaptureError("");
    } else if (lower !== null && validRange(lower, stable)) {
      setSettings({ ...settings, lower, upper: stable });
      session.reset("practice");
    } else
      setCaptureError(
        "Let’s try a slightly different comfortable position. We need at least 5° between the two endpoints.",
      );
  };
  const calibration = session.phase === "calibration";
  const stage = calibration ? 2 : step;
  return (
    <div className="modal-backdrop setup-backdrop">
      <section
        className="modal setup-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="setup-title"
      >
        <div className="modal-top">
          <span className="eyebrow">A SMALL START TO SOMETHING MAGICAL</span>
          <button
            className="icon-button"
            aria-label="Close setup"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        <div className="setup-steps">
          {["Get comfortable", "Check the view", "Your movement"].map(
            (label, i) => (
              <div
                key={label}
                className={i === stage ? "current" : i < stage ? "done" : ""}
              >
                <span>{i < stage ? <Check size={12} /> : i + 1}</span>
                {label}
              </div>
            ),
          )}
        </div>
        {stage === 0 ? (
          <>
            <div className="setup-art">
              <SeatIllustration />
              <span className="art-badge">
                Your pace. Your little adventure.
              </span>
            </div>
            <h2 id="setup-title">Let’s get comfortable.</h2>
            <p>
              Sit in a comfy seat. Place the camera to your side so it can see
              your shoulder, elbow, and wrist as you bend your arm.
            </p>
            <div
              className="arm-choice"
              role="group"
              aria-label="Choose your arm"
            >
              {(["left", "right"] as const).map((arm) => (
                <button
                  key={arm}
                  className={settings.arm === arm ? "selected" : ""}
                  onClick={() => setSettings({ ...settings, arm })}
                >
                  {arm === "left" ? "Left" : "Right"} arm{" "}
                  {settings.arm === arm && <Check size={16} />}
                </button>
              ))}
            </div>
            <button
              className="button primary full"
              onClick={() => {
                setStep(1);
                void tracking.start();
              }}
            >
              <Camera size={18} /> Turn on my camera <ArrowRight size={17} />
            </button>
            <div className="privacy-inline">
              <ShieldCheck size={14} /> Your video stays on your device. Always.
            </div>
          </>
        ) : stage === 1 ? (
          <>
            <div className="setup-camera">
              {tracking.status === "on" ? (
                <CameraFeed tracking={tracking} arm={settings.arm} />
              ) : (
                <div className="camera-loading">
                  {tracking.status === "loading" ? (
                    <LoaderCircle className="spin" size={32} />
                  ) : (
                    <Camera size={36} />
                  )}
                  <p>
                    {tracking.status === "loading"
                      ? "Getting the camera ready…"
                      : "Let’s find another way in."}
                  </p>
                </div>
              )}
            </div>
            <h2 id="setup-title">A little side-on view.</h2>
            <p className="view-status">
              <i className={tracking.frame.valid ? "valid-dot" : ""} />
              {tracking.status === "loading"
                ? "Loading the movement model…"
                : tracking.frame.message}
            </p>
            {tracking.error ? (
              <div className="error-message">
                {tracking.error}
                <button onClick={() => void tracking.start()}>
                  Try the camera again
                </button>
              </div>
            ) : (
              <p>
                Keep all three arm points in view. A little space around your
                arm helps.
              </p>
            )}
            <button
              className="button primary full"
              disabled={!tracking.frame.valid || tracking.status !== "on"}
              onClick={() => {
                samples.current = [];
                setStable(null);
                session.transition("calibration");
              }}
            >
              That’s my arm <ArrowRight size={17} />
            </button>
            <button className="text-button centered" onClick={onDemo}>
              Try without a camera instead
            </button>
          </>
        ) : (
          <>
            <div className="calibration-art">
              <SeatIllustration />
              <div className="angle-display">
                <strong>
                  {tracking.frame.valid && tracking.frame.angle !== null
                    ? Math.round(tracking.frame.angle) + "°"
                    : "—"}
                </strong>
                <span>projected angle</span>
              </div>
            </div>
            <span className="little-label">
              {endpoint === "lower" ? "POSITION 1 OF 2" : "POSITION 2 OF 2"}
            </span>
            <h2 id="setup-title">
              {endpoint === "lower"
                ? "Your comfortable low."
                : "Your comfortable high."}
            </h2>
            <p>
              {endpoint === "lower"
                ? "Gently lower your hand to a comfortable position and hold for a moment."
                : "Bend your elbow to a comfortable position. Hold it still for a moment."}
            </p>
            <p className="calibration-note">
              Stay within the movement agreed with your therapist. Small
              movements can take Luma all the way.
            </p>
            {captureError && <p className="error-message">{captureError}</p>}
            <div className="stable-status">
              <i className={stable !== null ? "valid-dot" : ""} />
              {!tracking.frame.valid
                ? "Keep your shoulder, elbow, and wrist in view."
                : stable !== null
                  ? "Lovely. Ready to remember this position."
                  : "Hold gently while we find a steady position…"}
            </div>
            <button
              className="button primary full"
              disabled={stable === null || !tracking.frame.valid}
              onClick={capture}
            >
              Remember this position <Check size={17} />
            </button>
            {endpoint === "upper" && (
              <button
                className="text-button centered"
                onClick={() => {
                  setEndpoint("lower");
                  setLower(null);
                  samples.current = [];
                  setStable(null);
                }}
              >
                <ChevronLeft size={14} /> Try the first position again
              </button>
            )}
          </>
        )}
      </section>
    </div>
  );
}
