import { SteeringGuide } from "./SteeringGuide";
import { TiltGuide } from "./TiltGuide";
import { GripGuide } from "./GripGuide";
import { ReachGuide } from "./ReachGuide";
import type { Exercise } from "../movement/exercises";
import { Portrait, SeatIllustration } from "./Illustrations";
export function MovementGuide({
  exercise = "reach",
  direction = "loop",
  compact = false,
  handOnly = false,
}: {
  exercise?: Exercise;
  direction?: "loop" | "up" | "down" | "low" | "high";
  compact?: boolean;
  handOnly?: boolean;
}) {
  if (exercise === "ship")
    return (
      <SteeringGuide
        direction={direction}
        compact={compact}
        handOnly={handOnly}
      />
    );
  if (exercise === "wrist")
    return (
      <TiltGuide direction={direction} compact={compact} handOnly={handOnly} />
    );
  if (exercise === "grip")
    return (
      <GripGuide direction={direction} compact={compact} handOnly={handOnly} />
    );
  if (exercise === "reach")
    return <ReachGuide direction={direction} compact={compact} />;
  const moving =
    direction === "loop" || direction === "up" || direction === "down";
  return (
    <div
      className={`movement-guide ${compact ? "compact" : ""} ${moving ? "guide-moving" : ""} guide-${direction}`}
      role="img"
      aria-label="A seated child bends and lowers their elbow to help Luma fly."
    >
      <div className="elbow-example">
        <SeatIllustration />
        <span className="example-light">✦</span>
      </div>
      <div className="guide-luma">
        <Portrait />
        <span>✦</span>
      </div>
    </div>
  );
}
