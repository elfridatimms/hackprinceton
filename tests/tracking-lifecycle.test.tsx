// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const vision = vi.hoisted(() => ({
  create: vi.fn(),
  handCreate: vi.fn(),
  resolve: vi.fn(),
}));
vi.mock("@mediapipe/tasks-vision", () => ({
  FilesetResolver: { forVisionTasks: vision.resolve },
  PoseLandmarker: { createFromOptions: vision.create },
  HandLandmarker: { createFromOptions: vision.handCreate },
}));
import { useTracking, type Tracking } from "../src/movement/useTracking";

describe("Camera / MediaPipe lifecycle", () => {
  let root: Root,
    host: HTMLDivElement,
    tracking: Tracking,
    arm: "left" | "right",
    exercise: "elbow" | "grip" | "wrist" | "ship",
    stop: ReturnType<typeof vi.fn>,
    getUserMedia: ReturnType<typeof vi.fn>;
  const detector = { detectForVideo: vi.fn(), close: vi.fn() };
  function Probe() {
    tracking = useTracking(arm, undefined, exercise);
    return null;
  }
  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    arm = "right";
    exercise = "elbow";
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    stop = vi.fn();
    getUserMedia = vi.fn().mockResolvedValue({
      getTracks: () => [{ stop }],
      getVideoTracks: () => [{ addEventListener: vi.fn() }],
    });
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia },
    });
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, "readyState", "get").mockReturnValue(
      2,
    );
    vi.spyOn(HTMLMediaElement.prototype, "currentTime", "get").mockReturnValue(
      1,
    );
    vi.spyOn(HTMLVideoElement.prototype, "videoWidth", "get").mockReturnValue(
      1280,
    );
    vi.spyOn(HTMLVideoElement.prototype, "videoHeight", "get").mockReturnValue(
      720,
    );
    vision.resolve.mockReset().mockResolvedValue({});
    vision.create.mockReset().mockResolvedValue(detector);
    vision.handCreate.mockReset().mockResolvedValue(detector);
    detector.close.mockClear();
    detector.detectForVideo.mockReset().mockReturnValue({ landmarks: [[]] });
    act(() => root.render(<Probe />));
  });
  afterEach(() => {
    act(() => root.unmount());
    host.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });
  it("does not request camera permission until explicitly started", () => {
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(tracking!.status).toBe("off");
  });
  it("uses the full model on CPU without WebGL warm-up, reference confidence settings and one person", async () => {
    await act(async () => {
      await tracking.start();
    });
    expect(getUserMedia).toHaveBeenCalledWith({
      audio: false,
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: "user",
      },
    });
    expect(vision.create).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        numPoses: 1,
        baseOptions: {
          modelAssetPath: "/models/pose_landmarker_full.task",
          delegate: "CPU",
        },
        minPoseDetectionConfidence: 0.3,
        minPosePresenceConfidence: 0.3,
        minTrackingConfidence: 0.3,
      }),
    );
    expect(tracking!.status).toBe("on");
    expect(tracking!.video.current?.isConnected).toBe(true);
    expect(tracking!.frame.valid).toBe(false);
    act(() => tracking.stop());
    expect(stop).toHaveBeenCalled();
    expect(detector.close).toHaveBeenCalledOnce();
  });
  it("reports a real model failure and releases the attached video", async () => {
    vision.create.mockRejectedValueOnce(new Error("WASM load failed"));
    await act(async () => {
      await tracking.start();
    });
    expect(tracking!.status).toBe("error");
    expect(tracking!.error).toContain("WASM load failed");
    expect(stop).toHaveBeenCalled();
    expect(document.querySelector("video")).toBeNull();
  });
  it("accepts only real selected-arm landmarks and clears them immediately after switching arms", async () => {
    const points = Array.from({ length: 33 }, () => ({
      x: 0.5,
      y: 0.5,
      visibility: 0,
    }));
    points[12] = { x: 0.5, y: 0.2, visibility: 0.4 };
    points[14] = { x: 0.5, y: 0.5, visibility: 0.4 };
    points[16] = { x: 0.8, y: 0.5, visibility: 0.4 };
    detector.detectForVideo.mockReturnValue({ landmarks: [points] });
    await act(async () => {
      await tracking.start();
    });
    expect(tracking!.frame.valid).toBe(true);
    expect(tracking!.frame.angle).toBe(90);
    arm = "left";
    act(() => root.render(<Probe />));
    expect(tracking!.frame.valid).toBe(false);
    expect(tracking!.frame.angle).toBeNull();
  });
  it("invalidates the last good pose when the video stops delivering new frames", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance"] });
    const points = Array.from({ length: 33 }, () => ({
      x: 0.5,
      y: 0.5,
      visibility: 0,
    }));
    points[12] = { x: 0.5, y: 0.2, visibility: 0.4 };
    points[14] = { x: 0.5, y: 0.5, visibility: 0.4 };
    points[16] = { x: 0.8, y: 0.5, visibility: 0.4 };
    detector.detectForVideo.mockReturnValue({ landmarks: [points] });
    await act(async () => {
      await tracking.start();
    });
    expect(tracking!.frame.valid).toBe(true);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(tracking!.frame.valid).toBe(false);
    expect(tracking!.frame.angle).toBeNull();
    expect(tracking!.frame.message).toContain("camera paused");
  });
  it("shows denied permission as an error without switching to demo", async () => {
    getUserMedia.mockRejectedValueOnce(
      new DOMException("Denied", "NotAllowedError"),
    );
    await act(async () => {
      await tracking.start();
    });
    expect(tracking!.status).toBe("error");
    expect(tracking!.error).toContain("permission");
    expect(tracking!.frame.valid).toBe(false);
    expect(vision.create).not.toHaveBeenCalled();
  });
  it("tracks actual hand landmarks without pretending they have pose visibility scores", async () => {
    exercise = "grip";
    act(() => root.render(<Probe />));
    const points = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5 }));
    points[0] = { x: 0.5, y: 0.8 };
    points[9] = { x: 0.5, y: 0.6 };
    [8, 12, 16, 20].forEach(
      (id, i) => (points[id] = { x: 0.42 + i * 0.05, y: 0.3 }),
    );
    detector.detectForVideo.mockReturnValue({
      landmarks: [points],
      handedness: [[{ categoryName: "Right", score: 0.98 }]],
    });
    await act(async () => {
      await tracking.start();
    });
    expect(vision.handCreate).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        numHands: 1,
        baseOptions: {
          modelAssetPath: "/models/hand_landmarker.task",
          delegate: "CPU",
        },
      }),
    );
    expect(tracking!.frame.valid).toBe(true);
    expect(tracking!.frame.openness).toBeGreaterThan(2);
    expect(tracking!.frame.angle).toBeNull();
    expect(vision.create).not.toHaveBeenCalled();
  });
  it("uses the hand tracker and a separate tilt signal for Butterfly Breeze", async () => {
    exercise = "wrist";
    act(() => root.render(<Probe />));
    const points = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5 }));
    points[0] = { x: 0.4, y: 0.6 };
    points[9] = { x: 0.6, y: 0.4 };
    detector.detectForVideo.mockReturnValue({
      landmarks: [points],
      handedness: [[{ categoryName: "Right", score: 0.98 }]],
    });
    await act(async () => {
      await tracking.start();
    });
    expect(vision.handCreate).toHaveBeenCalledOnce();
    expect(vision.create).not.toHaveBeenCalled();
    expect(tracking!.frame.valid).toBe(true);
    expect(tracking!.frame.tilt).toBeGreaterThan(0);
    expect(tracking!.frame.openness).toBeNull();
    expect(tracking!.frame.angle).toBeNull();
  });
  it("uses filtered signed hand steering for Pirate Ship, with other signals empty", async () => {
    exercise = "ship";
    act(() => root.render(<Probe />));
    const points = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5 }));
    points[0] = { x: 0.5, y: 0.7 };
    points[9] = { x: 0.6, y: 0.4 };
    detector.detectForVideo.mockReturnValue({
      landmarks: [points],
      handedness: [[{ categoryName: "Left", score: 0.98 }]],
    });
    await act(async () => {
      await tracking.start();
    });
    expect(vision.handCreate).toHaveBeenCalledOnce();
    expect(vision.create).not.toHaveBeenCalled();
    expect(tracking!.frame.valid).toBe(true);
    expect(tracking!.frame.steering).toBeLessThan(0);
    expect(tracking!.frame.tilt).toBeNull();
    expect(tracking!.frame.openness).toBeNull();
    expect(tracking!.frame.angle).toBeNull();
    act(() => tracking.stop());
    expect(tracking!.frame.steering).toBeUndefined();
  });
});
