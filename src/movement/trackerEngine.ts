import {
  loadHolisticRuntime,
  trackingAborted,
  type Holistic,
} from "./holisticRuntime";
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
/** Same Holistic engine/options as final-thesis-demo; assets are served locally. */
export async function createVisionEngine(
  exercise: Exercise,
  signal?: AbortSignal,
): Promise<VisionEngine> {
  if (exercise === "grip") {
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
    if (signal?.aborted) {
      detector.close();
      throw trackingAborted();
    }
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
  const runtime = await loadHolisticRuntime(signal);
  if (signal?.aborted) {
    runtime.dispose();
    throw trackingAborted();
  }
  let holistic: Holistic;
  const image = runtime.image;
  let context: CanvasRenderingContext2D;
  try {
    holistic = new runtime.Holistic({
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
    const drawing = image.getContext("2d", { alpha: false });
    if (!drawing)
      throw new Error(
        "The movement tracker could not read the camera picture.",
      );
    context = drawing;
  } catch (e) {
    runtime.dispose();
    throw e;
  }
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
  let cancelInitialize: (() => void) | undefined;
  const cancelled = new Promise<never>((_, reject) => {
    cancelInitialize = () => {
      runtime.dispose();
      reject(trackingAborted());
    };
    signal?.addEventListener("abort", cancelInitialize, { once: true });
  });
  try {
    await Promise.race([holistic.initialize(), cancelled]);
  } catch (e) {
    // A failed initialization is never reused by a retry.
    runtime.dispose();
    throw e;
  } finally {
    if (cancelInitialize)
      signal?.removeEventListener("abort", cancelInitialize);
  }
  let closed = false;
  return {
    name: "MediaPipe Holistic · smoothed landmarks",
    detect: async (video) => {
      latest = { pose: [], hands: [] };
      // Holistic uses realm-specific element checks. Copy into its own canvas so
      // a video from the parent window cannot be mistaken for a zero-sized image.
      if (video.videoWidth <= 0 || video.videoHeight <= 0) return latest;
      if (
        image.width !== video.videoWidth ||
        image.height !== video.videoHeight
      ) {
        image.width = video.videoWidth;
        image.height = video.videoHeight;
      }
      context.drawImage(video, 0, 0, image.width, image.height);
      sending = holistic.send({ image });
      await sending;
      return latest;
    },
    close: () => {
      if (closed) return;
      closed = true;
      void sending
        .catch(() => {})
        .then(() => holistic.close())
        .catch(() => {})
        .finally(() => runtime.dispose());
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
