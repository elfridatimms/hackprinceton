// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from "vitest";
import { loadHolisticRuntime } from "../src/movement/holisticRuntime";
const frames = () =>
  Array.from(
    document.querySelectorAll<HTMLIFrameElement>(
      "iframe[data-mediapipe-runtime]",
    ),
  );
const ready = (frame: HTMLIFrameElement) => {
  Object.assign(frame.contentWindow!, { Holistic: class {} });
  frame.dispatchEvent(new Event("load"));
};
afterEach(() => {
  frames().forEach((frame) => frame.remove());
  vi.restoreAllMocks();
  vi.useRealTimers();
});
describe("Isolated legacy MediaPipe runtime", () => {
  it("uses separate windows for overlapping starts without reading or changing a Tasks Module", async () => {
    const module = Object.defineProperty({}, "arguments", {
      get() {
        throw new Error("Aborted(Module.arguments)");
      },
    });
    Object.defineProperty(window, "Module", {
      value: module,
      configurable: true,
    });
    const first = loadHolisticRuntime(),
      second = loadHolisticRuntime();
    const [a, b] = frames();
    expect(a.contentWindow).not.toBe(b.contentWindow);
    expect(a.src).toContain("/mediapipe/holistic/runtime.html");
    ready(a);
    ready(b);
    const [one, two] = await Promise.all([first, second]);
    expect(one.Holistic).not.toBe(two.Holistic);
    expect(one.image.ownerDocument).toBe(a.contentDocument);
    expect(two.image.ownerDocument).toBe(b.contentDocument);
    expect(one.image.ownerDocument).not.toBe(document);
    expect((window as unknown as { Module: object }).Module).toBe(module);
    one.dispose();
    two.dispose();
    expect(frames()).toHaveLength(0);
    delete (window as unknown as { Module?: object }).Module;
  });
  it("removes an aborted load and lets a new attempt start", async () => {
    const controller = new AbortController(),
      attempt = loadHolisticRuntime(controller.signal);
    controller.abort();
    await expect(attempt).rejects.toMatchObject({ name: "AbortError" });
    expect(frames()).toHaveLength(0);
    const next = loadHolisticRuntime();
    ready(frames()[0]);
    const runtime = await next;
    runtime.dispose();
    expect(frames()).toHaveLength(0);
  });
  it("does not create a frame for an already-cancelled start", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(loadHolisticRuntime(controller.signal)).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(frames()).toHaveLength(0);
  });
  it("releases a frame when its script cannot load", async () => {
    const attempt = loadHolisticRuntime();
    frames()[0].dispatchEvent(new Event("load"));
    await expect(attempt).rejects.toThrow("could not load");
    expect(frames()).toHaveLength(0);
  });
  it("times out a stalled frame instead of leaving the camera starting forever", async () => {
    vi.useFakeTimers();
    const attempt = loadHolisticRuntime(),
      expectation = expect(attempt).rejects.toThrow("too long");
    await vi.advanceTimersByTimeAsync(20000);
    await expectation;
    expect(frames()).toHaveLength(0);
  });
});
