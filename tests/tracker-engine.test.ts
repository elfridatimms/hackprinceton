// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from "vitest";
const vision = vi.hoisted(() => ({ hand: vi.fn(), resolve: vi.fn() }));
vi.mock("@mediapipe/tasks-vision", () => ({
  FilesetResolver: { forVisionTasks: vision.resolve },
  HandLandmarker: { createFromOptions: vision.hand },
}));
import {
  createVisionEngine,
  PlayingHand,
  preferredArm,
} from "../src/movement/trackerEngine";
describe("MediaPipe engine selection and repository settings", () => {
  afterEach(() => {
    delete window.Holistic;
    vi.clearAllMocks();
  });
  it.each(["elbow", "ship", "wrist"] as const)(
    "uses the reference Holistic engine with smoothing for %s",
    async (exercise) => {
      let callback: (r: object) => void = () => {};
      const options = vi.fn(),
        close = vi.fn().mockResolvedValue(undefined),
        send = vi
          .fn()
          .mockImplementation(async () =>
            callback({
              poseLandmarks: [{ x: 0.2, y: 0.3, visibility: 0.9 }],
              leftHandLandmarks: [{ x: 0.4, y: 0.5 }],
            }),
          );
      window.Holistic = class {
        constructor(public input: { locateFile: (n: string) => string }) {
          expect(input.locateFile("holistic.binarypb")).toBe(
            "/mediapipe/holistic/holistic.binarypb",
          );
        }
        setOptions = options;
        onResults = (cb: typeof callback) => {
          callback = cb;
        };
        initialize = async () => {};
        send = send;
        close = close;
      } as unknown as typeof window.Holistic;
      const engine = await createVisionEngine(exercise);
      expect(options).toHaveBeenCalledWith(
        expect.objectContaining({
          modelComplexity: 1,
          smoothLandmarks: true,
          minDetectionConfidence: 0.3,
          minTrackingConfidence: 0.3,
        }),
      );
      const r = await engine.detect(document.createElement("video"), 10);
      expect(r.pose).toHaveLength(1);
      expect(r.hands[0].label).toBe("Left");
      engine.close();
      await vi.waitFor(() => expect(close).toHaveBeenCalled());
    },
  );
  it.each(["reach", "grip"] as const)(
    "uses direct hand detection for %s without requiring a body",
    async (exercise) => {
      vision.resolve.mockResolvedValue({});
      vision.hand.mockResolvedValue({
        detectForVideo: () => ({ landmarks: [], handedness: [] }),
        close: vi.fn(),
      });
      await createVisionEngine(exercise);
      expect(vision.hand).toHaveBeenCalledWith(
        {},
        expect.objectContaining({
          numHands: 2,
          minHandDetectionConfidence: 0.3,
          minTrackingConfidence: 0.3,
        }),
      );
    },
  );
  it("uses visibility hysteresis instead of flipping arm at similar confidences", () => {
    const p = Array.from({ length: 33 }, () => ({
      x: 0.5,
      y: 0.5,
      visibility: 0,
    }));
    [11, 13, 15].forEach((i) => (p[i].visibility = 0.75));
    [12, 14, 16].forEach((i) => (p[i].visibility = 0.8));
    expect(preferredArm(p, "left")).toBe("left");
    [12, 14, 16].forEach((i) => (p[i].visibility = 0.9));
    expect(preferredArm(p, "left")).toBe("right");
  });
  it("does not jump to another hand when array order or label changes", () => {
    const h = (x: number, label: string) => ({
      points: Array.from({ length: 21 }, () => ({ x, y: 0.5 })),
      label,
      score: 0.9,
    });
    const tracker = new PlayingHand();
    expect(tracker.select([h(0.2, "Left")])?.points[0].x).toBe(0.2);
    expect(
      tracker.select([h(0.8, "Left"), h(0.22, "Right")])?.points[0].x,
    ).toBe(0.22);
    expect(tracker.select([h(0.8, "Right")])).toBeNull();
  });
});
