// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from "vitest";
const vision = vi.hoisted(() => ({ hand: vi.fn(), resolve: vi.fn() }));
const runtime = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock("../src/movement/holisticRuntime", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  loadHolisticRuntime: runtime.load,
}));
vi.mock("@mediapipe/tasks-vision", () => ({
  FilesetResolver: { forVisionTasks: vision.resolve },
  HandLandmarker: { createFromOptions: vision.hand },
}));
import {
  createVisionEngine,
  PlayingHand,
  preferredArm,
} from "../src/movement/trackerEngine";
const image = () =>
  Object.assign(document.createElement("canvas"), {
    getContext: () => ({ drawImage: vi.fn() }),
  });
describe("MediaPipe engine selection and repository settings", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });
  it.each(["elbow", "ship", "wrist"] as const)(
    "uses the reference Holistic engine with smoothing for %s",
    async (exercise) => {
      let callback: (r: object) => void = () => {};
      const options = vi.fn(),
        close = vi.fn().mockResolvedValue(undefined),
        send = vi.fn().mockImplementation(async () =>
          callback({
            poseLandmarks: [{ x: 0.2, y: 0.3, visibility: 0.9 }],
            leftHandLandmarks: [{ x: 0.4, y: 0.5 }],
          }),
        );
      const dispose = vi.fn();
      const Holistic = class {
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
      };
      runtime.load.mockResolvedValue({ Holistic, dispose, image: image() });
      const engine = await createVisionEngine(exercise);
      expect(options).toHaveBeenCalledWith(
        expect.objectContaining({
          modelComplexity: 1,
          smoothLandmarks: true,
          minDetectionConfidence: 0.3,
          minTrackingConfidence: 0.3,
        }),
      );
      const video = document.createElement("video");
      Object.defineProperty(video, "videoWidth", { value: 640 });
      Object.defineProperty(video, "videoHeight", { value: 480 });
      const r = await engine.detect(video, 10);
      expect(send.mock.calls[0][0].image).not.toBe(video);
      expect(send.mock.calls[0][0].image.width).toBe(640);
      expect(r.pose).toHaveLength(1);
      expect(r.hands[0].label).toBe("Left");
      engine.close();
      await vi.waitFor(() => {
        expect(close).toHaveBeenCalled();
        expect(dispose).toHaveBeenCalled();
      });
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
  it("disposes a failed initialization and gives the next attempt a fresh runtime", async () => {
    const badDispose = vi.fn(),
      goodDispose = vi.fn();
    class Broken {
      setOptions() {}
      onResults() {}
      initialize() {
        return Promise.reject(new Error("Aborted(Module.arguments)"));
      }
    }
    class Ready {
      setOptions() {}
      onResults() {}
      initialize() {
        return Promise.resolve();
      }
      close() {
        return Promise.resolve();
      }
    }
    runtime.load
      .mockResolvedValueOnce({
        Holistic: Broken,
        dispose: badDispose,
        image: image(),
      })
      .mockResolvedValueOnce({
        Holistic: Ready,
        dispose: goodDispose,
        image: image(),
      });
    await expect(createVisionEngine("elbow")).rejects.toThrow(
      "Module.arguments",
    );
    expect(badDispose).toHaveBeenCalledOnce();
    const engine = await createVisionEngine("elbow");
    engine.close();
    await vi.waitFor(() => expect(goodDispose).toHaveBeenCalledOnce());
  });
  it("cancels a pending initialization and releases its frame", async () => {
    const dispose = vi.fn();
    class Pending {
      setOptions() {}
      onResults() {}
      initialize() {
        return new Promise<void>(() => {});
      }
    }
    runtime.load.mockResolvedValue({
      Holistic: Pending,
      dispose,
      image: image(),
    });
    const controller = new AbortController();
    const result = createVisionEngine("wrist", controller.signal);
    await Promise.resolve();
    controller.abort();
    await expect(result).rejects.toMatchObject({ name: "AbortError" });
    expect(dispose).toHaveBeenCalled();
  });
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
