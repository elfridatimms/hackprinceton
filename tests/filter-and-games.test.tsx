// @vitest-environment jsdom
import React, { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { describe, it, expect, vi } from "vitest";
import { MovementFilter } from "../src/movement/filter";
import {
  handTilt,
  movementRange,
  validMovementRange,
  getMovementRange,
  applyMovementRange,
  exerciseOrder,
  exercises,
  type Exercise,
} from "../src/movement/exercises";
import { defaultSettings } from "../src/game/session";
import { GameTabs } from "../src/components/GameTabs";
import { MovementLesson } from "../src/components/MovementLesson";
import { renderToStaticMarkup } from "react-dom/server";
describe("Hand steadiness without invented tracking", () => {
  it("removes an isolated one-frame spike", () => {
    const f = new MovementFilter();
    [0, 66, 132, 198].forEach((t) => f.update(1, t));
    expect(f.update(4, 264)).toBe(1);
    expect(f.update(1, 330)).toBe(1);
  });
  it("reduces stationary hand jitter while allowing a real open/close change", () => {
    const f = new MovementFilter(),
      raw: number[] = [],
      filtered: number[] = [];
    for (let i = 0; i < 100; i++) {
      const v = 1 + Math.sin(i * 2) * 0.05;
      const out = f.update(v, i * 66)!;
      if (i > 15) {
        raw.push(v);
        filtered.push(out);
      }
    }
    const energy = (values: number[]) =>
      Math.sqrt(
        values.reduce((sum, v) => sum + (v - 1) ** 2, 0) / values.length,
      );
    expect(energy(filtered)).toBeLessThan(energy(raw) * 0.6);
    for (let i = 100; i < 115; i++) f.update(2, i * 66);
    expect(f.update(2, 115 * 66)).toBeGreaterThan(1.95);
  });
  it("immediately invalidates missing data and forgets the old hand on recovery", () => {
    const f = new MovementFilter();
    f.update(2, 0);
    expect(f.update(null, 100)).toBeNull();
    expect(f.update(0.8, 200)).toBe(0.8);
    expect(f.update(NaN, 300)).toBeNull();
  });
  it("does not smooth across a stale tracking gap", () => {
    const f = new MovementFilter();
    f.update(2, 0);
    expect(f.update(0.8, 1000)).toBe(0.8);
  });
  it("has a similar response at 15 and 60 inference frames per second", () => {
    function run(fps: number) {
      const f = new MovementFilter();
      f.update(0, 0);
      let v = 0;
      for (let i = 1; i <= fps; i++) v = f.update(1, (i * 1000) / fps)!;
      return v;
    }
    expect(Math.abs(run(15) - run(60))).toBeLessThan(0.02);
  });
});
describe("Butterfly hand tilt and independent game calibration", () => {
  it("measures projected hand direction with aspect correction, not a clinical joint angle", () => {
    const p = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5 }));
    p[0] = { x: 0.4, y: 0.6 };
    p[9] = { x: 0.6, y: 0.4 };
    expect(handTilt(p, 2)).toBeCloseTo(26.56505);
    p[9] = { x: 0.2, y: 0.4 };
    expect(handTilt(p, 2)).toBeCloseTo(26.56505);
  });
  it("rejects missing or degenerate hand direction", () => {
    expect(handTilt([], 1)).toBeNull();
    expect(
      handTilt(
        Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5 })),
        1,
      ),
    ).toBeNull();
  });
  it("retains separate calibrated ranges for all five actual game inputs", () => {
    const wrist = applyMovementRange(
      { ...defaultSettings, exercise: "wrist" as const },
      12,
      47,
    );
    expect(getMovementRange(wrist)).toEqual({ lower: 12, upper: 47 });
    expect(wrist.gripLower).toBe(defaultSettings.gripLower);
    expect(validMovementRange("wrist", 12, 13)).toBe(false);
    expect(movementRange("wrist", 47, 12)).toEqual({ lower: 12, upper: 47 });
    expect(movementRange("elbow", 65, 150)).toEqual({ lower: 150, upper: 65 });
  });
});
describe("Child-friendly game navigation and lessons", () => {
  it("exposes five selectable tabs with keyboard navigation and an active panel reference", () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    let selected: Exercise = "grip";
    function Example() {
      const [value, setValue] = useState<Exercise>("grip");
      return (
        <GameTabs
          selected={value}
          onSelect={(next) => {
            selected = next;
            setValue(next);
          }}
        />
      );
    }
    act(() => root.render(<Example />));
    const tabs = Array.from(
      host.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
    );
    expect(tabs).toHaveLength(5);
    expect(tabs[0].getAttribute("aria-selected")).toBe("true");
    act(() =>
      tabs[0].dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
      ),
    );
    expect(selected).toBe("reach");
    expect(document.activeElement).toBe(tabs[1]);
    expect(tabs[1].getAttribute("aria-controls")).toBe("forest-game-panel");
    act(() =>
      tabs[1].dispatchEvent(
        new KeyboardEvent("keydown", { key: "End", bubbles: true }),
      ),
    );
    expect(selected).toBe("ship");
    act(() => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  });
  it.each(exerciseOrder)(
    "shows the selected %s movement rather than another game’s instructions",
    (exercise) => {
      const html = renderToStaticMarkup(
        <MovementLesson
          exercise={exercise}
          onClose={() => {}}
          onTry={() => {}}
        />,
      );
      expect(html).toContain(exercises[exercise].title);
      expect(html).toContain(exercises[exercise].up);
      expect(html).toContain(exercises[exercise].down);
      expect(html).toContain("My turn!");
      expect(html).toContain("Watch the picture.");
      expect(html).not.toContain("Copy this");
      expect(html).not.toContain("Read instruction aloud");
    },
  );
});
