// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const engine = vi.hoisted(() => ({
  create: vi.fn(),
  detect: vi.fn(),
  close: vi.fn(),
}));
vi.mock("../src/movement/trackerEngine", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  createVisionEngine: engine.create,
}));
import { useTracking, type Tracking } from "../src/movement/useTracking";
import type { Exercise } from "../src/movement/exercises";
const armPose = () => {
  const p = Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.5,
    visibility: 0,
  }));
  p[12] = { x: 0.5, y: 0.2, visibility: 0.9 };
  p[14] = { x: 0.5, y: 0.5, visibility: 0.9 };
  p[16] = { x: 0.7, y: 0.5, visibility: 0.9 };
  return p;
};
const hand = () => {
  const p = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5 }));
  p[0] = { x: 0.5, y: 0.8 };
  p[9] = { x: 0.5, y: 0.6 };
  [8, 12, 16, 20].forEach((id, i) => (p[id] = { x: 0.42 + i * 0.05, y: 0.3 }));
  return p;
};
describe("Camera lifecycle and fresh movement observations", () => {
  let root: Root,
    host: HTMLDivElement,
    tracking: Tracking,
    exercise: Exercise,
    arm: "left" | "right",
    time: number,
    stop: ReturnType<typeof vi.fn>,
    request: ReturnType<typeof vi.fn>;
  function Probe() {
    tracking = useTracking(arm, undefined, exercise);
    return null;
  }
  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance"] });
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    exercise = "elbow";
    arm = "right";
    time = 1;
    stop = vi.fn();
    request = vi.fn().mockResolvedValue({
      getTracks: () => [{ stop }],
      getVideoTracks: () => [{ addEventListener: vi.fn() }],
    });
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: request },
    });
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, "readyState", "get").mockReturnValue(
      2,
    );
    vi.spyOn(
      HTMLMediaElement.prototype,
      "currentTime",
      "get",
    ).mockImplementation(() => time);
    vi.spyOn(HTMLVideoElement.prototype, "videoWidth", "get").mockReturnValue(
      1280,
    );
    vi.spyOn(HTMLVideoElement.prototype, "videoHeight", "get").mockReturnValue(
      720,
    );
    engine.close.mockReset();
    engine.detect.mockReset().mockResolvedValue({ pose: armPose(), hands: [] });
    engine.create.mockReset().mockResolvedValue({
      name: "MediaPipe test engine",
      detect: engine.detect,
      close: engine.close,
    });
    act(() => root.render(<Probe />));
  });
  afterEach(() => {
    act(() => root.unmount());
    host.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });
  it("requests nothing before an explicit start, then closes camera and engine together", async () => {
    expect(request).not.toHaveBeenCalled();
    await act(async () => {
      await tracking.start();
    });
    expect(engine.create).toHaveBeenCalledWith(
      "elbow",
      expect.any(AbortSignal),
    );
    expect(tracking.frame.valid).toBe(true);
    expect(tracking.frame.angle).toBe(90);
    expect(tracking.video.current?.isConnected).toBe(true);
    act(() => tracking.stop());
    expect(stop).toHaveBeenCalled();
    expect(engine.close).toHaveBeenCalledOnce();
    expect(document.querySelector("video")).toBeNull();
  });
  it("invalidates a frozen video instead of presenting an old pose as current", async () => {
    await act(async () => {
      await tracking.start();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(550);
    });
    expect(tracking.frame.valid).toBe(false);
    expect(tracking.frame.angle).toBeNull();
    expect(tracking.frame.message).toContain("camera paused");
  });
  it("releases the stream and video on a real model failure", async () => {
    engine.create.mockRejectedValueOnce(new Error("WASM load failed"));
    await act(async () => {
      await tracking.start();
    });
    expect(tracking.status).toBe("error");
    expect(tracking.error).toContain("WASM load failed");
    expect(stop).toHaveBeenCalled();
    expect(document.querySelector("video")).toBeNull();
  });
  it("keeps technical startup failures in diagnostics and recovers on a fresh retry", async () => {
    engine.create.mockRejectedValueOnce(
      new Error(
        "Aborted(Module.arguments has been replaced with plain arguments_)",
      ),
    );
    await act(async () => {
      await tracking.start();
    });
    expect(tracking.status).toBe("error");
    expect(tracking.error).toBe(
      "The movement tracker couldn’t start. Try the camera again.",
    );
    expect(tracking.diagnostics?.lastError).toContain("Module.arguments");
    await act(async () => {
      await tracking.start();
    });
    expect(tracking.status).toBe("on");
    expect(tracking.frame.valid).toBe(true);
    expect(tracking.error).toBe("");
  });
  it("cancels an older loading game when another game is selected", async () => {
    let release!: (value: object) => void;
    const oldClose = vi.fn();
    engine.create.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    let first!: Promise<void>;
    await act(async () => {
      first = tracking.start();
      await Promise.resolve();
    });
    expect(engine.create).toHaveBeenCalledOnce();
    const firstSignal = engine.create.mock.calls[0][1] as AbortSignal;
    exercise = "grip";
    engine.detect.mockResolvedValue({
      pose: [],
      hands: [{ points: hand(), label: "Right", score: 0.9 }],
    });
    await act(async () => {
      root.render(<Probe />);
    });
    expect(firstSignal.aborted).toBe(true);
    await act(async () => {
      release({ name: "old engine", detect: engine.detect, close: oldClose });
      await first;
    });
    expect(oldClose).toHaveBeenCalledOnce();
    expect(tracking.status).toBe("on");
    expect(tracking.frame.openness).toBeGreaterThan(2);
    expect(tracking.frame.angle).toBeNull();
  });
  it("reports denied permission without switching to demo or loading the tracker", async () => {
    request.mockRejectedValueOnce(
      new DOMException("Denied", "NotAllowedError"),
    );
    await act(async () => {
      await tracking.start();
    });
    expect(tracking.error).toContain("permission");
    expect(engine.create).not.toHaveBeenCalled();
    expect(tracking.frame.valid).toBe(false);
  });
  it("tracks Firefly directly from a hand without shoulders or a body pose", async () => {
    exercise = "reach";
    engine.detect.mockResolvedValue({
      pose: [],
      hands: [{ points: hand(), label: "Right", score: 0.9 }],
    });
    act(() => root.render(<Probe />));
    await act(async () => {
      await tracking.start();
    });
    expect(tracking.frame.valid).toBe(true);
    expect(tracking.frame.height).toBeCloseTo(0.2);
    expect(tracking.frame.angle).toBeNull();
  });
  it("keeps following the same spatial hand when its label flickers", async () => {
    exercise = "grip";
    engine.detect.mockResolvedValue({
      pose: [],
      hands: [{ points: hand(), label: "Right", score: 0.9 }],
    });
    act(() => root.render(<Probe />));
    await act(async () => {
      await tracking.start();
    });
    expect(tracking.frame.openness).toBeGreaterThan(2);
    engine.detect.mockResolvedValue({
      pose: [],
      hands: [{ points: hand(), label: "Left", score: 0.9 }],
    });
    time = 2;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(80);
    });
    expect(tracking.frame.valid).toBe(true);
  });
  it("uses elbow-to-wrist forearm direction for the ship without requiring hand landmarks", async () => {
    exercise = "ship";
    const pose = armPose();
    pose[16] = { x: 0.6, y: 0.2, visibility: 0.9 };
    engine.detect.mockResolvedValue({ pose, hands: [] });
    act(() => root.render(<Probe />));
    await act(async () => {
      await tracking.start();
    });
    expect(tracking.frame.valid).toBe(true);
    expect(tracking.frame.steering).toBeLessThan(0);
    expect(tracking.frame.openness).toBeNull();
  });
  it("locks one visible arm for the attempt and clears measurements on an explicit arm change", async () => {
    const pose = armPose();
    pose[11] = { x: 0.4, y: 0.2, visibility: 0.99 };
    pose[13] = { x: 0.4, y: 0.5, visibility: 0.99 };
    pose[15] = { x: 0.2, y: 0.5, visibility: 0.99 };
    pose[12].visibility = 0.4;
    pose[14].visibility = 0.4;
    pose[16].visibility = 0.4;
    engine.detect.mockResolvedValue({ pose, hands: [] });
    await act(async () => {
      await tracking.start();
    });
    expect(tracking.frame.arm).toBe("left");
    arm = "left";
    act(() => root.render(<Probe />));
    expect(tracking.frame.valid).toBe(false);
  });
});
