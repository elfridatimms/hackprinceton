import type { Landmark, Arm } from "./core";
import type { Exercise } from "./exercises";

export type HandObservation = {
  points: Landmark[];
  label: string;
  score: number;
};
export type Observation = { pose: Landmark[]; hands: HandObservation[] };
export type VisionEngine = {
  name: string;
  detect: (video: HTMLVideoElement, at: number) => Promise<Observation>;
  close: () => void;
};
type HolisticResult = {
  poseLandmarks?: Landmark[];
  leftHandLandmarks?: Landmark[];
  rightHandLandmarks?: Landmark[];
};
type Holistic = {
  setOptions: (options: Record<string, unknown>) => void;
  onResults: (callback: (r: HolisticResult) => void) => void;
  initialize: () => Promise<void>;
  send: (input: { image: HTMLVideoElement }) => Promise<void>;
  close: () => Promise<void>;
};
declare global {
  interface Window {
    Holistic?: new (options: {
      locateFile: (name: string) => string;
    }) => Holistic;
  }
}
let holisticScript: Promise<void> | null = null;
function loadHolistic() {
  if (window.Holistic) return Promise.resolve();
  if (!holisticScript)
    holisticScript = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "/mediapipe/holistic/holistic.js";
      script.onload = () => resolve();
      script.onerror = () => {
        holisticScript = null;
        script.remove();
        reject(new Error("The arm tracker could not load. Try reconnecting."));
      };
      document.head.append(script);
    });
  return holisticScript;
}

/** Same Holistic engine/options as final-thesis-demo; assets are served locally. */
export async function createVisionEngine(
  exercise: Exercise,
): Promise<VisionEngine> {
  if (exercise === "grip" || exercise === "reach") {
    const { FilesetResolver, HandLandmarker } =
      await import("@mediapipe/tasks-vision");
    const files = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
    const detector = await HandLandmarker.createFromOptions(files, {
      baseOptions: {
        modelAssetPath: "/models/hand_landmarker.task",
        delegate: "CPU",
      },
      runningMode: "VIDEO",
      numHands: 2,
      minHandDetectionConfidence: 0.3,
      minHandPresenceConfidence: 0.3,
      minTrackingConfidence: 0.3,
    });
    return {
      name: "Hand Landmarker · CPU",
      detect: async (video, at) => {
        const r = detector.detectForVideo(video, at);
        return {
          pose: [],
          hands: r.landmarks.map((points, i) => ({
            points,
            label: r.handedness[i]?.[0]?.categoryName ?? "",
            score: r.handedness[i]?.[0]?.score ?? 0,
          })),
        };
      },
      close: () => detector.close(),
    };
  }
  await loadHolistic();
  if (!window.Holistic) throw new Error("The arm tracker is unavailable.");
  const holistic = new window.Holistic({
    locateFile: (name) => `/mediapipe/holistic/${name}`,
  });
  holistic.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    enableSegmentation: false,
    smoothSegmentation: false,
    refineFaceLandmarks: false,
    minDetectionConfidence: 0.3,
    minTrackingConfidence: 0.3,
  });
  let latest: Observation = { pose: [], hands: [] };
  let sending = Promise.resolve();
  holistic.onResults((r) => {
    latest = { pose: r.poseLandmarks ?? [], hands: [] };
    if (r.leftHandLandmarks?.length)
      latest.hands.push({
        points: r.leftHandLandmarks,
        label: "Left",
        score: 1,
      });
    if (r.rightHandLandmarks?.length)
      latest.hands.push({
        points: r.rightHandLandmarks,
        label: "Right",
        score: 1,
      });
  });
  try {
    await holistic.initialize();
  } catch (e) {
    void holistic.close();
    throw e;
  }
  return {
    name: "MediaPipe Holistic · smoothed landmarks",
    detect: async (video) => {
      latest = { pose: [], hands: [] };
      sending = holistic.send({ image: video });
      await sending;
      return latest;
    },
    close: () => {
      void sending
        .catch(() => {})
        .then(() => holistic.close())
        .catch(() => {});
    },
  };
}

/** Reference repo's 0.1 visibility hysteresis; caller locks the side for the attempt. */
export function preferredArm(pose: Landmark[], preferred: Arm): Arm | null {
  const confidence = (ids: number[]) =>
    ids.every((i) => pose[i] && (pose[i].visibility ?? 0) >= 0.35)
      ? ids.reduce((n, i) => n + (pose[i].visibility ?? 0), 0) / 3
      : 0;
  const left = confidence([11, 13, 15]),
    right = confidence([12, 14, 16]);
  if (!left && !right) return null;
  return preferred === "left"
    ? right > left + 0.1
      ? "right"
      : "left"
    : left > right + 0.1
      ? "left"
      : "right";
}

/** Spatial continuity avoids handedness-label flicker and array-order hand swaps. */
export class PlayingHand {
  private wrist: Landmark | null = null;
  reset() {
    this.wrist = null;
  }
  select(hands: HandObservation[]) {
    const visible = hands.filter(
      (h) =>
        h.score >= 0.3 &&
        h.points.length === 21 &&
        h.points[0].x >= 0 &&
        h.points[0].x <= 1 &&
        h.points[0].y >= 0 &&
        h.points[0].y <= 1,
    );
    const distance = (h: HandObservation) =>
      this.wrist
        ? Math.hypot(h.points[0].x - this.wrist.x, h.points[0].y - this.wrist.y)
        : 0;
    const selected = this.wrist
      ? [...visible].sort((a, b) => distance(a) - distance(b))[0]
      : [...visible].sort((a, b) => b.score - a.score)[0];
    if (!selected || (this.wrist && distance(selected) > 0.3)) return null;
    this.wrist = selected.points[0];
    return selected;
  }
}
