export function ReachGuide({
  direction = "loop",
  compact = false,
}: {
  direction?: "loop" | "up" | "down" | "low" | "high";
  compact?: boolean;
}) {
  const raised = direction === "up" || direction === "high";
  return (
    <div
      className={`movement-guide reach-fixed-guide reach-fixed-${direction} ${compact ? "compact" : ""}`}
      role="img"
      aria-label="A child rests one elbow and gently lifts the same hand towards a firefly, then lowers it. The other arm rests."
    >
      <svg viewBox="0 0 300 232" fill="none" aria-hidden="true">
        <ellipse cx="146" cy="214" rx="105" ry="9" fill="#dce7d2" />
        <path
          d="M102 133v66m0-51h53v51"
          stroke="#d1b28c"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d="m118 145-5 46m29-46 13 46"
          stroke="#617f7b"
          strokeWidth="17"
          strokeLinecap="round"
        />
        <path
          d="m111 194-12 6m58-6 12 6"
          stroke="#f1dbae"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <path d="M104 101q20-13 43 0l9 45q-26 14-53 0z" fill="#91b39c" />
        <path
          d="m138 106 18 25 12-7"
          stroke="#ecb68f"
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="126" cy="69" r="25" fill="#efbc96" />
        <path d="M101 66q-3-30 25-30t25 30l-11-11q-17 5-28-5z" fill="#6e604d" />
        <circle cx="117" cy="70" r="2.5" fill="#3f5b4d" />
        <circle cx="135" cy="70" r="2.5" fill="#3f5b4d" />
        <path
          d="M120 81q6 5 12-1"
          stroke="#b28065"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <rect x="74" y="154" width="78" height="15" rx="7" fill="#b7c8a8" />
        <path
          d="M83 166v33m60-33v33"
          stroke="#a7b99c"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M108 110v42"
          stroke="#edb78f"
          strokeWidth="13"
          strokeLinecap="round"
        />
        <g
          className="firefly-forearm"
          style={{
            transformOrigin: "108px 151px",
            transform: raised ? "rotate(-82deg)" : undefined,
          }}
        >
          <path
            d="m108 151 33 32"
            stroke="#edb78f"
            strokeWidth="13"
            strokeLinecap="round"
          />
          <ellipse cx="146" cy="186" rx="10" ry="8" fill="#efbd98" />
          <path
            d="m151 181 8-6m-5 11 9-3m-9 8 9 1"
            stroke="#efbd98"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </g>
        <circle cx="108" cy="151" r="7" fill="#ecc98b" />
        <circle cx="108" cy="151" r="3" fill="#f6e2af" />
        <path
          d="M183 177q25-27 1-55m-3 8 3-9 7 5"
          stroke="#a9bf96"
          strokeWidth="2"
          strokeDasharray="3 5"
          strokeLinecap="round"
        />
        <g className="quiet-guide-light">
          <circle cx="178" cy="105" r="23" fill="#f5d675" opacity=".14" />
          <ellipse
            cx="171"
            cy="100"
            rx="10"
            ry="5"
            transform="rotate(-25 171 100)"
            fill="#f4e5bf"
          />
          <ellipse
            cx="186"
            cy="100"
            rx="10"
            ry="5"
            transform="rotate(25 186 100)"
            fill="#f4e5bf"
          />
          <ellipse cx="178" cy="108" rx="8" ry="11" fill="#ebc777" />
          <circle cx="177" cy="104" r="2.5" fill="#fff0b8" />
        </g>
        <text
          x="108"
          y="218"
          textAnchor="middle"
          fontSize="10"
          fontWeight="600"
          fill="#849875"
        >
          Elbow stays here.
        </text>
      </svg>
    </div>
  );
}
