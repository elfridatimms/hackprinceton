export function SteeringGuide({
  direction = "loop",
  compact = false,
}: {
  direction?: "loop" | "up" | "down" | "low" | "high";
  compact?: boolean;
}) {
  const left = direction === "low" || direction === "down";
  const right = direction === "high" || direction === "up";
  return (
    <div
      className={`movement-guide steering-guide ${compact ? "compact" : ""} steering-${direction}`}
      role="img"
      aria-label="An open hand with fingers pointing up gently leans right to sail a pirate ship right, then leans left to sail back."
    >
      <svg viewBox="0 0 320 232" fill="none" aria-hidden="true">
        <rect x="18" y="16" width="284" height="200" rx="25" fill="#e5efeb" />
        <path
          d="M33 181q28-10 55 0t55 0 55 0 55 0 33 0v25H33z"
          fill="#b6d6d2"
        />
        <path
          d="M40 191q15-5 28 0m92 6q18-5 34 0m48-9q17-4 30 0"
          stroke="#e9f4e6"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <g
          className="steering-hand"
          style={{
            transformOrigin: "160px 132px",
            transform: left
              ? "rotate(-24deg)"
              : right
                ? "rotate(24deg)"
                : undefined,
          }}
        >
          <path
            d="M146 143v-23l-15-20q-5-8 1-11 6-3 12 7l4 5V60q0-9 7-9 6 0 6 9v27-38q0-10 7-10t7 10v38-29q0-10 7-9 6 0 6 9v33-22q0-9 6-8 6 0 6 8v37q0 24-21 37z"
            fill="#edbc96"
          />
          <path d="M148 142h33l3 14h-39z" fill="#88aca1" />
          <path
            d="M158 111q8-5 16 0"
            stroke="#d99e7c"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
        <path
          d="M106 100H65m9-9-10 9 10 9m140-9h41m-9-9 10 9-10 9"
          stroke="#88a8a1"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <g
          className="guide-ship"
          style={{
            transform: left
              ? "translateX(-63px)"
              : right
                ? "translateX(63px)"
                : undefined,
          }}
        >
          <path d="M135 181h52l-9 13h-34z" fill="#ba896b" />
          <path
            d="M158 178v-35"
            stroke="#8b7661"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path d="M162 147q18 6 21 26h-21z" fill="#fff2d0" />
          <path d="m158 144-13 3 13 6z" fill="#5d8f8c" />
          <circle cx="151" cy="186" r="2" fill="#f3d593" />
          <circle cx="170" cy="186" r="2" fill="#f3d593" />
        </g>
        <ellipse cx="59" cy="178" rx="22" ry="8" fill="#e5d4a8" />
        <ellipse cx="261" cy="178" rx="22" ry="8" fill="#e5d4a8" />
        <path
          d="m59 149 3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1zM261 149l3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1z"
          fill="#e8bd67"
        />
        <circle cx="60" cy="51" r="4" fill="#d7e3cf" />
        <path d="m252 44 2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#c6ba7e" />
      </svg>
    </div>
  );
}
