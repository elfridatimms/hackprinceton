import { PlayAlong } from "./PlayAlong";
import { childInstructions } from "../movement/instructions";
import { PersonalTune } from "./PersonalTune";
import { TrackingScan } from "./TrackingScan";
import type { PersonalProfile } from "../movement/personalization";
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
import { clamp, validRange } from "../movement/core";
import {
  calibratedRange,
  calibrationEstimate,
  FRAME_MAX_AGE_MS,
  CALIBRATION_WINDOW_MS,
  AUTO_SPOT_HOLD_MS,
  AUTO_SPOT_WINDOW_MS,
  AUTO_SPOT_PREPARE_MS,
} from "../movement/calibration";
import {
  exercises,
  exerciseOrder,
  getMovementRange,
  applyMovementRange,
  validMovementRange,
  movementRange,
  movementLimits,
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
import { GameGlyph } from "./GameTabs";
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
    [manualLower, setManualLower] = useState(getMovementRange(settings).lower),
    [manualUpper, setManualUpper] = useState(getMovementRange(settings).upper);
  const samples = useRef<{ angle: number; raw: number; at: number }[]>([]);
  const holds = useRef<number[][]>([]);
  const autoReadyAt = useRef(performance.now() + AUTO_SPOT_PREPARE_MS);
  const [tuning, setTuning] = useState<{ lower: number; upper: number } | null>(
    null,
  );
  const reach = settings.exercise === "reach";
  const grip = settings.exercise === "grip";
  const wrist = settings.exercise === "wrist";
  const ship = settings.exercise === "ship";
  const handMode = grip || wrist || ship;
  const exercise = exercises[settings.exercise];
  const instruction = childInstructions[settings.exercise];
  const value = movementValue(tracking.frame, settings.exercise);
  const stage = tuning ? 3 : session.phase === "calibration" ? 2 : step;
  useEffect(() => {
    const timer = setInterval(() => setNow(performance.now()), 100);
    return () => clearInterval(timer);
  }, []);
  const eligible =
    endpoint === "lower" ||
    (lower !== null &&
      value !== null &&
      !!movementRange(settings.exercise, lower, value));
  useEffect(() => {
    const f = tracking.frame;
    if (
      stage !== 2 ||
      manual ||
      !eligible ||
      !f.valid ||
      value === null ||
      f.at < autoReadyAt.current ||
      performance.now() - f.at > FRAME_MAX_AGE_MS
    ) {
      samples.current = [];
    } else if (samples.current.at(-1)?.at !== f.at) {
      samples.current.push({
        angle: value,
        raw: f.rawValue ?? value,
        at: f.at,
      });
    }
    samples.current = samples.current.filter(
      (s) => performance.now() - s.at <= AUTO_SPOT_WINDOW_MS,
    );
    setNow(performance.now());
  }, [tracking.frame, value, eligible, stage, manual]);
  const clockNow = Math.max(now, performance.now());
  const fresh =
    tracking.status === "on" &&
    tracking.frame.valid &&
    value !== null &&
    clockNow >= tracking.frame.at &&
    clockNow - tracking.frame.at < FRAME_MAX_AGE_MS;
  const estimate = calibrationEstimate(samples.current, now, {
    ...movementLimits[settings.exercise],
    holdMs: AUTO_SPOT_HOLD_MS,
    windowMs: AUTO_SPOT_WINDOW_MS,
  });
  const stable = fresh ? estimate.angle : null;
  const resetHold = () => {
    samples.current = [];
    autoReadyAt.current = performance.now() + AUTO_SPOT_PREPARE_MS;
    setNow(performance.now());
  };
  useEffect(() => {
    resetHold();
  }, [stage, endpoint, settings.exercise, settings.arm]);
  const chooseArm = (arm: Settings["arm"]) => {
    setSettings({ ...settings, arm });
    holds.current = [];
    setTuning(null);
    setLower(null);
    setEndpoint("lower");
    setCaptureError("");
    resetHold();
  };
  const chooseExercise = (next: Exercise) => {
    const nextSettings = { ...settings, exercise: next };
    setSettings(nextSettings);
    const range = getMovementRange(nextSettings);
    setManualLower(range.lower);
    setManualUpper(range.upper);
    holds.current = [];
    setTuning(null);
    setLower(null);
    setEndpoint("lower");
    setCaptureError("");
    resetHold();
  };
  const finishRange = (low: number, high: number) => {
    setTuning({ lower: low, upper: high });
  };
  const completeScan = (profile: PersonalProfile | null) => {
    if (!tuning) return;
    const range = profile ?? tuning;
    setSettings({
      ...applyMovementRange(settings, range.lower, range.upper),
      personalization: profile,
      smoothing: profile?.smoothing ?? settings.smoothing,
    });
    session.reset("practice");
  };
  const capture = () => {
    if (
      stable === null ||
      !fresh ||
      performance.now() - tracking.frame.at > FRAME_MAX_AGE_MS
    )
      return;
    const rawHold = samples.current
      .filter((s) => performance.now() - s.at <= AUTO_SPOT_WINDOW_MS)
      .map((s) => s.raw);
    if (endpoint === "lower") {
      holds.current = [rawHold];
      setLower(stable);
      setEndpoint("upper");
      resetHold();
      setCaptureError("");
    } else {
      const range =
        lower === null ? null : movementRange(settings.exercise, lower, stable);
      if (range) {
        holds.current = [holds.current[0] ?? [], rawHold];
        finishRange(range.lower, range.upper);
      } else
        setCaptureError(
          "Those two spots are very close. Try your cozy spot again, or ask a grown-up to help. Stay comfortable.",
        );
    }
  };
  useEffect(() => {
    if (
      stage === 2 &&
      !manual &&
      eligible &&
      fresh &&
      stable !== null &&
      now >= autoReadyAt.current
    )
      capture();
  }, [
    stage,
    endpoint,
    manual,
    eligible,
    fresh,
    stable,
    now,
    tracking.frame.at,
  ]);
  const previewRange = getMovementRange(settings);
  const previewPosition =
    fresh && value !== null
      ? clamp(
          (value - previewRange.lower) /
            (previewRange.upper - previewRange.lower),
        )
      : null;
  const preparing = now < autoReadyAt.current;
  const autoProgress =
    fresh && eligible && !manual && !preparing ? estimate.progress : 0;
  const countdown = Math.max(1, Math.ceil((1 - autoProgress) * 3));
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
  const manualValid = validMovementRange(
    settings.exercise,
    manualLower,
    manualUpper,
  );
  return (
    <div className="modal-backdrop setup-backdrop">
      <section
        className={`modal setup-modal child-setup ${stage > 0 ? "scan-setup-modal" : ""}`}
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
          {["Watch", "Say hi!", "Copy me", "Play!"].map((label, i) => (
            <div
              key={label}
              className={i === stage ? "current" : i < stage ? "done" : ""}
            >
              <span>{i < stage ? <Check size={12} /> : i + 1}</span>
              {label}
            </div>
          ))}
        </div>
        {stage === 3 && tuning ? (
          <PersonalTune
            tracking={tracking}
            exercise={settings.exercise}
            arm={settings.arm}
            range={tuning}
            holds={holds.current}
            onComplete={completeScan}
            onRetry={() => {
              setTuning(null);
              holds.current = [];
              setLower(null);
              setEndpoint("lower");
              resetHold();
            }}
            onDemo={onDemo}
          />
        ) : stage === 0 ? (
          <>
            <h2 id="setup-title">
              {grip ? "Let’s wake a sleepy flower!" : exercise.title + "!"}
            </h2>
            <p>Watch first. Then it’s your turn.</p>
            <div className="watch-luma">
              <span className="watch-badge">
                <Sparkles size={12} /> Watch, then try!
              </span>
              <PlayAlong
                exercise={settings.exercise}
                direction="loop"
                position={null}
                watch
              />
              <div className="movement-steps">
                <span>
                  <b>1</b>
                  {ship
                    ? "Sail to the right"
                    : wrist
                      ? "Tilt your hand"
                      : grip
                        ? "Open your hand"
                        : reach
                          ? "Reach for the light"
                          : "Give Luma a lift"}
                </span>
                <i>↝</i>
                <span>
                  <b>2</b>
                  {ship
                    ? "Sail softly left"
                    : grip
                      ? "Close it softly"
                      : "Come softly back"}
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
                {exerciseOrder.map((item) => (
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
              {!handMode && armPicker}
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
            <span className="scan-eyebrow">
              <Sparkles size={13} /> LET’S MEET YOUR MAGIC
            </span>
            <h2 id="setup-title">Luma can see your little moves.</h2>
            <p>{instruction.camera}</p>
            <TrackingScan
              tracking={tracking}
              exercise={settings.exercise}
              arm={settings.arm}
            />
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
            {!handMode && armPicker}
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
              Find my comfy spots <ArrowRight size={17} />
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
                <small>COPY THIS LITTLE MOVE</small>
                <h2 id="setup-title">
                  {endpoint === "lower" ? instruction.low : instruction.high}
                </h2>
              </div>
            </div>
            <p>{instruction.tip}</p>
            <div className="child-calibration-visual visual-instructions">
              <PlayAlong
                exercise={settings.exercise}
                direction={endpoint === "lower" ? "low" : "high"}
                position={previewPosition}
              />
              <div className="calibration-camera">
                <TrackingScan
                  tracking={tracking}
                  exercise={settings.exercise}
                  arm={settings.arm}
                  compact
                />
              </div>
            </div>
            <div className="spot-progress">
              <div className={lower !== null ? "spot saved" : "spot active"}>
                <span>
                  {lower !== null ? <Check size={14} /> : <Hand size={15} />}
                </span>
                {ship
                  ? "Left island"
                  : wrist
                    ? "Resting spot"
                    : grip
                      ? "Sleepy hand"
                      : "Cozy spot"}
              </div>
              <i />
              <div className={endpoint === "upper" ? "spot active" : "spot"}>
                <span>✦</span>
                {ship
                  ? "Right island"
                  : wrist
                    ? "Little flutter"
                    : grip
                      ? "Hello, flower!"
                      : "Little light"}
              </div>
            </div>
            {captureError && fresh && (
              <p className="error-message">{captureError}</p>
            )}
            <div
              className={`auto-spot-save ${autoProgress > 0 ? "auto-holding" : ""}`}
              role="status"
              aria-live="polite"
            >
              <div className="auto-spot-count" aria-hidden="true">
                {!fresh || preparing || !eligible || manual ? (
                  <Hand size={23} />
                ) : (
                  countdown
                )}
              </div>
              <div>
                <strong>
                  {!fresh
                    ? "Let’s find your hand."
                    : manual
                      ? "Automatic saving is paused."
                      : preparing
                        ? endpoint === "upper"
                          ? "First one saved!"
                          : instruction.low
                        : !eligible
                          ? instruction.high
                          : "Hold still."}
                </strong>
                <span>
                  {!fresh
                    ? tracking.frame.message
                    : "Luma saves it for you. No buttons to press."}
                </span>
              </div>
            </div>
            <div
              className="hold-progress"
              role="progressbar"
              aria-label="Automatic position capture"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(autoProgress * 100)}
            >
              <span style={{ width: `${autoProgress * 100}%` }} />
            </div>
            {endpoint === "upper" && (
              <button
                className="text-button centered"
                onClick={() => {
                  setEndpoint("lower");
                  holds.current = [];
                  setTuning(null);
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
              onToggle={(e) => {
                setManual(e.currentTarget.open);
                resetHold();
              }}
            >
              <summary>Grown-up help & movement range</summary>
              {!handMode && armPicker}
              <p>
                {exercise.camera} Use limits agreed with the treating
                professional. Camera estimates are not validated clinical
                measurements.
              </p>
              <div className="manual-range">
                <label>
                  {ship
                    ? "Left steering lean"
                    : wrist
                      ? "Resting hand tilt"
                      : grip
                        ? "Softly closed level"
                        : reach
                          ? "Resting hand level"
                          : "Extended position"}
                  <input
                    type="number"
                    min={movementLimits[settings.exercise].min}
                    max={movementLimits[settings.exercise].max}
                    step={grip || reach ? 0.05 : 1}
                    value={manualLower}
                    onChange={(e) => setManualLower(+e.target.value)}
                  />
                </label>
                <label>
                  {ship
                    ? "Right steering lean"
                    : wrist
                      ? "Comfortably raised tilt"
                      : grip
                        ? "Comfortably open level"
                        : reach
                          ? "Raised hand level"
                          : "Bent position"}
                  <input
                    type="number"
                    min={movementLimits[settings.exercise].min}
                    max={movementLimits[settings.exercise].max}
                    step={grip || reach ? 0.05 : 1}
                    value={manualUpper}
                    onChange={(e) => setManualUpper(+e.target.value)}
                  />
                </label>
              </div>
              <p className="small">
                {ship
                  ? "Steering follows the palm direction in the mirrored picture. Left is negative; right is positive. Use the same hand with fingers pointing up."
                  : wrist
                    ? "Tilt is the 2D hand direction in the picture, not an isolated anatomical wrist angle."
                    : grip
                      ? "Levels are fingertip distance relative to palm size. Keep the same hand visible."
                      : reach
                        ? "Levels are relative to shoulder width. Both shoulders and the selected wrist must be visible."
                        : "Angles use 180° for extension and smaller values for bending."}
                {lower !== null &&
                  ` First captured spot: ${lower.toFixed(grip || reach ? 2 : 1)}${grip || reach ? "" : "°"}.`}
              </p>
              {!manualValid && (
                <p className="error-message">
                  {ship
                    ? "Use two comfortable steering spots at least 5° apart, from −75 to 75°."
                    : wrist
                      ? "The raised hand tilt must be at least 5° above the resting tilt."
                      : grip
                        ? "The open level must be at least 0.2 above the closed level."
                        : reach
                          ? "The raised level must be at least 0.12 above the resting level."
                          : "The extended angle must be at least 5° larger than the bent angle."}
                </p>
              )}
              <button
                className="button secondary full"
                disabled={!fresh || !manualValid}
                onClick={() => {
                  holds.current = [];
                  finishRange(manualLower, manualUpper);
                }}
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
              holds.current = [];
              setTuning(null);
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
