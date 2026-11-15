import { useState } from "react";
import { Camera, ChevronDown, Check, X } from "lucide-react";
import { MotionPreview } from "./MotionPreview";
import { PersonalTune } from "./PersonalTune";
import { CameraDiagnostics } from "./CameraDiagnostics";
import { Portrait } from "./Illustrations";
import { childInstructions } from "../movement/instructions";
import {
  exercises,
  exerciseOrder,
  getMovementRange,
  applyMovementRange,
  type Exercise,
} from "../movement/exercises";
import type { PersonalProfile } from "../movement/personalization";
import type { Settings, Session } from "../game/session";
import type { Tracking } from "../movement/useTracking";

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
  const [watched, setWatched] = useState(false),
    [trying, setTrying] = useState(false),
    [attempt, setAttempt] = useState(0);
  const instruction = childInstructions[settings.exercise];
  const finish = (profile: PersonalProfile | null) => {
    const range = profile ?? getMovementRange(settings);
    setSettings({
      ...applyMovementRange(settings, range.lower, range.upper),
      personalization: profile,
      arm: profile?.arm ?? settings.arm,
      smoothing: profile?.smoothing ?? settings.smoothing,
    });
    session.reset("playing");
  };
  const choose = (exercise: Exercise) => {
    tracking.stop();
    setTrying(false);
    setWatched(false);
    setSettings({ ...settings, exercise, personalization: null });
  };
  return (
    <div className="modal-backdrop setup-backdrop">
      <section
        className="modal setup-modal child-setup scan-setup-modal quick-setup"
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
        {trying ? (
          <PersonalTune
            key={`${settings.exercise}:${attempt}`}
            tracking={tracking}
            exercise={settings.exercise}
            arm={settings.arm}
            range={getMovementRange(settings)}
            onComplete={finish}
            onReplay={() => {
              setTrying(false);
              setWatched(false);
            }}
            onDemo={onDemo}
          />
        ) : (
          <>
            {!watched ? (
              <MotionPreview
                exercise={settings.exercise}
                title={instruction.goal}
                onDone={() => setWatched(true)}
              />
            ) : (
              <>
                <h2 id="setup-title">Your turn!</h2>
                <p>{instruction.camera}</p>
                <p className="child-reassurance">{instruction.tip}</p>
                <button
                  className="button primary full"
                  onClick={() => {
                    setTrying(true);
                    void tracking.start();
                  }}
                >
                  <Camera size={18} /> Let’s play!
                </button>
                <button
                  className="text-button centered"
                  onClick={() => setWatched(false)}
                >
                  Watch again
                </button>
              </>
            )}
            <details className="grownup-fold">
              <summary>
                Grown-up: movement options <ChevronDown size={13} />
              </summary>
              <div
                className="exercise-choices"
                role="group"
                aria-label="Choose your movement game"
              >
                {exerciseOrder.map((item) => (
                  <button
                    key={item}
                    className={`exercise-choice ${item === settings.exercise ? "selected" : ""}`}
                    onClick={() => choose(item)}
                  >
                    <strong>{exercises[item].tab}</strong>
                    <small>{exercises[item].short}</small>
                    {item === settings.exercise && <Check size={13} />}
                  </button>
                ))}
              </div>
              <p>{instruction.help}</p>
            </details>
            <button className="text-button centered" onClick={onDemo}>
              Play with buttons instead
            </button>
          </>
        )}
        {trying && (
          <CameraDiagnostics
            tracking={tracking}
            onRestart={() => {
              setAttempt((v) => v + 1);
              void tracking.start();
            }}
          />
        )}
      </section>
    </div>
  );
}
