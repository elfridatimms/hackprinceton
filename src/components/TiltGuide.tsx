export function TiltGuide({
  direction = "loop",
  compact = false,
  handOnly = false,
}: {
  direction?: "loop" | "up" | "down" | "low" | "high";
  compact?: boolean;
  handOnly?: boolean;
}) {
  return (
    <div
      className={`movement-guide ${handOnly ? "hand-only" : ""} tilt-guide ${compact ? "compact" : ""} tilt-${direction}`}
      role="img"
      aria-label="A supported hand gently tilts upward to lift a butterfly, then returns to its comfortable resting position."
    >
      <svg
        viewBox={handOnly ? "30 105 185 90" : "0 0 320 232"}
        fill="none"
        aria-hidden="true"
      >
        <ellipse cx="153" cy="210" rx="115" ry="9" fill="#dbe6d1" />
        <rect x="34" y="159" width="168" height="27" rx="13" fill="#c4d4bb" />
        <path d="M35 142h95v27H35" fill="#efbc96" />
        <path d="M35 140h35v31H35z" fill="#9db8bf" />
        <g
          className="tilting-hand"
          style={{
            transformOrigin: "129px 150px",
            transform:
              direction === "high" || direction === "up"
                ? "rotate(-34deg)"
                : undefined,
          }}
        >
          <path
            d="m128 140 28-9 39 3q11 2 9 9-2 4-10 4l-34-1 27 7q10 3 7 9-2 4-11 3l-29-6-24 8z"
            fill="#efbc96"
          />
          <path d="m145 139 17-13q8-7 11-1 2 5-5 12" fill="#efbc96" />
          <path
            d="m160 143 34 1m-37 8 29 8"
            stroke="#dda67e"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </g>
        <path
          d="M190 103q21-20 49-20m-7-5 8 5-8 7"
          stroke="#b9c9a1"
          strokeWidth="2"
          strokeDasharray="3 5"
          strokeLinecap="round"
        />
        <g
          className="guide-butterfly"
          style={{ transformOrigin: "254px 87px" }}
        >
          <g className="guide-butterfly-wings">
            <ellipse
              cx="236"
              cy="75"
              rx="16"
              ry="24"
              transform="rotate(-28 236 75)"
              fill="#b7acd2"
            />
            <ellipse
              cx="272"
              cy="75"
              rx="16"
              ry="24"
              transform="rotate(28 272 75)"
              fill="#b7acd2"
            />
            <ellipse cx="240" cy="103" rx="14" ry="14" fill="#d2bcd8" />
            <ellipse cx="268" cy="103" rx="14" ry="14" fill="#d2bcd8" />
            <circle cx="233" cy="72" r="4" fill="#f1ddb5" />
            <circle cx="275" cy="72" r="4" fill="#f1ddb5" />
          </g>
          <path
            d="M254 68v43m-2-41-6-10m10 10 6-10"
            stroke="#92917b"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <circle cx="254" cy="67" r="6" fill="#9b9a7f" />
        </g>
        <path
          d="m86 64 2 5 5 2-5 2-2 5-2-5-5-2 5-2zM206 45l1 3 3 1-3 1-1 3-1-3-3-1 3-1z"
          fill="#c6b77c"
        />
      </svg>
    </div>
  );
}
