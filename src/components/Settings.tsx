import { useState } from "react";
import {
  X,
  SlidersHorizontal,
  RotateCcw,
  Trash2,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import {
  exercises,
  getMovementRange,
  applyMovementRange,
  validMovementRange,
  movementLimits,
  validReachRange,
  validGripRange,
  type Exercise,
} from "../movement/exercises";
import { validRange } from "../movement/core";
import type { Settings as Config, Summary } from "../game/session";
export function Settings({
  settings,
  onSave,
  onClose,
  onRecalibrate,
  onDetails,
  onDemoVideo,
}: {
  settings: Config;
  onSave: (s: Config) => void;
  onClose: () => void;
  onRecalibrate: () => void;
  onDetails: () => void;
  onDemoVideo: () => void;
}) {
  const [draft, setDraft] = useState(settings),
    [cleared, setCleared] = useState(false);
  const set = <K extends keyof Config>(key: K, value: Config[K]) =>
    setDraft((s) => ({ ...s, [key]: value }));
  const reach = draft.exercise === "reach",
    grip = draft.exercise === "grip",
    wrist = draft.exercise === "wrist",
    ship = draft.exercise === "ship",
    handMode = grip;
  const range = getMovementRange(draft);
  const valid = validMovementRange(draft.exercise, range.lower, range.upper);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="modal settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-top">
          <span className="eyebrow">
            <SlidersHorizontal size={14} /> A LITTLE HELP BEHIND THE MAGIC
          </span>
          <button
            className="icon-button"
            aria-label="Close settings"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        <h2 id="settings-title">Grown-up settings</h2>
        <p className="modal-intro">
          Make this little adventure feel just right.
        </p>
        <label className="exercise-setting">
          Movement game
          <select
            value={draft.exercise}
            onChange={(e) => set("exercise", e.target.value as Exercise)}
          >
            <option value="grip">Wake a sleepy flower · open & close</option>
            <option value="ship">Pirate Ship · steer left & right</option>
            <option value="wrist">Butterfly Breeze · tilt & return</option>
            <option value="elbow">Give Luma a lift · bend & return</option>
          </select>
        </label>
        <div className="settings-grid">
          <label>
            {handMode ? "Playing hand" : "Arm to follow"}
            <select
              value={draft.arm}
              disabled={handMode}
              onChange={(e) => set("arm", e.target.value as Config["arm"])}
            >
              <option value="right">
                {handMode ? "The one hand you show" : "Right arm"}
              </option>
              <option value="left">
                {handMode ? "The one hand you show" : "Left arm"}
              </option>
            </select>
          </label>
          <label>
            Target cycles <span className="field-note">Demo setting</span>
            <select
              value={draft.target}
              onChange={(e) => set("target", +e.target.value)}
            >
              {[3, 5, 8, 10, 12, 16].map((n) => (
                <option key={n} value={n}>
                  {n} cycles
                </option>
              ))}
            </select>
          </label>
          <label>
            {ship
              ? "Forearm turn left"
              : wrist
                ? "Resting hand tilt"
                : grip
                  ? "Softly closed hand"
                  : reach
                    ? "Resting hand level"
                    : "Lower position (extended)"}
            <div className="number-input">
              <input
                type="number"
                min={movementLimits[draft.exercise].min}
                max={movementLimits[draft.exercise].max}
                step={grip || reach ? 0.05 : 1}
                value={range.lower}
                onChange={(e) =>
                  setDraft((s) =>
                    applyMovementRange(s, +e.target.value, range.upper),
                  )
                }
              />
              <span>{grip || reach ? "relative" : "degrees"}</span>
            </div>
          </label>
          <label>
            {ship
              ? "Forearm turn right"
              : wrist
                ? "Comfortably raised tilt"
                : grip
                  ? "Comfortably open hand"
                  : reach
                    ? "Raised hand level"
                    : "Upper position (bent)"}
            <div className="number-input">
              <input
                type="number"
                min={movementLimits[draft.exercise].min}
                max={movementLimits[draft.exercise].max}
                step={grip || reach ? 0.05 : 1}
                value={range.upper}
                onChange={(e) =>
                  setDraft((s) =>
                    applyMovementRange(s, range.lower, +e.target.value),
                  )
                }
              />
              <span>{grip || reach ? "relative" : "degrees"}</span>
            </div>
          </label>
        </div>
        {!valid && (
          <p className="error-message">
            {ship
              ? "Use two comfortable steering spots at least 5° apart (−75 to 75°)."
              : wrist
                ? "Use a raised hand tilt at least 5° above its resting tilt (−90 to 90°)."
                : grip
                  ? "The open hand level must be at least 0.2 above the closed level (0–5)."
                  : reach
                    ? "Use two forearm lift levels at least 0.18 apart (−1 to 1)."
                    : "Use a lower-position angle at least 5° larger than the upper-position angle (10–180°)."}
          </p>
        )}
        <div className="setting-row">
          <label htmlFor="game-speed">
            Journey speed<span>Scenery and firefly spacing</span>
          </label>
          <select
            id="game-speed"
            value={draft.speed}
            onChange={(e) => set("speed", +e.target.value)}
          >
            <option value={0.7}>Gentle</option>
            <option value={1}>Steady</option>
            <option value={1.2}>Lively</option>
          </select>
        </div>
        <div className="setting-row">
          <label htmlFor="smoothing">
            Movement smoothing<span>A softer response to small wobbles</span>
          </label>
          <select
            id="smoothing"
            value={draft.smoothing}
            onChange={(e) => set("smoothing", +e.target.value)}
          >
            <option value={0.12}>Light</option>
            <option value={0.22}>Balanced</option>
            <option value={0.4}>Extra soft</option>
          </select>
        </div>
        {(
          [
            {
              key: "muted",
              label: "Quiet sound",
              sub: "You can also use the sound button.",
            },
            {
              key: "reducedMotion",
              label: "Reduced background motion",
              sub: "Less swaying and gentler wing animation.",
            },
            {
              key: "saveSummaries",
              label: "Remember session summaries",
              sub: "Optional. Stored only in this browser.",
            },
          ] as const
        ).map((row) => (
          <div className="setting-row" key={row.key}>
            <label htmlFor={row.key}>
              {row.label}
              <span>{row.sub}</span>
            </label>
            <input
              id={row.key}
              className="switch"
              type="checkbox"
              checked={draft[row.key]}
              onChange={(e) => set(row.key, e.target.checked)}
            />
          </div>
        ))}
        {handMode && (
          <p className="hand-filter-note">
            Hand steadiness: a short median filter removes single-frame jumps,
            then a time-aware EMA softens the motion. Missing tracking still
            stops the game immediately.
          </p>
        )}
        <div className="grownup-note">
          <ShieldCheck size={20} />
          <p>
            {exercises[draft.exercise].camera} This is a projected movement
            estimate, not a validated clinical measurement. For rehabilitation,
            choose the exercise and comfortable limits with the treating
            professional.
          </p>
        </div>
        <div className="settings-links">
          <button
            onClick={() => {
              if (valid) {
                onSave(draft);
                onRecalibrate();
              }
            }}
          >
            <RotateCcw size={16} /> Recalibrate <ChevronRight size={15} />
          </button>
          <button onClick={onDetails}>
            Session details <ChevronRight size={15} />
          </button>
          <button onClick={onDemoVideo}>
            Recorded demo videos {settings.demoVideo ? "· on" : ""}{" "}
            <ChevronRight size={15} />
          </button>
          <button
            onClick={() => {
              localStorage.removeItem("luma-sessions");
              localStorage.removeItem("luma-settings");
              setDraft({ ...settings, saveSummaries: false });
              setCleared(true);
            }}
          >
            <Trash2 size={15} />
            {cleared ? "Local data cleared" : "Clear saved local data"}
          </button>
        </div>
        <button
          className="button primary full"
          disabled={!valid}
          onClick={() => {
            onSave(draft);
            onClose();
          }}
        >
          Save settings <span>✓</span>
        </button>
      </section>
    </div>
  );
}
export function Trace({ summary }: { summary: Summary }) {
  const maxT = Math.max(1, summary.seconds, ...summary.trace.map((p) => p.t));
  return (
    <div className="trace">
      <div>
        <span>Movement through your adventure</span>
        <span>
          {summary.mode === "demo" ? "Demo input" : "Valid camera frames"}
        </span>
      </div>
      {summary.trace.length > 1 ? (
        <svg
          viewBox="0 0 480 100"
          role="img"
          aria-label="Recorded normalized movement height over active play time"
        >
          <path
            d="M0 15H480M0 50H480M0 85H480"
            stroke="#e4e8dc"
            strokeDasharray="3 4"
          />
          <path
            d={summary.trace
              .map(
                (p, i) =>
                  `${i ? "L" : "M"}${(p.t / maxT) * 480},${90 - p.v * 80}`,
              )
              .join(" ")}
            fill="none"
            stroke="#578775"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <p>No movement trace recorded yet.</p>
      )}
      <div>
        <span>Start</span>
        <span>{formatTime(summary.seconds)}</span>
      </div>
    </div>
  );
}
export function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
export function SessionDetails({
  summary,
  onClose,
}: {
  summary: Summary | null;
  onClose: () => void;
}) {
  let stored: Summary[] = [];
  try {
    stored = JSON.parse(localStorage.getItem("luma-sessions") ?? "[]");
  } catch {}
  const data = summary ?? stored[0] ?? null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="details-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-top">
          <span className="eyebrow">A LITTLE ADVENTURE, REMEMBERED</span>
          <button
            className="icon-button"
            aria-label="Close session details"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        <h2 id="details-title">Session details</h2>
        {data ? (
          <>
            <p>
              {data.mode === "demo"
                ? "Demo controls · keyboard & slider"
                : "Camera mode · projected movement"}{" "}
              · {data.finished ? "Journey completed" : "Finished for now"}
            </p>
            <div className="result-stats">
              <div>
                <strong>{data.cycles}</strong>
                <span>complete cycles</span>
              </div>
              <div>
                <strong>{formatTime(data.seconds)}</strong>
                <span>active play</span>
              </div>
              <div>
                <strong>{data.fireflies}</strong>
                <span>fireflies found</span>
              </div>
            </div>
            <p className="small">
              Movement game: {exercises[data.exercise ?? "elbow"].title}
            </p>
            <Trace summary={data} />
            <p className="small">
              {data.mode === "demo"
                ? "This is a demo session. Keyboard and slider activity is not measured rehabilitation performance."
                : "Only reliable camera frames contributed to the trace and cycle count. This prototype does not assess clinical improvement."}
            </p>
          </>
        ) : (
          <div className="empty-state">
            Your adventure has yet to begin.
            <p>Complete a journey to see your real session details here.</p>
          </div>
        )}
        <button className="button secondary full" onClick={onClose}>
          Back to Luma
        </button>
      </section>
    </div>
  );
}
