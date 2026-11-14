import type { Phase } from "./session";
/** New/restarted sessions use reset; transitions within a session follow this graph. */
export const transitions: Record<Phase, readonly Phase[]> = {
  welcome: ["setup", "practice"],
  setup: ["welcome", "calibration", "practice"],
  calibration: ["welcome", "practice", "setup"],
  practice: ["playing", "paused", "welcome"],
  playing: ["paused", "completed", "welcome"],
  paused: ["playing", "practice", "completed", "welcome", "setup"],
  completed: ["welcome", "practice", "setup"],
};
export function canTransition(from: Phase, to: Phase) {
  return from === to || transitions[from].includes(to);
}
