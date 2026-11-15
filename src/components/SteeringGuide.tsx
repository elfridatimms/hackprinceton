import { WheelArt } from "./Helm";
export function SteeringGuide({
  direction = "loop",
  compact = false,
  handOnly = false,
}: {
  direction?: "loop" | "up" | "down" | "low" | "high";
  compact?: boolean;
  handOnly?: boolean;
}) {
  const low = direction === "low" || direction === "down",
    high = direction === "high" || direction === "up";
  return (
    <div
      className={`movement-guide ${handOnly ? "hand-only" : ""} steering-guide ${compact ? "compact" : ""} steering-${direction}`}
      role="img"
      aria-label="A bent arm turns from the elbow, moving the forearm left and right like a steering wheel. The elbow stays in one place."
    >
      <svg viewBox="0 0 320 232" fill="none" aria-hidden="true">
        <rect x="18" y="16" width="284" height="200" rx="25" fill="#e5efeb" />
        <path d="M30 195q25-8 50 0t50 0 50 0 50 0 50 0v18H30z" fill="#b6d6d2" />
        <path
          d="M113 176h46"
          stroke="#88aca1"
          strokeWidth="22"
          strokeLinecap="round"
        />
        <g
          className="steering-hand"
          style={{
            transformOrigin: "160px 171px",
            transform: low
              ? "rotate(-24deg)"
              : high
                ? "rotate(24deg)"
                : undefined,
          }}
        >
          <path
            d="M160 171V103"
            stroke="#edbc96"
            strokeWidth="18"
            strokeLinecap="round"
          />
          <path d="M149 108V87q0-7 6-7h14q8 0 8 8v21z" fill="#edbc96" />
          <path d="M147 111h27v12h-27z" fill="#789e91" />
        </g>
        <circle cx="160" cy="171" r="8" fill="#e6ab82" />
        <circle cx="160" cy="171" r="3" fill="#f5d4a8" />
        <g transform="translate(160 82) scale(.68)">
          <g
            className="steering-wheel"
            style={{
              transform: low
                ? "rotate(-55deg)"
                : high
                  ? "rotate(55deg)"
                  : undefined,
            }}
          >
            <WheelArt />
          </g>
        </g>
        <path
          d="M84 69q-13 15-8 35m-6-6 7 7 4-9m113-28q13 15 8 35m6-6-7 7-4-9"
          stroke="#91aaa0"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <text
          x="160"
          y="203"
          textAnchor="middle"
          fill="#58786c"
          fontSize="11"
          fontWeight="600"
        >
          Keep your elbow here.
        </text>
        <g
          className="guide-ship"
          style={{
            transform: low
              ? "translateX(-63px)"
              : high
                ? "translateX(63px)"
                : undefined,
          }}
        >
          <path d="M135 214h50l-10 11h-30z" fill="#ba896b" />
          <path d="M158 212v-24" stroke="#927b5e" strokeWidth="2" />
          <path d="M161 190q15 6 17 19h-17z" fill="#fff1cb" />
        </g>
        <path
          d="m56 39 2 5 5 2-5 2-2 5-2-5-5-2 5-2zm206 96 2 5 5 2-5 2-2 5-2-5-5-2 5-2z"
          fill="#d2bc7c"
        />
      </svg>
    </div>
  );
}
