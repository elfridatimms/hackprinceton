import { childInstructions } from "../movement/instructions";
import { ReadInstruction } from "./ReadInstruction";
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
import { MovementGuide } from "./MovementGuide";
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
    if (profile) return;
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
  }, [f, now, profile, exercise, arm, range, holds]);
  const instruction = childInstructions[exercise];
  const phase = capture.current.counter.phase;
  const currentInstruction =
    phase === "seek-high" ? instruction.high : instruction.low;
  const direction = phase === "seek-high" ? "up" : "down";
  const position =
    fresh && value !== null
      ? clamp((value - range.lower) / (range.upper - range.lower))
      : null;
  return (
    <div className="personal-tune">
      <span className="scan-eyebrow">
        <Sparkles size={13} /> YOUR MAGIC, MADE PERSONAL
      </span>
      <h2 id="setup-title">
        {profile
          ? "Just right for you."
          : "Two little moves. Your kind of magic."}
      </h2>
      <p>
        {profile
          ? "Luma has learned your comfy movement for this adventure."
          : "Copy the picture. We’ll do it twice together."}
      </p>
      <TrackingScan
        tracking={tracking}
        exercise={exercise}
        arm={arm}
        range={range}
        compact
      />
      {profile ? (
        <div className="personal-ready">
          <div className="personal-ready-seal">
            <Check size={26} />
          </div>
          <div>
            <strong>Your little adventure is ready.</strong>
            <span>
              Comfortable range · gentle response · personal steadiness
            </span>
          </div>
          <div className="personal-checks">
            <span>
              <Check size={13} /> Your two comfy spots
            </span>
            <span>
              <Check size={13} /> Two real practice movements
            </span>
            <span>
              <Check size={13} /> Smoothing fitted to your scan
            </span>
          </div>
        </div>
      ) : (
        <div className="tune-instruction">
          <MovementGuide
            key={direction}
            exercise={exercise}
            direction={direction}
            compact
          />
          <div>
            <span className="scan-small-label">
              {Math.min(count, 2)} OF 2 LITTLE MOVES
            </span>
            <h3>{currentInstruction}</h3>
            <p>
              {fresh
                ? "Hold still for a moment. Then follow the next picture."
                : tracking.frame.message}
            </p>
            <ReadInstruction
              text={`${currentInstruction} ${instruction.tip} Hold still for a moment.`}
            />
            <div
              className="tune-move-track"
              aria-label="Live position within your comfortable range"
            >
              <i
                style={{
                  left: `${(position ?? 0.5) * 100}%`,
                  opacity: fresh ? 1 : 0.25,
                }}
              />
            </div>
            <div
              className="tune-count"
              aria-label={`${Math.min(count, 2)} of 2 movements captured`}
            >
              {[0, 1].map((i) => (
                <span key={i} className={i < count ? "done" : ""}>
                  {i < count ? <Check size={15} /> : i + 1}
                </span>
              ))}
            </div>
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
      <button className="text-button centered" onClick={onRetry}>
        <RotateCcw size={13} /> Find my two spots again
      </button>
      <button className="text-button centered" onClick={onDemo}>
        Play with buttons instead
      </button>
    </div>
  );
}
