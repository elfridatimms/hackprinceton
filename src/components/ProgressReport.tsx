import { useMemo, useState } from "react";
import { Download, Printer, Sparkles, Trash2, X } from "lucide-react";
import { exercises } from "../movement/exercises";
import { GameGlyph } from "./GameTabs";
import {
  CARE_PLANS,
  consistency,
  dayKey,
  romTrend,
  ROM,
  toCsv,
  todayProgress,
  type CarePlan,
  type SessionRecord,
} from "../care/plan";

const fmtDay = (d: Date) =>
  d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
const fmtValue = (v: number, unit: string) =>
  unit === "°" ? `${Math.round(v)}°` : `${v.toFixed(2)}${unit}`;

/** Single-series range-of-motion line: one hue, area wash, end label, hover tooltip. */
function RomChart({
  points,
  unit,
  label,
}: {
  points: { at: Date; value: number; cycles: number }[];
  unit: string;
  label: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  if (points.length === 0)
    return <p className="report-empty">No camera sessions yet.</p>;
  const W = 520,
    H = 170,
    left = 40,
    right = 56,
    top = 14,
    bottom = 26;
  const values = points.map((p) => p.value);
  const step = unit === "°" ? 10 : 0.25;
  let lo = Math.floor(Math.min(...values) / step) * step,
    hi = Math.ceil(Math.max(...values) / step) * step;
  if (hi - lo < step * 2) hi = lo + step * 2;
  if (unit === "°") lo = Math.max(0, lo - step);
  const ticks = [lo, (lo + hi) / 2, hi];
  const x = (i: number) =>
    points.length === 1 ? (left + W - right) / 2 : left + (i / (points.length - 1)) * (W - left - right);
  const y = (v: number) => top + (1 - (v - lo) / (hi - lo)) * (H - top - bottom);
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join("");
  const area = `${line}L${x(points.length - 1)},${H - bottom}L${x(0)},${H - bottom}Z`;
  const last = points[points.length - 1];
  const h = hover !== null ? points[hover] : null;
  return (
    <div className="rom-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${label} over camera sessions`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={left} x2={W - right} y1={y(t)} y2={y(t)} className="chart-grid" />
            <text x={left - 8} y={y(t) + 4} className="chart-tick" textAnchor="end">
              {fmtValue(t, unit)}
            </text>
          </g>
        ))}
        <text x={left} y={H - 6} className="chart-tick">
          {fmtDay(points[0].at)}
        </text>
        {points.length > 1 && (
          <text x={W - right} y={H - 6} className="chart-tick" textAnchor="end">
            {fmtDay(last.at)}
          </text>
        )}
        <path d={area} className="chart-area" />
        <path d={line} className="chart-line" />
        {h && hover !== null && (
          <line x1={x(hover)} x2={x(hover)} y1={top} y2={H - bottom} className="chart-crosshair" />
        )}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={x(i)}
            cy={y(p.value)}
            r={i === points.length - 1 || i === hover ? 5 : 3.5}
            className="chart-dot"
          />
        ))}
        <text x={x(points.length - 1) + 10} y={y(last.value) + 4} className="chart-end">
          {fmtValue(last.value, unit)}
        </text>
        {points.map((p, i) => (
          <rect
            key={`hit${i}`}
            x={x(i) - Math.max(10, (W - left - right) / points.length / 2)}
            y={top}
            width={Math.max(20, (W - left - right) / points.length)}
            height={H - top - bottom}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            tabIndex={0}
            aria-label={`${fmtDay(p.at)}: ${fmtValue(p.value, unit)}, ${p.cycles} reps`}
          />
        ))}
      </svg>
      {h && hover !== null && (
        <div
          className="chart-tooltip"
          style={{ left: `${(x(hover) / W) * 100}%`, top: `${(y(h.value) / H) * 100}%` }}
        >
          <strong>{fmtValue(h.value, unit)}</strong>
          <span>
            {fmtDay(h.at)} · {h.cycles} reps
          </span>
        </div>
      )}
    </div>
  );
}

const STATUS = {
  complete: { icon: "✓", label: "All exercises done" },
  partial: { icon: "◐", label: "Some exercises done" },
  none: { icon: "", label: "No practice" },
  before: { icon: "", label: "Before the plan" },
} as const;

