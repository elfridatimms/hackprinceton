import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { assessMovement } from "../movement/assessment";
import { QuickPracticeCapture } from "../movement/quickPractice";
import { childInstructions } from "../movement/instructions";
import { FRAME_MAX_AGE_MS } from "../movement/calibration";
import { movementValue, type Exercise } from "../movement/exercises";
import { clamp, type Arm } from "../movement/core";
import type { PersonalProfile } from "../movement/personalization";
import type { Tracking } from "../movement/useTracking";
import { MovementResponse, PracticeStickers } from "./PlayAlong";
import { TrackingScan } from "./TrackingScan";
export function PersonalTune({
  tracking,
  exercise,
  arm,
  range,
  onComplete,
  onReplay,
  onDemo,
}: {
  tracking: Tracking;
  exercise: Exercise;
  arm: Arm;
  range: { lower: number; upper: number };
  onComplete: (p: PersonalProfile | null) => void;
  onReplay: () => void;
  onDemo: () => void;
}) {
  const capture = useRef(new QuickPracticeCapture(exercise));
  const [now, setNow] = useState(performance.now()),
    [profile, setProfile] = useState<PersonalProfile | null>(null);
  const done = useRef(onComplete);
  done.current = onComplete;
  const frame = tracking.frame,
    value = movementValue(frame, exercise),
    clockNow = Math.max(now, performance.now());
  const fresh =
    tracking.status === "on" &&
    frame.valid &&
    value !== null &&
    clockNow >= frame.at &&
    clockNow - frame.at < FRAME_MAX_AGE_MS;
  useEffect(() => {
    const timer = setInterval(() => setNow(performance.now()), 100);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (profile) return;
    capture.current.update(frame, performance.now());
    const p = capture.current.profile(arm, performance.now());
    if (p) setProfile(p);
  }, [frame, now, profile, arm]);
  useEffect(() => {
    if (!profile) return;
    const timer = setTimeout(() => done.current(profile), 900);
    return () => clearTimeout(timer);
  }, [profile]);
  const learned = capture.current.range,
    phase = capture.current.motion.counter.phase;
  const position =
    fresh && value !== null
      ? clamp(
          (value - (learned ?? range).lower) /
            ((learned ?? range).upper - (learned ?? range).lower),
        )
      : null;
  const assessment = assessMovement(
    learned ? position : null,
    phase === "seek-high" ? "high" : "low",
  );
  const instruction = childInstructions[exercise];
  const action = learned
    ? phase === "seek-high"
      ? instruction.high
      : instruction.low
    : `${instruction.high} ${instruction.low}`;
  return (
    <div className="personal-tune quick-practice">
      <span className="scan-eyebrow">
        {profile ? "Ready to play!" : "Your turn!"}
      </span>
      <h2 id="setup-title">{profile ? "You did it!" : action}</h2>
      <p>
        {profile ? "Let’s go!" : "Copy the movement once. I’m following you."}
      </p>
      <div className="live-assessment">
        <TrackingScan
          tracking={tracking}
          exercise={exercise}
          arm={arm}
          range={learned ?? range}
        />
        <div className="live-movement-result">
          <MovementResponse exercise={exercise} position={position} />
          <div
            className={`movement-assessment assessment-${assessment.state}`}
            role="status"
            aria-live="polite"
          >
            <strong>
              {profile
                ? "That’s it!"
                : !fresh
                  ? tracking.status === "loading"
                    ? "Getting the camera ready…"
                    : frame.message
                  : !learned
                    ? "I’m following your movement."
                    : assessment.message}
            </strong>
            {learned && (
              <div
                className="movement-task-progress"
                role="progressbar"
                aria-label="Progress towards the current movement"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(assessment.progress * 100)}
              >
                <span style={{ width: `${assessment.progress * 100}%` }} />
              </div>
            )}
          </div>
          <PracticeStickers count={profile ? 1 : 0} total={1} />
        </div>
      </div>
      {profile && (
        <div className="quick-success">
          <Check size={18} /> Starting your adventure…
        </div>
      )}
      {tracking.error && (
        <p className="error-message">
          {tracking.error}
          <button onClick={() => void tracking.start()}>
            Try the camera again
          </button>
        </p>
      )}
      <button className="text-button centered" onClick={onReplay}>
        Watch the movement again
      </button>
      <button className="text-button centered" onClick={onDemo}>
        Play with buttons instead
      </button>
      <details className="grownup-fold personal-explanation">
        <summary>Grown-up help</summary>
        <p>
          The range and steadiness are learned from one complete movement during
          this attempt. No separate endpoint capture is needed. Missing or stale
          observations cannot complete it. This calibrates game input; MediaPipe
          remains pretrained.
        </p>
        <button
          className="text-button"
          disabled={!fresh}
          onClick={() => done.current(null)}
        >
          Start with current settings
        </button>
      </details>
    </div>
  );
}
