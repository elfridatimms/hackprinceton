import { TiltGuide } from "./TiltGuide";
import { GripGuide } from "./GripGuide";
import type { Exercise } from "../movement/exercises";
import { Portrait, SeatIllustration } from "./Illustrations";
export function MovementGuide({
  exercise = "reach",
  direction = "loop",
  compact = false,
}: {
  exercise?: Exercise;
  direction?: "loop" | "up" | "down" | "low" | "high";
  compact?: boolean;
}) {
  if (exercise === "wrist")
    return <TiltGuide direction={direction} compact={compact} />;
  if (exercise === "grip")
    return <GripGuide direction={direction} compact={compact} />;
  const moving =
    direction === "loop" || direction === "up" || direction === "down";
  return (
    <div
      className={`movement-guide ${compact ? "compact" : ""} ${moving ? "guide-moving" : ""} guide-${direction}`}
      role="img"
      aria-label={
        exercise === "reach"
          ? "A seated child gently raises a hand to a firefly and returns it to their lap."
          : "A seated child bends and lowers their elbow to help Luma fly."
      }
    >
      {exercise === "elbow" ? (
        <div className="elbow-example">
          <SeatIllustration />
          <span className="example-light">✦</span>
        </div>
      ) : (
        <svg viewBox="0 0 300 232" fill="none" aria-hidden="true">
          <defs>
            <radialGradient id={compact ? "reachGlowSmall" : "reachGlow"}>
              <stop stopColor="#ffdc77" stopOpacity=".6" />
              <stop offset="1" stopColor="#ffdc77" stopOpacity="0" />
            </radialGradient>
          </defs>
          <ellipse cx="148" cy="214" rx="107" ry="10" fill="#d9e6d2" />
          <path
            d="M117 123v75m0-47h59v47M117 143v-28"
            stroke="#d8b58e"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d="m132 143-5 47m27-47 14 47"
            stroke="#466b73"
            strokeWidth="18"
            strokeLinecap="round"
          />
          <path
            d="m127 191-11 9m52-9 14 9"
            stroke="#f7e4b9"
            strokeWidth="15"
            strokeLinecap="round"
          />
          <path d="M112 98q23-13 48 0l7 47q-26 13-58 0z" fill="#8aaf9b" />
          <path
            d="m156 104 18 24 15-9"
            stroke="#e8ad87"
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="188" cy="118" r="8" fill="#eebc97" />
          <g
            className="reach-arm"
            style={{
              transformOrigin: "112px 103px",
              transform: direction === "high" ? "rotate(95deg)" : undefined,
            }}
          >
            <path
              d="m112 103-13 29-8 28"
              stroke="#edb38c"
              strokeWidth="13"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="m112 103-7 16"
              stroke="#8aaf9b"
              strokeWidth="18"
              strokeLinecap="round"
            />
            <path
              d="m88 158-4-10m8 8-1-12m5 13 2-10m-11 15-8-5"
              stroke="#f0bd97"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <ellipse cx="91" cy="161" rx="8" ry="10" fill="#f0bd97" />
          </g>
          <circle cx="137" cy="70" r="27" fill="#f0bd97" />
          <path
            d="M110 70q-4-36 28-34t27 34l-9-14q-16 4-29-5z"
            fill="#63544b"
          />
          <circle cx="122" cy="45" r="10" fill="#63544b" />
          <circle cx="137" cy="38" r="11" fill="#63544b" />
          <circle cx="153" cy="44" r="10" fill="#63544b" />
          <circle cx="128" cy="72" r="2.5" fill="#294c43" />
          <circle cx="148" cy="72" r="2.5" fill="#294c43" />
          <path
            d="M132 83q6 6 12-1"
            stroke="#aa7560"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <ellipse cx="119" cy="80" rx="5" ry="3" fill="#e8a58e" />
          <ellipse cx="156" cy="80" rx="5" ry="3" fill="#e8a58e" />
          <path
            d="m137 115 3 6 7 1-5 5 1 7-6-4-6 4 1-7-5-5 7-1z"
            fill="#f5df9f"
          />
          <path
            d="M55 170q-27-47 0-82"
            stroke="#b2c7a0"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="4 7"
          />
          <path
            d="m47 93 8-8 4 11"
            stroke="#a4be90"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <g className="guide-firefly">
            <circle
              cx="54"
              cy="67"
              r="29"
              fill={`url(#${compact ? "reachGlowSmall" : "reachGlow"})`}
            />
            <ellipse
              cx="48"
              cy="63"
              rx="7"
              ry="4"
              transform="rotate(-25 48 63)"
              fill="#ffefd1"
            />
            <ellipse
              cx="61"
              cy="63"
              rx="7"
              ry="4"
              transform="rotate(25 61 63)"
              fill="#ffefd1"
            />
            <ellipse cx="54" cy="68" rx="5" ry="7" fill="#e7b14d" />
            <circle cx="53" cy="66" r="2" fill="#fff4b8" />
          </g>
          <path d="m221 43 2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#d2bb77" />
          <circle cx="210" cy="180" r="3" fill="#cfddb8" />
        </svg>
      )}
      <div className="guide-luma">
        <Portrait />
        <span>✦</span>
      </div>
    </div>
  );
}
