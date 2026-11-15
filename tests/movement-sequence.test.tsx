// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { MotionPreview } from "../src/components/MotionPreview";
import { assessMovement } from "../src/movement/assessment";
describe("Task assessment from current normalized movement", () => {
  it("recognizes the personally calibrated high and low targets, rather than rating clinical form", () => {
    expect(assessMovement(0.5, "high")).toMatchObject({
      state: "moving",
      progress: 0.5,
    });
    expect(assessMovement(0.85, "high").state).toBe("holding");
    expect(assessMovement(0.15, "low").state).toBe("holding");
    expect(assessMovement(0.8, "low").state).toBe("moving");
  });
  it("does not invent progress for lost or nonfinite tracking", () => {
    expect(assessMovement(null, "high")).toMatchObject({
      state: "waiting",
      progress: 0,
    });
    expect(assessMovement(NaN, "low")).toMatchObject({
      state: "waiting",
      progress: 0,
    });
  });
});
describe("Animation before the attempt", () => {
  let host: HTMLDivElement, root: Root;
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ["setInterval", "clearInterval", "performance"],
    });
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
  });
  afterEach(() => {
    act(() => root.unmount());
    host.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });
  it("finishes once after the full example, without a camera or capture controls", () => {
    const done = vi.fn();
    act(() =>
      root.render(
        <MotionPreview
          exercise="grip"
          title="Open your hand."
          duration={3000}
          onDone={done}
        />,
      ),
    );
    expect(host.querySelector("canvas")).toBeNull();
    expect(host.textContent).toContain("Watch first");
    act(() => vi.advanceTimersByTime(2900));
    expect(done).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(100));
    expect(done).toHaveBeenCalledOnce();
    act(() => vi.advanceTimersByTime(5000));
    expect(done).toHaveBeenCalledOnce();
  });
  it("restarts the visible demonstration after the browser tab was hidden", () => {
    let hidden = false;
    vi.spyOn(document, "hidden", "get").mockImplementation(() => hidden);
    const done = vi.fn();
    act(() =>
      root.render(
        <MotionPreview
          exercise="ship"
          title="Tilt your hand."
          duration={3000}
          onDone={done}
        />,
      ),
    );
    act(() => vi.advanceTimersByTime(1500));
    hidden = true;
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    act(() => vi.advanceTimersByTime(10000));
    expect(done).not.toHaveBeenCalled();
    hidden = false;
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    act(() => vi.advanceTimersByTime(2900));
    expect(done).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(100));
    expect(done).toHaveBeenCalledOnce();
  });
});
