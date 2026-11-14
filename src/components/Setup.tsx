import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Camera,
  Check,
  ChevronLeft,
  ShieldCheck,
  X,
  LoaderCircle,
  Sparkles,
  Hand,
  ChevronDown,
} from "lucide-react";
import { validRange } from "../movement/core";
import {
  calibratedRange,
  calibrationEstimate,
  FRAME_MAX_AGE_MS,
  CALIBRATION_WINDOW_MS,
} from "../movement/calibration";
import {
  exercises,
  movementValue,
  reachRange,
  validReachRange,
  gripRange,
  validGripRange,
  type Exercise,
} from "../movement/exercises";
import type { Settings, Session } from "../game/session";
import type { Tracking } from "../movement/useTracking";
import { MovementGuide } from "./MovementGuide";
import { Portrait } from "./Illustrations";
import { CameraFeed } from "./CameraPanel";
import { CameraDiagnostics } from "./CameraDiagnostics";
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
    [now, setNow] = useState(() => performance.now()),
    [manual, setManual] = useState(false),
    [manualLower, setManualLower] = useState(
      settings.exercise === "grip"
        ? settings.gripLower
        : settings.exercise === "reach"
          ? settings.reachLower
          : settings.lower,
    ),
    [manualUpper, setManualUpper] = useState(
      settings.exercise === "grip"
        ? settings.gripUpper
        : settings.exercise === "reach"
          ? settings.reachUpper
          : settings.upper,
    );
  const samples = useRef<{ angle: number; at: number }[]>([]);
  const reach = settings.exercise === "reach";
  const grip = settings.exercise === "grip";
  const exercise = exercises[settings.exercise];
  const value = movementValue(tracking.frame, settings.exercise);
  const stage = session.phase === "calibration" ? 2 : step;
  useEffect(() => {
    const timer = setInterval(() => setNow(performance.now()), 100);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (tracking.frame.valid && value !== null)
      samples.current.push({ angle: value, at: tracking.frame.at });
    samples.current = samples.current.filter(
      (s) => performance.now() - s.at <= CALIBRATION_WINDOW_MS,
    );
    setNow(performance.now());
  }, [tracking.frame, value]);
  const fresh =
    tracking.status === "on" &&
    tracking.frame.valid &&
    value !== null &&
    now - tracking.frame.at < FRAME_MAX_AGE_MS;
  const estimate = calibrationEstimate(
    samples.current,
    now,
    grip
      ? { min: 0, max: 5, spread: 0.16, precision: 1000 }
      : reach
        ? { min: -4, max: 4, spread: 0.1, precision: 1000 }
        : undefined,
  );
  const stable = fresh ? estimate.angle : null;
  const resetHold = () => {
    samples.current = [];
    setNow(performance.now());
  };
  const chooseArm = (arm: Settings["arm"]) => {
    setSettings({ ...settings, arm });
    setLower(null);
    setEndpoint("lower");
    setCaptureError("");
    resetHold();
  };
  const chooseExercise = (next: Exercise) => {
    setSettings({ ...settings, exercise: next });
    setManualLower(
      next === "grip"
        ? settings.gripLower
        : next === "reach"
          ? settings.reachLower
          : settings.lower,
    );
    setManualUpper(
      next === "grip"
        ? settings.gripUpper
        : next === "reach"
          ? settings.reachUpper
          : settings.upper,
    );
    setLower(null);
    setEndpoint("lower");
    setCaptureError("");
    resetHold();
  };
  const finishRange = (low: number, high: number) => {
    setSettings(
      grip
        ? { ...settings, gripLower: low, gripUpper: high }
        : reach
          ? { ...settings, reachLower: low, reachUpper: high }
          : { ...settings, lower: low, upper: high },
    );
    session.reset("practice");
  };
  const capture = () => {
    if (
      stable === null ||
      !fresh ||
      performance.now() - tracking.frame.at > FRAME_MAX_AGE_MS
    )
      return;
    if (endpoint === "lower") {
      setLower(stable);
      setEndpoint("upper");
      resetHold();
      setCaptureError("");
    } else {
      const range =
        lower === null
          ? null
          : grip
            ? gripRange(lower, stable)
            : reach
              ? reachRange(lower, stable)
              : calibratedRange(lower, stable);
      if (range) finishRange(range.lower, range.upper);
      else
        setCaptureError(
          "Those two spots are very close. Try your cozy spot again, or ask a grown-up to help. Stay comfortable.",
        );
    }
  };
  const armPicker = (
    <div
      className="arm-choice compact-arm-choice"
      role="group"
      aria-label="Arm to calibrate"
    >
      {(["left", "right"] as const).map((arm) => (
        <button
          key={arm}
          className={settings.arm === arm ? "selected" : ""}
          onClick={() => chooseArm(arm)}
        >
          <Hand size={14} />
          {arm === "left" ? "Left" : "Right"} hand{" "}
          {settings.arm === arm && <Check size={14} />}
        </button>
      ))}
    </div>
  );
  const manualValid = grip
    ? validGripRange(manualLower, manualUpper)
    : reach
      ? validReachRange(manualLower, manualUpper)
      : validRange(manualLower, manualUpper);
  return (
    <div className="modal-backdrop setup-backdrop">
      <section
        className="modal setup-modal child-setup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="setup-title"
      >
        <div className="modal-top">
          <span className="setup-brand">
            <Portrait /> Luma’s little forest school
          </span>
          <button
            className="icon-button"
            aria-label="Close setup"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        <div className="setup-steps child-steps">
          {["Pick your magic", "Say hello", "Find your spots"].map(
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
            <h2 id="setup-title">Let’s wake a sleepy flower!</h2>
            <p>Open your hand. Watch a little flower say hello.</p>
            <div className="flower-mission-badge">
              <span>✿</span>
              <div>
                <strong>A tiny flower needs your magic.</strong>
                <small>Soft hands. Happy petals.</small>
              </div>
            </div>
            <div className="watch-luma">
              <span className="watch-badge">
                <Sparkles size={12} /> Watch, then try!
              </span>
              <MovementGuide exercise={settings.exercise} />
              <div className="movement-steps">
                <span>
                  <b>1</b>
                  {grip
                    ? "Open your hand"
                    : reach
                      ? "Reach for the light"
                      : "Give Luma a lift"}
                </span>
                <i>↝</i>
                <span>
                  <b>2</b>
                  {grip ? "Close it softly" : "Come softly back"}
                </span>
              </div>
            </div>
            <p className="child-reassurance">
              {grip
                ? "No squeezing. A little wiggle is wonderful."
                : "Tiny movements count. You never have to reach far."}
            </p>
            <details className="grownup-fold">
              <summary>
                Grown-up: movement options <ChevronDown size={13} />
              </summary>{" "}
              <div
                className="exercise-choices"
                role="group"
                aria-label="Choose your movement game"
              >
                {(["grip", "reach", "elbow"] as const).map((item) => (
                  <button
                    key={item}
                    className={
                      settings.exercise === item
                        ? "exercise-choice selected"
                        : "exercise-choice"
                    }
                    onClick={() => chooseExercise(item)}
                  >
                    <span className={"exercise-choice-art " + item}>
                      {item === "reach" ? <Hand size={26} /> : <Portrait />}
                      <i>✦</i>
                    </span>
                    <strong>{exercises[item].title}</strong>
                    <small>{exercises[item].short}</small>
                    <span className="choice-check">
                      {settings.exercise === item ? <Check size={13} /> : null}
                    </span>
                  </button>
                ))}
              </div>
              {!grip && armPicker}
              <p>
                Use comfortable movement agreed with the treating professional.{" "}
                {exercise.camera}
              </p>
            </details>
            <button
              className="button primary full"
              onClick={() => {
                setStep(1);
                void tracking.start();
              }}
            >
              <Camera size={18} /> Let’s try it together{" "}
              <ArrowRight size={17} />
            </button>
            <button className="text-button centered" onClick={onDemo}>
              Play with buttons instead
            </button>
            <div className="privacy-inline">
              <ShieldCheck size={13} /> Your camera stays on this device.
            </div>
          </>
        ) : stage === 1 ? (
          <>
            <h2 id="setup-title">Hello, little light keeper!</h2>
            <p>
              {grip
                ? "Show one hand, with your palm facing the camera."
                : reach
                  ? "Sit facing the camera. Give us a little wave."
                  : "Sit a little sideways. Let the camera see your arm."}
            </p>
            <div className="setup-camera">
              {tracking.video.current?.srcObject ? (
                <CameraFeed
                  tracking={tracking}
                  arm={settings.arm}
                  exercise={settings.exercise}
                />
              ) : (
                <div className="camera-loading">
                  {tracking.status === "loading" ? (
                    <LoaderCircle className="spin" size={31} />
                  ) : (
                    <Camera size={35} />
                  )}
                  <p>
                    {tracking.status === "loading"
                      ? "Waking up the forest camera…"
                      : "Let’s find a way to play."}
                  </p>
                </div>
              )}
            </div>
            <div className={"hello-status " + (fresh ? "found" : "")}>
              <span>{fresh ? "✦" : "◌"}</span>
              <div>
                <strong>
                  {fresh ? "There you are!" : "Luma is looking for your hand…"}
                </strong>
                <small>
                  {fresh
                    ? "We’re ready for your little magic move."
                    : tracking.status === "loading"
                      ? "Getting the camera ready…"
                      : tracking.frame.message}
                </small>
              </div>
            </div>
            {!grip && armPicker}
            {tracking.error && (
              <div className="error-message">
                {tracking.error}
                <button onClick={() => void tracking.start()}>
                  Try the camera again
                </button>
              </div>
            )}
            <button
              className="button primary full"
              disabled={!fresh}
              onClick={() => {
                resetHold();
                session.transition("calibration");
              }}
            >
              That’s me! <ArrowRight size={17} />
            </button>
            <button className="text-button centered" onClick={onDemo}>
              Play with buttons instead
            </button>
          </>
        ) : (
          <>
            <div className="little-mission">
              <span>{endpoint === "lower" ? "1" : "2"}</span>
              <div>
                <small>YOUR TWO LITTLE MAGIC SPOTS</small>
                <h2 id="setup-title">
                  {grip
                    ? endpoint === "lower"
                      ? "A soft, sleepy hand."
                      : "Let your flower say hello!"
                    : endpoint === "lower"
                      ? "Find your cozy spot."
                      : "Reach for a little light."}
                </h2>
              </div>
            </div>
            <p>
              {grip
                ? endpoint === "lower"
                  ? "Close your fingers gently, like a cozy little fist. No squeezing."
                  : "Open your fingers, just as much as feels comfy."
                : endpoint === "lower"
                  ? "Rest your hand where it feels comfy. Hold it for a little moment."
                  : reach
                    ? "Lift your hand just a little. Stop wherever feels comfy."
                    : "Bend your arm just a little. Stop wherever feels comfy."}
            </p>
            <div className="child-calibration-visual">
              <div className="calibration-camera">
                <CameraFeed
                  tracking={tracking}
                  arm={settings.arm}
                  exercise={settings.exercise}
                />
              </div>
              <div className="calibration-demonstration">
                <MovementGuide
                  exercise={settings.exercise}
                  direction={endpoint === "lower" ? "low" : "high"}
                  compact
                />
                <span>
                  {grip
                    ? endpoint === "lower"
                      ? "Softly closed"
                      : "Gently open"
                    : endpoint === "lower"
                      ? "A cozy place to start"
                      : "A little lift is enough"}
                </span>
              </div>
            </div>
            <div className="spot-progress">
              <div className={lower !== null ? "spot saved" : "spot active"}>
                <span>
                  {lower !== null ? <Check size={14} /> : <Hand size={15} />}
                </span>
                {grip ? "Sleepy hand" : "Cozy spot"}
              </div>
              <i />
              <div className={endpoint === "upper" ? "spot active" : "spot"}>
                <span>✦</span>
                {grip ? "Hello, flower!" : "Little light"}
              </div>
            </div>
            {captureError && fresh && (
              <p className="error-message">{captureError}</p>
            )}
            <div className="stable-status">
              <i className={stable !== null ? "valid-dot" : ""} />
              {!fresh
                ? tracking.status === "on"
                  ? tracking.frame.message
                  : "Let’s wake up the camera again."
                : stable !== null
                  ? "Lovely! Let’s remember this little spot."
                  : "Stay like a sleepy statue for a moment…"}
            </div>
            <div
              className="hold-progress"
              role="progressbar"
              aria-label="Steady position"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round((fresh ? estimate.progress : 0) * 100)}
            >
              <span
                style={{ width: `${(fresh ? estimate.progress : 0) * 100}%` }}
              />
            </div>
            <button
              className="button primary full"
              aria-label="Remember this position"
              disabled={stable === null || !fresh}
              onClick={capture}
            >
              {grip
                ? endpoint === "lower"
                  ? "That’s my sleepy hand"
                  : "Let’s wake the flowers!"
                : endpoint === "lower"
                  ? "Save my cozy spot"
                  : "Let’s help Luma!"}{" "}
              {endpoint === "lower" ? (
                <Check size={17} />
              ) : (
                <Sparkles size={17} />
              )}
            </button>
            {endpoint === "upper" && (
              <button
                className="text-button centered"
                onClick={() => {
                  setEndpoint("lower");
                  setLower(null);
                  setCaptureError("");
                  resetHold();
                }}
              >
                <ChevronLeft size={14} /> Try the first spot again
              </button>
            )}
            <p className="child-reassurance">
              Little is lovely. You can rest anytime.
            </p>
            <details
              className="calibration-help grownup-fold"
              open={manual}
              onToggle={(e) => setManual(e.currentTarget.open)}
            >
              <summary>Grown-up help & movement range</summary>
              {!grip && armPicker}
              <p>
                {exercise.camera} Use limits agreed with the treating
                professional. Camera estimates are not validated clinical
                measurements.
              </p>
              <div className="manual-range">
                <label>
                  {grip
                    ? "Softly closed level"
                    : reach
                      ? "Resting hand level"
                      : "Extended position"}
                  <input
                    type="number"
                    min={grip ? 0 : reach ? -4 : 15}
                    max={grip ? 5 : reach ? 4 : 180}
                    step={grip || reach ? 0.05 : 1}
                    value={manualLower}
                    onChange={(e) => setManualLower(+e.target.value)}
                  />
                </label>
                <label>
                  {grip
                    ? "Comfortably open level"
                    : reach
                      ? "Raised hand level"
                      : "Bent position"}
                  <input
                    type="number"
                    min={grip ? 0 : reach ? -4 : 10}
                    max={grip ? 5 : reach ? 4 : 175}
                    step={grip || reach ? 0.05 : 1}
                    value={manualUpper}
                    onChange={(e) => setManualUpper(+e.target.value)}
                  />
                </label>
              </div>
              <p className="small">
                {grip
                  ? "Levels are fingertip distance relative to palm size. Keep the same hand visible."
                  : reach
                    ? "Levels are relative to shoulder width. Both shoulders and the selected wrist must be visible."
                    : "Angles use 180° for extension and smaller values for bending."}
                {lower !== null &&
                  ` First captured spot: ${lower.toFixed(grip || reach ? 2 : 1)}${grip || reach ? "" : "°"}.`}
              </p>
              {!manualValid && (
                <p className="error-message">
                  {grip
                    ? "The open level must be at least 0.2 above the closed level."
                    : reach
                      ? "The raised level must be at least 0.12 above the resting level."
                      : "The extended angle must be at least 5° larger than the bent angle."}
                </p>
              )}
              <button
                className="button secondary full"
                disabled={!fresh || !manualValid}
                onClick={() => finishRange(manualLower, manualUpper)}
              >
                Use this range and practice <ArrowRight size={15} />
              </button>
            </details>
            <button className="text-button centered" onClick={onDemo}>
              Play with buttons instead
            </button>
          </>
        )}
        {stage > 0 && (
          <CameraDiagnostics
            tracking={tracking}
            onRestart={() => {
              setLower(null);
              setEndpoint("lower");
              setCaptureError("");
              resetHold();
              void tracking.start();
            }}
          />
        )}
      </section>
    </div>
  );
}
