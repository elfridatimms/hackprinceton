import { useState } from "react";
import { ChevronDown, Check, X } from "lucide-react";
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
  const [trying, setTrying] = useState(false),
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
              tracking.stop();
              setTrying(false);
            }}
            onDemo={onDemo}
          />
        ) : (
          <>
            <MotionPreview
              exercise={settings.exercise}
              title={instruction.goal}
              onDone={() => {
                // Straight from the demonstration into the camera: no extra click.
                setTrying(true);
                void tracking.start();
              }}
            />
            <details className="grownup-fold">
              <summary>
                Grown-up: movement options <ChevronDown size={13} />
              </summary>
              {settings.exercise === "reach" && (
                <div
                  className="arm-choice"
                  role="group"
                  aria-label="Playing arm"
                >
                  {(["left", "right"] as const).map((arm) => (
                    <button
                      key={arm}
                      className={settings.arm === arm ? "selected" : ""}
                      onClick={() =>
                        setSettings({ ...settings, arm, personalization: null })
                      }
                    >
                      {arm === "left" ? "Left arm" : "Right arm"}
                      {settings.arm === arm && <Check size={13} />}
                    </button>
                  ))}
                </div>
              )}
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
