import { Portrait } from "./Illustrations";
export function GripGuide({
  direction = "loop",
  compact = false,
}: {
  direction?: "loop" | "up" | "down" | "low" | "high";
  compact?: boolean;
}) {
  const animated = ["loop", "up", "down"].includes(direction);
  return (
    <div
      className={`movement-guide grip-guide ${compact ? "compact" : ""} ${animated ? "grip-moving" : ""} grip-${direction}`}
      role="img"
      aria-label="A hand opens its fingers to wake a sleepy flower, then closes softly into a loose fist."
    >
      <svg viewBox="0 0 320 232" fill="none" aria-hidden="true">
        <ellipse cx="144" cy="214" rx="113" ry="9" fill="#dce7d1" />
        <path d="M101 203v-45h39v45" fill="#f2bf98" />
        <path d="M99 185h44v23H99z" fill="#a9bfc3" />
        <path d="M99 186h44" stroke="#90aeb2" strokeWidth="4" />
        {[
          { x: 94, top: 76 },
          { x: 112, top: 61 },
          { x: 130, top: 67 },
          { x: 148, top: 82 },
        ].map((f, i) => (
          <g
            key={i}
            className="grip-finger"
            style={{
              transformOrigin: `${f.x}px 123px`,
              transform: direction === "high" ? "scaleY(1)" : "scaleY(.18)",
            }}
          >
            <path
              d={`M${f.x} 127V${f.top}`}
              stroke="#f0b98f"
              strokeWidth="15"
              strokeLinecap="round"
            />
            <path
              d={`M${f.x - 3} ${f.top + 5}v5`}
              stroke="#f7cca8"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </g>
        ))}
        <path d="M85 121q31-9 69 0v31q-3 29-34 29-36 0-35-29z" fill="#f0b98f" />
        <g
          className="grip-thumb"
          style={{
            transformOrigin: "93px 150px",
            transform: direction === "high" ? "rotate(0deg)" : "rotate(48deg)",
          }}
        >
          <path
            d="m92 151-17-22-13-10"
            stroke="#f0b98f"
            strokeWidth="18"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="m64 117 4 3"
            stroke="#f9cfaa"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>
        <path
          d="m102 143 10-8 17 3m-24 16 21 6"
          stroke="#dea77e"
          strokeWidth="2"
          strokeLinecap="round"
          opacity=".65"
        />
        <g className="guide-garden">
          <path
            d="M246 199q-15-44-6-78"
            stroke="#78a178"
            strokeWidth="9"
            strokeLinecap="round"
          />
          <ellipse
            cx="224"
            cy="166"
            rx="17"
            ry="9"
            transform="rotate(27 224 166)"
            fill="#a5bd87"
          />
          <ellipse
            cx="258"
            cy="151"
            rx="19"
            ry="9"
            transform="rotate(-30 258 151)"
            fill="#9bb985"
          />
          <ellipse cx="245" cy="205" rx="34" ry="8" fill="#d4dfbd" />
          <g transform="translate(239 91)">
            <g
              className="guide-flower-petals"
              style={{
                transform: direction === "high" ? "scale(1)" : "scale(.35)",
              }}
            >
              {Array.from({ length: 7 }, (_, i) => (
                <g key={i} transform={`rotate(${(i * 360) / 7})`}>
                  <ellipse
                    cy="-26"
                    rx="15"
                    ry="27"
                    fill={i % 2 ? "#edb8aa" : "#f0c6b7"}
                  />
                </g>
              ))}
            </g>
            <circle r="23" fill="#f2d48a" />
            <g className="flower-eyes">
              <path
                d="M-11 1q4 4 7 0m9 0q4 4 7 0"
                stroke="#8a8055"
                strokeWidth="2.3"
                strokeLinecap="round"
              />
              <path
                d="M-3 9q4 4 7-1"
                stroke="#b29c61"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </g>
            <ellipse cx="-13" cy="8" rx="4" ry="2" fill="#e5b777" />
            <ellipse cx="14" cy="8" rx="4" ry="2" fill="#e5b777" />
          </g>
          <path
            d="m279 48 2 5 5 2-5 2-2 5-2-5-5-2 5-2zM200 51l1 3 3 1-3 1-1 3-1-3-3-1 3-1z"
            fill="#cfb66f"
          />
        </g>
        <path
          d="M178 111q14-11 30-4m-7-6 8 5-7 7"
          stroke="#bbcaa1"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="3 5"
        />
        <circle cx="42" cy="173" r="3" fill="#d5dfbf" />
      </svg>
      <div className="grip-luma">
        <Portrait />
      </div>
    </div>
  );
}
