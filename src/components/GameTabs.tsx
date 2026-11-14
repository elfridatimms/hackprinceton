import { useRef } from "react";
import { exerciseOrder, exercises, type Exercise } from "../movement/exercises";
export function GameGlyph({ exercise }: { exercise: Exercise }) {
  return (
    <svg viewBox="0 0 56 56" fill="none" aria-hidden="true">
      {exercise === "grip" ? (
        <>
          <path
            d="M28 45V29m0 9 12-6"
            stroke="#82a075"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {Array.from({ length: 6 }, (_, i) => (
            <ellipse
              key={i}
              cx="28"
              cy="15"
              rx="7"
              ry="10"
              transform={`rotate(${i * 60} 28 26)`}
              fill={i % 2 ? "#e9b7a8" : "#f1cbbc"}
            />
          ))}
          <circle cx="28" cy="26" r="8" fill="#efd38d" />
          <path
            d="M24 26q1 2 2 0m4 0q1 2 2 0"
            stroke="#9d9366"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </>
      ) : exercise === "reach" ? (
        <>
          <ellipse
            cx="20"
            cy="23"
            rx="10"
            ry="6"
            transform="rotate(25 20 23)"
            fill="#ece7c3"
          />
          <ellipse
            cx="36"
            cy="23"
            rx="10"
            ry="6"
            transform="rotate(-25 36 23)"
            fill="#ece7c3"
          />
          <ellipse cx="28" cy="31" rx="8" ry="11" fill="#e7c46c" />
          <circle cx="26" cy="27" r="2" fill="#fff5c2" />
          <path
            d="m10 11 2 4 4 1-4 2-2 4-1-4-4-2 4-1m33 26 2 4 4 1-4 2-2 4-1-4-4-2 4-1"
            fill="#ceb56d"
          />
        </>
      ) : exercise === "elbow" ? (
        <>
          <path
            d="M21 29 6 16q0 16 14 24m14-12 16-13q1 18-14 24"
            fill="#8caf9e"
          />
          <path d="m21 18-1-8 8 7m7 0 7-7-1 11" fill="#efdaa8" />
          <ellipse cx="29" cy="29" rx="14" ry="16" fill="#ecb28a" />
          <ellipse cx="29" cy="37" rx="8" ry="7" fill="#f5dba7" />
          <circle cx="24" cy="26" r="2" fill="#36574a" />
          <circle cx="35" cy="26" r="2" fill="#36574a" />
          <path
            d="M26 32q4 3 7-1"
            stroke="#a37756"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <g className="glyph-butterfly-wings">
            <ellipse
              cx="17"
              cy="22"
              rx="11"
              ry="15"
              transform="rotate(-28 17 22)"
              fill="#b7add3"
            />
            <ellipse
              cx="39"
              cy="22"
              rx="11"
              ry="15"
              transform="rotate(28 39 22)"
              fill="#b7add3"
            />
            <ellipse cx="20" cy="39" rx="9" ry="9" fill="#d4bfda" />
            <ellipse cx="36" cy="39" rx="9" ry="9" fill="#d4bfda" />
          </g>
          <path
            d="M28 19v25m-1-24-5-7m7 7 5-7"
            stroke="#8c8a76"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="28" cy="20" r="4" fill="#9c9a81" />
          <circle cx="15" cy="23" r="3" fill="#f3e0b3" />
          <circle cx="41" cy="23" r="3" fill="#f3e0b3" />
        </>
      )}
    </svg>
  );
}
export function GameTabs({
  selected,
  onSelect,
}: {
  selected: Exercise;
  onSelect: (e: Exercise) => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  return (
    <nav className="forest-games" aria-label="Choose a forest game">
      <div className="games-label">
        <span>✦</span> A forest full of little adventures
      </div>
      <div className="game-tabs" role="tablist" aria-label="Forest games">
        {exerciseOrder.map((item, i) => (
          <button
            key={item}
            ref={(el) => {
              refs.current[i] = el;
            }}
            id={`game-tab-${item}`}
            type="button"
            role="tab"
            aria-selected={selected === item}
            aria-controls="forest-game-panel"
            tabIndex={selected === item ? 0 : -1}
            className={`game-tab game-${item} ${selected === item ? "selected" : ""}`}
            onClick={() => onSelect(item)}
            onKeyDown={(e) => {
              let next = i;
              if (e.key === "ArrowRight") next = (i + 1) % exerciseOrder.length;
              else if (e.key === "ArrowLeft")
                next = (i - 1 + exerciseOrder.length) % exerciseOrder.length;
              else if (e.key === "Home") next = 0;
              else if (e.key === "End") next = exerciseOrder.length - 1;
              else return;
              e.preventDefault();
              refs.current[next]?.focus();
              onSelect(exerciseOrder[next]);
            }}
          >
            <span className="game-tab-art">
              <GameGlyph exercise={item} />
            </span>
            <span className="game-tab-copy">
              <strong>{exercises[item].tab}</strong>
              <small>{exercises[item].short}</small>
            </span>
            <span className="tab-selected-mark">
              {selected === item ? "✦" : "↗"}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}
