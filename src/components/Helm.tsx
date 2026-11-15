export function WheelArt() {
  return (
    <>
      <circle r="39" fill="#dcb785" stroke="#8e684b" strokeWidth="7" />
      <circle
        r="29"
        fill="#f6edda"
        fillOpacity=".25"
        stroke="#f1d3a1"
        strokeWidth="3"
      />
      {Array.from({ length: 8 }, (_, i) => (
        <g key={i} transform={`rotate(${i * 45})`}>
          <path
            d="M0-11V-52"
            stroke="#9e7754"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <path
            d="M0-43V-53"
            stroke="#e8c28b"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </g>
      ))}
      <circle r="12" fill="#b9885f" stroke="#efcf98" strokeWidth="3" />
      <circle r="4" fill="#f4dda6" />
    </>
  );
}
export function Helm({
  position,
  waiting,
}: {
  position: number;
  waiting: boolean;
}) {
  return (
    <div
      className={`captain-helm ${waiting ? "helm-waiting" : ""}`}
      role="img"
      aria-label={
        waiting
          ? "The steering wheel is paused."
          : `Steering wheel follows your forearm, ${Math.round(position * 100)} percent to the right.`
      }
    >
      <span>YOUR LITTLE HELM</span>
      <svg viewBox="0 0 124 124" fill="none" aria-hidden="true">
        <g transform="translate(62 62)">
          <g
            className="helm-dial"
            transform={`rotate(${(position - 0.5) * 120})`}
          >
            <WheelArt />
          </g>
        </g>
      </svg>
      <small>Turn your arm. Sail!</small>
    </div>
  );
}
