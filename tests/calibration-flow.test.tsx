// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Setup } from "../src/components/Setup";
import {
  defaultSettings,
  type Session,
  type Settings,
} from "../src/game/session";
import type { Tracking } from "../src/movement/useTracking";
import {
  calibratedRange,
  calibrationEstimate,
} from "../src/movement/calibration";
import { armTrackingMessage, elbowAngle } from "../src/movement/core";

describe("Calibration timing and selected-arm visibility", () => {
  it("accepts a stable arm on a 5 Hz device without requiring 12 frames", () => {
    const samples = Array.from({ length: 6 }, (_, i) => ({
      angle: 120 + (i % 2) * 0.4,
      at: i * 200,
    }));
    expect(calibrationEstimate(samples, 1000).angle).toBeCloseTo(120.4);
  });
  it("rejects a stale or disconnected set of samples", () => {
    const samples = Array.from({ length: 6 }, (_, i) => ({
      angle: 120,
      at: i * 200,
    }));
    expect(calibrationEstimate(samples, 1600).angle).toBeNull();
    expect(
      calibrationEstimate([...samples, { angle: 120, at: 1700 }], 1700).angle,
    ).toBeNull();
  });
  it("uses both real endpoints even when captured in reverse order", () => {
    expect(calibratedRange(65, 150)).toEqual({ lower: 150, upper: 65 });
    expect(calibratedRange(95, 92)).toBeNull();
    expect(calibratedRange(95.2, 90.1)).toEqual({ lower: 95.2, upper: 90.1 });
  });
  it("matches the reference visibility threshold without accepting invisible or missing landmarks", () => {
    const p = Array.from({ length: 33 }, () => ({
      x: 0.5,
      y: 0.5,
      visibility: 0.4,
    }));
    p[12] = { x: 0.5, y: 0.2, visibility: 0.4 };
    p[14] = { x: 0.5, y: 0.5, visibility: 0.4 };
    p[16] = { x: 0.8, y: 0.5, visibility: 0.4 };
    expect(elbowAngle(p, "right", 16 / 9)).toBe(90);
    p[16].visibility = 0.1;
    expect(elbowAngle(p, "right", 16 / 9)).toBeNull();
    expect(armTrackingMessage(p, "right")).toBe(
      "Bring your right wrist into view.",
    );
    expect(elbowAngle(p, "right", NaN)).toBeNull();
  });
});

describe("The calibration screen that previously trapped the user", () => {
  let root: Root, host: HTMLDivElement, tracking: Tracking, settings: Settings;
  const reset = vi.fn(),
    onDemo = vi.fn(),
    save = vi.fn();
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: [
        "setInterval",
        "clearInterval",
        "setTimeout",
        "clearTimeout",
        "performance",
      ],
    });
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn(() => 1),
    );
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      clearRect: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    settings = { ...defaultSettings };
    tracking = {
      status: "on",
      error: "",
      frame: {
        valid: false,
        angle: null,
        at: 0,
        points: [],
        message: "Bring your right wrist into view.",
      },
      video: { current: null },
      start: vi.fn(),
      stop: vi.fn(),
    };
    reset.mockClear();
    onDemo.mockClear();
    save.mockClear();
    render();
  });
  afterEach(() => {
    act(() => root.unmount());
    host.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });
  function render() {
    act(() =>
      root.render(
        <Setup
          session={
            {
              phase: "calibration",
              reset,
              transition: vi.fn(),
            } as unknown as Session
          }
          settings={settings}
          setSettings={(next) => {
            settings = next;
            save(next);
            render();
          }}
          tracking={tracking}
          onClose={vi.fn()}
          onDemo={onDemo}
        />,
      ),
    );
  }
  function frames(angle: number, valid = true, count = 6) {
    for (let i = 0; i < count; i++) {
      act(() => vi.advanceTimersByTime(200));
      tracking = {
        ...tracking,
        frame: {
          ...tracking.frame,
          angle: valid ? angle : null,
          valid,
          at: performance.now(),
        },
      };
      render();
    }
  }
  function button(text: string) {
    return Array.from(host.querySelectorAll("button")).find((b) =>
      b.textContent?.includes(text),
    )!;
  }
  function click(text: string) {
    act(() => button(text).click());
  }
  it("keeps the actual camera canvas, arm choice and explicit demo exit visible during calibration", () => {
    expect(host.querySelector("canvas")).not.toBeNull();
    expect(button("Left arm")).toBeTruthy();
    expect(button("Try without a camera")).toBeTruthy();
    expect(button("Remember this position").disabled).toBe(true);
    click("Try without a camera");
    expect(onDemo).toHaveBeenCalledOnce();
  });
  it("captures low → tracking lost → recovered high and reaches practice", () => {
    frames(150);
    expect(button("Remember this position").disabled).toBe(false);
    click("Remember this position");
    expect(host.textContent).toContain("POSITION 2 OF 2");
    frames(65, false, 1);
    expect(button("Remember this position").disabled).toBe(true);
    frames(65);
    expect(button("Remember this position").disabled).toBe(false);
    click("Remember this position");
    expect(save).toHaveBeenLastCalledWith(
      expect.objectContaining({ lower: 150, upper: 65 }),
    );
    expect(reset).toHaveBeenCalledWith("practice");
  });
  it("never lets an old last-good frame complete calibration", () => {
    frames(150);
    expect(button("Remember this position").disabled).toBe(false);
    act(() => vi.advanceTimersByTime(600));
    expect(button("Remember this position").disabled).toBe(true);
    click("Remember this position");
    expect(reset).not.toHaveBeenCalled();
  });
  it("resets both endpoint history and capture readiness after an explicit arm switch", () => {
    frames(150);
    click("Remember this position");
    click("Left arm");
    expect(settings.arm).toBe("left");
    expect(host.textContent).toContain("POSITION 1 OF 2");
    expect(button("Remember this position").disabled).toBe(true);
  });
  it("offers a configured range but still requires current valid tracking", () => {
    expect(button("Use this range and practice").disabled).toBe(true);
    frames(100, true, 1);
    expect(button("Use this range and practice").disabled).toBe(false);
    click("Use this range and practice");
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ lower: 150, upper: 65 }),
    );
    expect(reset).toHaveBeenCalledWith("practice");
  });
  it("explains near-identical positions and keeps the demo exit usable", () => {
    frames(95);
    click("Remember this position");
    frames(92);
    click("Remember this position");
    expect(host.textContent).toContain("only 3.0° apart");
    expect(reset).not.toHaveBeenCalled();
    click("Try without a camera");
    expect(onDemo).toHaveBeenCalledOnce();
  });
});
