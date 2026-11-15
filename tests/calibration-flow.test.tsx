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
    settings = { ...defaultSettings, exercise: "elbow" };
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
          openness: valid ? angle : null,
          height: valid ? angle : null,
          tilt: valid ? angle : null,
          steering: valid ? angle : null,
          valid,
          at: performance.now(),
        },
      };
      render();
    }
  }
  function holdSpot(value: number) {
    frames(value, true, 18);
  }
  function button(text: string) {
    return Array.from(host.querySelectorAll("button")).find(
      (b) =>
        b.textContent?.includes(text) || b.getAttribute("aria-label") === text,
    )!;
  }
  function click(text: string) {
    act(() => button(text).click());
  }
  it("keeps the actual camera canvas, arm choice and explicit demo exit visible during calibration", () => {
    expect(host.querySelector("canvas")).not.toBeNull();
    expect(button("Left hand")).toBeTruthy();
    expect(button("Play with buttons")).toBeTruthy();
    expect(button("Remember this position")).toBeUndefined();
    click("Play with buttons");
    expect(onDemo).toHaveBeenCalledOnce();
  });
  it("captures low → tracking lost → recovered high and reaches practice", () => {
    holdSpot(150);
    expect(host.textContent).toContain("Bend your elbow a little.");
    frames(65, false, 1);
    expect(button("Remember this position")).toBeUndefined();
    holdSpot(65);
    expect(reset).not.toHaveBeenCalled();
    expect(host.textContent).toContain("Your turn!");
    frames(150);
    frames(65);
    frames(150);
    frames(65);
    frames(150);
    click("Let’s try my magic");
    expect(save).toHaveBeenLastCalledWith(
      expect.objectContaining({ lower: 150, upper: 65 }),
    );
    expect(reset).toHaveBeenCalledWith("practice");
  });
  it("never lets old last-good data finish an automatic hold", () => {
    frames(150, true, 10);
    act(() => vi.advanceTimersByTime(600));
    expect(
      host
        .querySelector('[aria-label="Automatic position capture"]')
        ?.getAttribute("aria-valuenow"),
    ).toBe("0");
    expect(host.textContent).toContain("Let your arm come down.");
    expect(reset).not.toHaveBeenCalled();
    holdSpot(150);
    expect(host.textContent).toContain("Bend your elbow a little.");
  });
  it("waits for a different second spot rather than saving the first position twice", () => {
    holdSpot(150);
    frames(150, true, 30);
    expect(host.textContent).toContain("Bend your elbow a little.");
    expect(host.textContent).not.toContain("Your turn!");
    expect(reset).not.toHaveBeenCalled();
    holdSpot(65);
    expect(host.textContent).toContain("Your turn!");
  });
  it("resets both endpoint history and capture readiness after an explicit arm switch", () => {
    holdSpot(150);
    click("Left hand");
    expect(settings.arm).toBe("left");
    expect(host.textContent).toContain("Let your arm come down.");
    expect(button("Remember this position")).toBeUndefined();
  });
  it("offers a configured range but still requires current valid tracking", () => {
    expect(button("Use this range and practice").disabled).toBe(true);
    frames(100, true, 1);
    expect(button("Use this range and practice").disabled).toBe(false);
    click("Use this range and practice");
    click("Use my two saved spots without extra tuning");
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ lower: 150, upper: 65 }),
    );
    expect(reset).toHaveBeenCalledWith("practice");
  });
  it("explains near-identical positions and keeps the demo exit usable", () => {
    holdSpot(95);
    holdSpot(92);
    expect(host.textContent).toContain("Bend your elbow a little.");
    expect(reset).not.toHaveBeenCalled();
    click("Play with buttons");
    expect(onDemo).toHaveBeenCalledOnce();
  });
  it("shows the game response only from fresh camera movement and pauses it on loss", () => {
    settings = { ...settings, exercise: "grip" };
    render();
    frames(1.1, true, 1);
    expect(
      host.querySelector(".movement-response")?.getAttribute("data-position"),
    ).toBe("0.000");
    frames(1.65, true, 1);
    expect(
      Number(
        host.querySelector(".movement-response")?.getAttribute("data-position"),
      ),
    ).toBeCloseTo(0.5);
    const petals = host
      .querySelector(".response-petals")
      ?.getAttribute("style");
    frames(1.65, false, 1);
    expect(host.querySelector(".response-petals")?.getAttribute("style")).toBe(
      petals,
    );
    expect(
      host.querySelector(".movement-response")?.getAttribute("data-position"),
    ).toBe("waiting");
    expect(host.querySelector(".response-waiting")).not.toBeNull();
  });
  it("calibrates a softly closed and comfortably open hand without exposing angles to the child", () => {
    settings = { ...settings, exercise: "grip" };
    render();
    expect(host.textContent).toContain("Make a soft fist.");
    expect(
      host.querySelector(".child-calibration-visual")?.textContent,
    ).not.toContain("°");
    holdSpot(1.05);
    expect(host.textContent).toContain("Open your hand.");
    holdSpot(2.1);
    expect(reset).not.toHaveBeenCalled();
    frames(1.05);
    frames(2.1);
    frames(1.05);
    frames(2.1);
    frames(1.05);
    click("Let’s try my magic");
    expect(save).toHaveBeenLastCalledWith(
      expect.objectContaining({
        exercise: "grip",
        gripLower: 1.05,
        gripUpper: 2.1,
      }),
    );
    expect(reset).toHaveBeenCalledWith("practice");
  });
  it("calibrates the butterfly game independently from finger opening", () => {
    settings = { ...settings, exercise: "wrist" };
    render();
    expect(host.textContent).toContain("Rest your hand.");
    holdSpot(12);
    expect(host.textContent).toContain("Tilt your hand up a little.");
    holdSpot(47);
    expect(reset).not.toHaveBeenCalled();
    frames(12);
    frames(47);
    frames(12);
    frames(47);
    frames(12);
    click("Let’s try my magic");
    expect(save).toHaveBeenLastCalledWith(
      expect.objectContaining({
        exercise: "wrist",
        tiltLower: 12,
        tiltUpper: 47,
        gripLower: defaultSettings.gripLower,
      }),
    );
    expect(reset).toHaveBeenCalledWith("practice");
  });
  it("captures comfortable left and right steering spots and proceeds to ship practice", () => {
    settings = { ...settings, exercise: "ship" };
    render();
    expect(host.textContent).toContain("Tilt your hand left.");
    expect(button("Left hand")).toBeUndefined();
    holdSpot(-18);
    expect(host.textContent).toContain("Tilt your hand right.");
    holdSpot(22);
    expect(reset).not.toHaveBeenCalled();
    frames(-18);
    frames(22);
    frames(-18);
    frames(22);
    frames(-18);
    click("Let’s try my magic");
    expect(save).toHaveBeenLastCalledWith(
      expect.objectContaining({
        exercise: "ship",
        shipLower: -18,
        shipUpper: 22,
        tiltLower: defaultSettings.tiltLower,
      }),
    );
    expect(reset).toHaveBeenCalledWith("practice");
  });
});
