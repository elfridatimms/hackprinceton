import { useState } from "react";
import { Check, Minus, Plus, X } from "lucide-react";
import { exercises } from "../movement/exercises";
import { GameGlyph } from "./GameTabs";
import {
  CARE_PLANS,
  createPlan,
  PLAN_ORDER,
  type CarePlan,
  type PlanId,
} from "../care/plan";

/** Grown-up choice of a home exercise plan: two games and daily reps. */
export function CarePlanSetup({
  plan,
  onSave,
  onClose,
}: {
  plan: CarePlan | null;
  onSave: (plan: CarePlan | null) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<CarePlan>(plan ?? createPlan("wrist"));
  const choose = (id: PlanId) => {
    const reps = draft.items[0]?.reps ?? 8;
    setDraft({ ...createPlan(id, reps), startedOn: plan?.id === id ? plan.startedOn : createPlan(id).startedOn });
  };
  const setReps = (i: number, delta: number) =>
    setDraft({
      ...draft,
      items: draft.items.map((item, n) =>
        n === i ? { ...item, reps: Math.max(2, Math.min(30, item.reps + delta)) } : item,
      ),
    });
  return (
    <div className="modal-backdrop">
      <section
        className="modal care-plan-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-title"
      >
        <div className="report-head">
          <div>
            <span className="eyebrow">FOR PARENTS & THERAPISTS</span>
            <h2 id="plan-title">Home exercise plan</h2>
            <p>Pick what the child is recovering from. Each plan has two games.</p>
          </div>
          <button className="icon-button" aria-label="Close plan" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="plan-choices" role="radiogroup" aria-label="Plan">
          {PLAN_ORDER.map((id) => (
            <button
              key={id}
              role="radio"
              aria-checked={draft.id === id}
              className={`plan-choice ${draft.id === id ? "selected" : ""}`}
              onClick={() => choose(id)}
            >
              <strong>{CARE_PLANS[id].label}</strong>
              <small>{CARE_PLANS[id].detail}</small>
              <span className="plan-glyphs" aria-hidden="true">
                {CARE_PLANS[id].exercises.map((e) => (
                  <span key={e} className="panel-game-glyph">
                    <GameGlyph exercise={e} />
                  </span>
                ))}
              </span>
              {draft.id === id && <Check size={16} className="plan-check" />}
            </button>
          ))}
        </div>
        <h3 className="report-section">Every day</h3>
        <ol className="plan-items">
          {draft.items.map((item, i) => (
            <li key={item.exercise}>
              <span className="panel-game-glyph">
                <GameGlyph exercise={item.exercise} />
              </span>
              <div>
                <strong>{exercises[item.exercise].tab}</strong>
                <small>{exercises[item.exercise].short}</small>
              </div>
              <div className="reps-stepper" aria-label={`${exercises[item.exercise].tab} repetitions`}>
                <button aria-label="Fewer repetitions" onClick={() => setReps(i, -2)}>
                  <Minus size={14} />
                </button>
                <span>
                  <strong>{item.reps}</strong> reps
                </span>
                <button aria-label="More repetitions" onClick={() => setReps(i, 2)}>
                  <Plus size={14} />
                </button>
              </div>
            </li>
          ))}
        </ol>
        <p className="report-note">
          These are example programs. Agree the exercises, repetitions and limits with
          the child’s therapist.
        </p>
        <div className="report-actions">
          <button className="button primary" onClick={() => onSave(draft)}>
            {plan ? "Save plan" : "Start plan"}
          </button>
          {plan && (
            <button className="text-button" onClick={() => onSave(null)}>
              Stop plan (free play)
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
