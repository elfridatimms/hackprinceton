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

describe("The short camera start without comfy-spot screens", () => {
  let root: Root, host: HTMLDivElement, tracking: Tracking, settings: Settings;
  const reset = vi.fn(),
    save = vi.fn(),
    onDemo = vi.fn();
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: [
        "setTimeout",
        "clearTimeout",
        "setInterval",
        "clearInterval",
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
        message: "Show your hand.",
      },
      video: { current: null },
      start: vi.fn(),
      stop: vi.fn(),
    };
    reset.mockClear();
    save.mockClear();
    onDemo.mockClear();
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
          settings={settings}
          setSettings={(s) => {
            settings = s;
            save(s);
            render();
          }}
          session={
            { phase: "setup", reset, transition: vi.fn() } as unknown as Session
          }
          tracking={tracking}
          onClose={vi.fn()}
          onDemo={onDemo}
        />,
      ),
    );
  }
  function button(text: string) {
    return Array.from(host.querySelectorAll("button")).find((b) =>
      b.textContent?.includes(text),
    )!;
  }
  function click(text: string) {
    act(() => button(text).click());
  }
  function watch() {
    act(() => vi.advanceTimersByTime(5600));
  }
  function frames(v: number, valid = true, n = 10) {
    for (let i = 0; i < n; i++) {
      act(() => vi.advanceTimersByTime(100));
      tracking = {
        ...tracking,
        frame: {
          valid,
          angle: v,
          openness: v,
          height: v,
          tilt: v,
          steering: v,
          rawValue: v,
          at: performance.now(),
          points: [],
          message: valid ? "I can see your hand." : "Show your hand.",
        },
      };
      render();
    }
  }
  it("shows the animation first, then requests the camera only on the play button", () => {
    expect(
      host.querySelector('[aria-label="Movement demonstration"]'),
    ).not.toBeNull();
    expect(tracking.start).not.toHaveBeenCalled();
    watch();
    click("Let’s play!");
    expect(tracking.start).toHaveBeenCalledOnce();
    expect(host.querySelector("canvas")).not.toBeNull();
    expect(host.textContent).not.toMatch(/find my|comfy spot|save.*position/i);
    expect(host.querySelector(".hold-progress")).toBeNull();
  });
  it("learns one natural movement and starts the game automatically", () => {
    watch();
    click("Let’s play!");
    frames(1.05);
    frames(2.1);
    frames(1.05);
    expect(host.textContent).toContain("You did it!");
    expect(reset).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1000));
    expect(reset).toHaveBeenCalledWith("playing");
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        gripLower: 1.05,
        gripUpper: 2.1,
        personalization: expect.objectContaining({ cycles: 1 }),
      }),
    );
  });
  it("does not turn standing still or missing tracking into a completed movement", () => {
    watch();
    click("Let’s play!");
    frames(1.5, true, 40);
    frames(1.5, false, 10);
    expect(save).not.toHaveBeenCalled();
    expect(reset).not.toHaveBeenCalled();
    click("Play with buttons");
    expect(onDemo).toHaveBeenCalledOnce();
  });
  it.each([
    ["elbow", 150, 65],
    ["wrist", 12, 47],
    ["ship", -18, 22],
    ["reach", -0.7, 0.1],
  ] as const)(
    "learns the %s range during the same brief attempt",
    (exercise, low, high) => {
      settings = { ...settings, exercise };
      render();
      watch();
      click("Let’s play!");
      frames(low);
      frames(high);
      frames(low);
      act(() => vi.advanceTimersByTime(1000));
      expect(reset).toHaveBeenCalledWith("playing");
      expect(save).toHaveBeenCalledWith(
        expect.objectContaining({
          exercise,
          personalization: expect.objectContaining({
            exercise,
            cycles: 1,
            lower: low,
            upper: high,
          }),
        }),
      );
    },
  );
  it("offers current settings through grown-up help without pretending a scan completed", () => {
    watch();
    click("Let’s play!");
    frames(1.5, true, 1);
    click("Start with current settings");
    expect(reset).toHaveBeenCalledWith("playing");
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ personalization: null }),
    );
  });
});
