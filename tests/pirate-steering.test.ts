import { describe, expect, it } from "vitest";
import {
  handSteering,
  applyMovementRange,
  getMovementRange,
  movementValue,
  validMovementRange,
} from "../src/movement/exercises";
import { defaultSettings } from "../src/game/session";
const hand = (x = 0.5, y = 0.4) => {
  const p = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5 }));
  p[0] = { x: 0.5, y: 0.7 };
  p[9] = { x, y };
  return p;
};
describe("Pirate steering", () => {
  it("steers left and right in the mirrored preview, with aspect correction", () => {
    expect(handSteering(hand(), 2)).toBeCloseTo(0);
    expect(handSteering(hand(0.6), 2)).toBeCloseTo(-33.690067);
    expect(handSteering(hand(0.4), 2)).toBeCloseTo(33.690067);
    expect(handSteering(hand(0.6), 1)).toBeCloseTo(-18.434949);
  });
  it("does not wrap a sideways, downturned, missing or out-of-frame hand into a steering command", () => {
    expect(handSteering([], 1)).toBeNull();
    expect(handSteering(hand(0.5, 0.7), 1)).toBeNull();
    expect(handSteering(hand(0.6, 0.8), 1)).toBeNull();
    expect(handSteering(hand(1.1), 1)).toBeNull();
    expect(handSteering(hand(), NaN)).toBeNull();
    expect(handSteering(hand(0.9, 0.69), 1)).toBeNull();
  });
  it("keeps steering calibration independent from the butterfly, flower and arm games", () => {
    const settings = applyMovementRange(
      { ...defaultSettings, exercise: "ship" },
      -12,
      19,
    );
    expect(getMovementRange(settings)).toEqual({ lower: -12, upper: 19 });
    expect(settings.tiltLower).toBe(defaultSettings.tiltLower);
    expect(settings.gripUpper).toBe(defaultSettings.gripUpper);
    expect(settings.lower).toBe(defaultSettings.lower);
    expect(validMovementRange("ship", -12, -11)).toBe(false);
    expect(validMovementRange("ship", -76, 25)).toBe(false);
    expect(
      movementValue(
        {
          valid: true,
          angle: null,
          tilt: 60,
          steering: -12,
          at: 0,
          points: [],
          message: "",
        },
        "ship",
      ),
    ).toBe(-12);
  });
});
