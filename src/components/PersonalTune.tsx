import { MotionPreview } from "./MotionPreview";
import { assessMovement } from "../movement/assessment";
import { MovementResponse, PracticeStickers } from "./PlayAlong";
import { childInstructions } from "../movement/instructions";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  RotateCcw,
  Sparkles,
  SlidersHorizontal,
} from "lucide-react";
import {
  PersonalMotionCapture,
  createPersonalProfile,
  type PersonalProfile,
} from "../movement/personalization";
import { FRAME_MAX_AGE_MS } from "../movement/calibration";
import { exercises, movementValue, type Exercise } from "../movement/exercises";
import { clamp, type Arm } from "../movement/core";
import type { Tracking } from "../movement/useTracking";
import { TrackingScan } from "./TrackingScan";
export function PersonalTune({
  tracking,
  exercise,
  arm,
  range,
  holds,
  onComplete,
  onRetry,
  onDemo,
}: {
  tracking: Tracking;
  exercise: Exercise;
  arm: Arm;
  range: { lower: number; upper: number };
  holds: number[][];
  onComplete: (profile: PersonalProfile | null) => void;
  onRetry: () => void;
  onDemo: () => void;
}) {
  const capture = useRef(new PersonalMotionCapture());
  const [previewing, setPreviewing] = useState(true);
  const attemptAt = useRef(Infinity);
  const [now, setNow] = useState(performance.now()),
    [count, setCount] = useState(0),
    [profile, setProfile] = useState<PersonalProfile | null>(null);
  const f = tracking.frame,
    value = movementValue(f, exercise);
  const clockNow = Math.max(now, performance.now());
  const fresh =
    tracking.status === "on" &&
    f.valid &&
    value !== null &&
    clockNow >= f.at &&
    clockNow - f.at < FRAME_MAX_AGE_MS;
  useEffect(() => {
    const id = setInterval(() => setNow(performance.now()), 100);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (profile || previewing || f.at < attemptAt.current) return;
    capture.current.update(f, exercise, range, performance.now());
    setCount(capture.current.counter.count);
    if (capture.current.counter.count >= 2) {
      const samples = capture.current.samples,
        span = Math.abs(range.upper - range.lower);
      // For a manually entered range, obtain noise only from genuinely steady endpoint plateaus.
      const plateaus: number[][] = [];
      let group: typeof samples = [];
      for (const s of samples) {
        const pos = clamp(
          (s.value - range.lower) / (range.upper - range.lower),
        );
        if (
          (pos < 0.2 || pos > 0.8) &&
          (!group.length || Math.abs(s.value - group[0].value) < span * 0.015)
        )
          group.push(s);
        else {
          if (group.length >= 5) plateaus.push(group.map((p) => p.raw));
          group = [];
        }
      }
      if (group.length >= 5) plateaus.push(group.map((p) => p.raw));
      const learned = createPersonalProfile(
        exercise,
        arm,
        range,
        samples,
        holds.length >= 2 ? holds : plateaus,
        capture.current.counter.count,
        performance.now(),
      );
      if (learned) setProfile(learned);
    }
  }, [f, now, profile, previewing, exercise, arm, range, holds]);
  const instruction = childInstructions[exercise];
  const phase = capture.current.counter.phase;
  const currentInstruction =
    phase === "seek-high" ? instruction.high : instruction.low;
  const direction = phase === "seek-high" ? "up" : "down";
  const position =
    fresh && value !== null
      ? clamp((value - range.lower) / (range.upper - range.lower))
      : null;
  const assessment = assessMovement(
    position,
    phase === "seek-high" ? "high" : "low",
  );
  if (previewing)
    return (
      <MotionPreview
        exercise={exercise}
        title={childInstructions[exercise].goal}
        onDone={() => {
          capture.current.counter.invalidate();
          attemptAt.current = performance.now();
          setPreviewing(false);
        }}
      />
    );
  return (
    <div className="personal-tune">
      <span className="scan-eyebrow">
        <Sparkles size={13} /> {profile ? "Ready to play!" : "Your turn!"}
      </span>
      <h2 id="setup-title">{profile ? "You did it!" : currentInstruction}</h2>
      <p>
        {profile
          ? "Your little adventure is ready."
          : "I’m watching your movement."}
      </p>
      <div className="live-assessment">
        <TrackingScan
          tracking={tracking}
          exercise={exercise}
          arm={arm}
          range={range}
        />
        <div className="live-movement-result">
          <MovementResponse exercise={exercise} position={position} />
          <div
            className={`movement-assessment assessment-${assessment.state}`}
            role="status"
            aria-live="polite"
          >
            <strong>{profile ? "You did it!" : assessment.message}</strong>
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
          </div>
          <PracticeStickers count={profile ? 2 : count} />
        </div>
      </div>
      {profile && (
        <div className="personal-ready">
          <div className="personal-ready-seal">
            <Check size={26} />
          </div>
          <div>
            <strong>Your little adventure is ready.</strong>
            <span>Made for your own little moves.</span>
          </div>
        </div>
      )}
      {profile && (
        <button
          className="button primary full"
          disabled={!fresh}
          onClick={() => onComplete(profile)}
        >
          Let’s try my magic <ArrowRight size={17} />
        </button>
      )}
      <details className="grownup-fold personal-explanation">
        <summary>
          <SlidersHorizontal size={13} /> What the scan adapts
        </summary>
        <p>
          Every new camera adventure measures two comfortable positions, checks
          two complete movements and estimates resting signal variation. These
          observations set the movement mapping, filter deadband and response
          smoothing for this session. MediaPipe uses its pretrained model; this
          step calibrates game controls. No identity or video is saved.
        </p>
        {profile && (
          <p className="small">
            {profile.samples} valid observations · {profile.cycles} complete
            movements · response {Math.round(profile.smoothing * 1000)} ms
          </p>
        )}
        <button
          className="text-button"
          disabled={!fresh}
          onClick={() => onComplete(null)}
        >
          Use my two saved spots without extra tuning
        </button>
      </details>
      <button
        className="text-button centered"
        onClick={() => {
          capture.current.counter.invalidate();
          attemptAt.current = Infinity;
          setPreviewing(true);
        }}
      >
        Watch the movement again
      </button>
      <button className="text-button centered" onClick={onRetry}>
        <RotateCcw size={13} /> Find my two spots again
      </button>
      <button className="text-button centered" onClick={onDemo}>
        Play with buttons instead
      </button>
    </div>
  );
}
