// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { ReadInstruction } from "../src/components/ReadInstruction";
describe("Optional spoken movement instructions", () => {
  let host: HTMLDivElement, root: Root;
  const speech = {
    speak: vi.fn(),
    cancel: vi.fn(),
    getVoices: vi.fn(() => [{ lang: "en-US", localService: true }]),
  };
  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    Object.values(speech).forEach((fn) => fn.mockClear());
    vi.stubGlobal("speechSynthesis", speech);
    vi.stubGlobal(
      "SpeechSynthesisUtterance",
      class {
        text: string;
        constructor(text: string) {
          this.text = text;
        }
      },
    );
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
  });
  afterEach(() => {
    act(() => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  });
  function render(text: string) {
    act(() => root.render(<ReadInstruction text={text} />));
  }
  function click() {
    act(() => host.querySelector("button")!.click());
  }
  it("does not play automatically; reads exactly the requested instruction on demand", () => {
    render("Open your hand.");
    expect(speech.speak).not.toHaveBeenCalled();
    click();
    expect(speech.speak).toHaveBeenCalledOnce();
    const u = speech.speak.mock.calls[0][0];
    expect(u.text).toBe("Open your hand.");
    expect(u.lang).toBe("en-US");
    expect(host.querySelector("button")?.getAttribute("aria-pressed")).toBe(
      "true",
    );
  });
  it("stops the previous direction when the next movement appears", () => {
    render("Open your hand.");
    click();
    const previous = speech.cancel.mock.calls.length;
    render("Make a soft fist.");
    expect(speech.cancel.mock.calls.length).toBeGreaterThan(previous);
    expect(host.textContent).toContain("Luma, tell me!");
    expect(speech.speak).toHaveBeenCalledOnce();
  });
  it("can stop reading and releases speech when the guide closes", () => {
    render("Hold still.");
    click();
    click();
    expect(host.textContent).toContain("Luma, tell me!");
    click();
    const previous = speech.cancel.mock.calls.length;
    act(() => root.render(null));
    expect(speech.cancel.mock.calls.length).toBeGreaterThan(previous);
  });
  it("keeps the interface usable when speech is unavailable", () => {
    vi.stubGlobal("speechSynthesis", undefined);
    delete (window as unknown as Record<string, unknown>).speechSynthesis;
    render("Hold still.");
    expect(host.querySelector("button")).toBeNull();
    expect(speech.speak).not.toHaveBeenCalled();
  });
});