export function ProgressReport({
  plan,
  history,
  onClose,
  onEditPlan,
  onLoadExample,
  onClearExample,
  onClearAll,
}: {
  plan: CarePlan | null;
  history: SessionRecord[];
  onClose: () => void;
  onEditPlan: () => void;
  onLoadExample: () => void;
  onClearExample: () => void;
  onClearAll: () => void;
}) {
  const now = useMemo(() => new Date(), []);
  const hasExample = history.some((r) => r.example);
  const recent = history.filter((r) => now.getTime() - new Date(r.at).getTime() < 14 * 86400000);
  const c = plan ? consistency(plan, history, now) : null;
  const today = plan ? todayProgress(plan, history, now) : [];
  const games = plan
    ? plan.items.map((i) => i.exercise)
    : [...new Set(history.map((r) => r.exercise))];
  const minutes = Math.round(recent.reduce((s, r) => s + r.seconds, 0) / 60);
  const download = () => {
    const blob = new Blob([toCsv(history)], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `luma-progress-${dayKey(now)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <div className="modal-backdrop report-backdrop">
      <section
        className="modal progress-report"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-title"
      >
        <div className="report-head">
          <div>
            <span className="eyebrow">FOR PARENTS & THERAPISTS</span>
            <h2 id="report-title">Progress report</h2>
            <p>
              {plan
                ? `${CARE_PLANS[plan.id].label} plan · started ${fmtDay(new Date(plan.startedOn + "T12:00"))} · last 14 days`
                : "No plan yet · all saved sessions"}
              {hasExample && <span className="example-badge">Includes example data</span>}
            </p>
          </div>
          <button className="icon-button no-print" aria-label="Close progress report" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {!plan && (
          <div className="report-callout no-print">
            <p>Pick a plan so Luma can show daily goals and consistency.</p>
            <button className="button primary" onClick={onEditPlan}>
              Choose a plan
            </button>
          </div>
        )}

        {c && (
          <>
            <div className="stat-tiles">
              <div className="stat-tile">
                <span>Days fully done</span>
                <strong>
                  {c.complete}
                  <small> / {c.planned}</small>
                </strong>
              </div>
              <div className="stat-tile">
                <span>Days with practice</span>
                <strong>
                  {c.active}
                  <small> / {c.planned}</small>
                </strong>
              </div>
              <div className="stat-tile">
                <span>Current streak</span>
                <strong>
                  {c.streak}
                  <small> {c.streak === 1 ? "day" : "days"}</small>
                </strong>
              </div>
              <div className="stat-tile">
                <span>Active time</span>
                <strong>
                  {minutes}
                  <small> min</small>
                </strong>
              </div>
            </div>
            <h3 className="report-section">Consistency</h3>
            <div className="day-strip" role="list" aria-label="Practice over the last 14 days">
              {c.daily.map((d) => (
                <div
                  key={d.day}
                  role="listitem"
                  className={`day-cell day-${d.status}`}
                  title={`${fmtDay(d.date)}: ${STATUS[d.status].label}${d.reps ? ` · ${d.reps} reps` : ""}`}
                  aria-label={`${fmtDay(d.date)}: ${STATUS[d.status].label}`}
                >
                  <span className="day-mark" aria-hidden="true">
                    {STATUS[d.status].icon}
                  </span>
                  <small>{d.date.toLocaleDateString(undefined, { weekday: "narrow" })}</small>
                  <i>{d.date.getDate()}</i>
                </div>
              ))}
            </div>
            <div className="day-legend" aria-hidden="true">
              <span><b className="day-mark day-complete">✓</b> All exercises done</span>
              <span><b className="day-mark day-partial">◐</b> Some done</span>
              <span><b className="day-mark day-none" /> No practice</span>
            </div>
          </>
        )}

        <h3 className="report-section">Movement range</h3>
        <div className="exercise-reports">
          {games.map((game) => {
            const trend = romTrend(history, game);
            const rom = ROM[game];
            const t = today.find((i) => i.exercise === game);
            const sessions = recent.filter((r) => r.exercise === game).length;
            return (
              <article className="exercise-report" key={game}>
                <header>
                  <span className="panel-game-glyph">
                    <GameGlyph exercise={game} />
                  </span>
                  <div>
                    <strong>{exercises[game].tab}</strong>
                    <small>
                      {rom.label} · camera sessions
                    </small>
                  </div>
                  {t && (
                    <span className={`today-chip ${t.complete ? "done" : ""}`}>
                      Today {Math.min(t.done, t.reps)}/{t.reps}
                    </span>
                  )}
                </header>
                <RomChart points={trend.points} unit={rom.unit} label={rom.label} />
                <p className="exercise-summary">
                  {trend.change !== null ? (
                    <>
                      <strong>
                        {trend.change >= 0 ? "+" : "−"}
                        {fmtValue(Math.abs(trend.change), rom.unit)}
                      </strong>{" "}
                      since the first session · {sessions} sessions in 14 days
                    </>
                  ) : (
                    <>{sessions} sessions in 14 days</>
                  )}
                </p>
              </article>
            );
          })}
          {games.length === 0 && <p className="report-empty">No sessions saved yet.</p>}
        </div>

        <details className="report-table">
          <summary>All sessions as a table</summary>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Game</th>
                <th>Mode</th>
                <th>Reps</th>
                <th>Range</th>
              </tr>
            </thead>
            <tbody>
              {[...history].reverse().slice(0, 60).map((r) => (
                <tr key={r.id}>
                  <td>
                    {fmtDay(new Date(r.at))}
                    {r.example ? " *" : ""}
                  </td>
                  <td>{exercises[r.exercise].tab}</td>
                  <td>{r.mode}</td>
                  <td>
                    {r.cycles}/{r.target}
                  </td>
                  <td>
                    {ROM[r.exercise].value(r) !== null
                      ? fmtValue(ROM[r.exercise].value(r)!, ROM[r.exercise].unit)
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {hasExample && <small>* example data</small>}
        </details>

        <p className="report-note">
          Movement range is a projected 2D camera estimate from games played with the
          camera; button play counts toward daily goals but never toward range. This is
          a home-practice record, not a clinical assessment. No video or images are
          stored: only dates, reps, time and range numbers, in this browser.
        </p>

        <div className="report-actions no-print">
          <button className="button primary" onClick={() => window.print()}>
            <Printer size={16} /> Print / save PDF
          </button>
          <button className="button secondary" onClick={download} disabled={!history.length}>
            <Download size={16} /> Download CSV
          </button>
          <button className="button secondary" onClick={onEditPlan}>
            {plan ? "Edit plan" : "Choose a plan"}
          </button>
          {plan &&
            (hasExample ? (
              <button className="text-button" onClick={onClearExample}>
                Remove example data
              </button>
            ) : (
              <button className="text-button" onClick={onLoadExample}>
                <Sparkles size={14} /> Load 2 example weeks
              </button>
            ))}
          {history.length > 0 && (
            <button
              className="text-button danger-text"
              onClick={() => {
                if (window.confirm("Delete all saved sessions from this browser? This cannot be undone."))
                  onClearAll();
              }}
            >
              <Trash2 size={14} /> Delete history
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
