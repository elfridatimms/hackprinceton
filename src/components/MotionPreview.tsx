import { useEffect, useRef, useState } from "react";
import { Eye } from "lucide-react";
import type { Exercise } from "../movement/exercises";
import { MovementGuide } from "./MovementGuide";
export const ACTION_PREVIEW_MS = 3000;
export const CYCLE_PREVIEW_MS = 5500;
/** Demonstration time is separate from camera evidence. Hidden tabs restart the example. */
export function MotionPreview({
  exercise,
  direction = "loop",
  title,
  duration = CYCLE_PREVIEW_MS,
  onDone,
  titleId = "setup-title",
}: {
  exercise: Exercise;
  direction?: "loop" | "up" | "down";
  title: string;
  duration?: number;
  onDone: () => void;
  titleId?: string;
}) {
  const [elapsed, setElapsed] = useState(0),
    [version, setVersion] = useState(0);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    let start = performance.now(),
      finished = false;
    const restart = () => {
      if (!document.hidden && !finished) {
        start = performance.now();
        setElapsed(0);
        setVersion((v) => v + 1);
      }
    };
    const timer = setInterval(() => {
      if (document.hidden || finished) return;
      const age = performance.now() - start;
      setElapsed(Math.min(duration, age));
      if (age >= duration) {
        finished = true;
        done.current();
      }
    }, 100);
    document.addEventListener("visibilitychange", restart);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", restart);
    };
  }, [duration, exercise, direction]);
  return (
    <section className="motion-preview" aria-label="Movement demonstration">
      <span className="preview-label">
        <Eye size={16} /> Watch first
      </span>
      <h2 id={titleId}>{title}</h2>
      <div className="preview-animation">
        <MovementGuide
          key={`${exercise}:${direction}:${version}`}
          exercise={exercise}
          direction={direction}
        />
      </div>
      <p>Your turn is next.</p>
      <div
        className="preview-progress"
        role="progressbar"
        aria-label="Demonstration playback"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round((elapsed / duration) * 100)}
      >
        <span style={{ width: `${(elapsed / duration) * 100}%` }} />
      </div>
    </section>
  );
}
