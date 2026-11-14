import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import { elbowAngle } from "../src/movement/core";
const output = document.querySelector("#result")!;
async function run(delegate: "GPU" | "CPU") {
  let model: PoseLandmarker | null = null;
  try {
    output.textContent = `Loading actual ${delegate} model…`;
    const files = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
    const image = document.querySelector<HTMLImageElement>("#pose")!;
    await image.decode();
    const started = performance.now();
    model = await PoseLandmarker.createFromOptions(files, {
      baseOptions: {
        modelAssetPath: "/models/pose_landmarker_full.task",
        delegate,
      },
      runningMode: "VIDEO",
      numPoses: 1,
      minPoseDetectionConfidence: 0.3,
      minPosePresenceConfidence: 0.3,
      minTrackingConfidence: 0.3,
    });
    const loaded = performance.now();
    const timings: number[] = [];
    let result;
    for (let i = 0; i < 4; i++) {
      const before = performance.now();
      result = model.detectForVideo(image, before);
      timings.push(Math.round(performance.now() - before));
      await new Promise((resolve) => setTimeout(resolve, 70));
    }
    const finished = performance.now();
    const points = result!.landmarks[0] ?? [];
    output.textContent = JSON.stringify(
      {
        delegate,
        modelLoadMs: Math.round(loaded - started),
        inferenceMs: timings,
        people: result!.landmarks.length,
        landmarks: points.length,
        rightAngle: elbowAngle(
          points,
          "right",
          image.naturalWidth / image.naturalHeight,
        ),
        leftAngle: elbowAngle(
          points,
          "left",
          image.naturalWidth / image.naturalHeight,
        ),
        armLandmarks: [11, 12, 13, 14, 15, 16].map((i) => ({
          id: i,
          ...points[i],
        })),
      },
      null,
      2,
    );
  } catch (error) {
    output.textContent =
      error instanceof Error ? (error.stack ?? error.message) : String(error);
  } finally {
    model?.close();
  }
}
document
  .querySelector("#gpu")!
  .addEventListener("click", () => void run("GPU"));
document
  .querySelector("#cpu")!
  .addEventListener("click", () => void run("CPU"));
