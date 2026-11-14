import { X, Sparkles, ArrowRight } from "lucide-react";
import { exercises, type Exercise } from "../movement/exercises";
import { MovementGuide } from "./MovementGuide";
import { GameGlyph } from "./GameTabs";
export function MovementLesson({
  exercise,
  onClose,
  onTry,
}: {
  exercise: Exercise;
  onClose: () => void;
  onTry: () => void;
}) {
  const game = exercises[exercise];
  return (
    <div className="modal-backdrop lesson-backdrop">
      <section
        className="modal movement-lesson"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lesson-title"
      >
        <div className="modal-top">
          <span className="eyebrow">
            <Sparkles size={13} /> WATCH. WIGGLE. MAKE MAGIC.
          </span>
          <button
            className="icon-button"
            aria-label="Close movement lesson"
            onClick={onClose}
          >
            <X size={19} />
          </button>
        </div>
        <div className={`lesson-icon game-${exercise}`}>
          <GameGlyph exercise={exercise} />
        </div>
        <h2 id="lesson-title">{game.title}</h2>
        <p>Watch the little move. Then it’s your turn.</p>
        <div className="lesson-example">
          <MovementGuide exercise={exercise} />
        </div>
        <ol className="lesson-steps">
          <li>
            <b>1</b>
            <span>{game.up}</span>
          </li>
          <li>
            <b>2</b>
            <span>{game.down}</span>
          </li>
        </ol>
        <p className="lesson-reassurance">
          Tiny is lovely. Stop wherever feels comfy.
        </p>
        <button className="button primary full" onClick={onTry}>
          My turn! <ArrowRight size={17} />
        </button>
      </section>
    </div>
  );
}
