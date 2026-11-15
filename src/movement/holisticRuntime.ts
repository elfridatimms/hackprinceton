import type { Landmark } from "./core";

export type HolisticResult = {
  poseLandmarks?: Landmark[];
  leftHandLandmarks?: Landmark[];
  rightHandLandmarks?: Landmark[];
};
export type Holistic = {
  setOptions: (options: Record<string, unknown>) => void;
  onResults: (callback: (r: HolisticResult) => void) => void;
  initialize: () => Promise<void>;
  send: (input: {
    image: HTMLVideoElement | HTMLCanvasElement;
  }) => Promise<void>;
  close: () => Promise<void>;
};
type Constructor = new (options: {
  locateFile: (name: string) => string;
}) => Holistic;
export type HolisticRuntime = { Holistic: Constructor; image: HTMLCanvasElement; dispose: () => void };
export const trackingAborted = () =>
  new DOMException("Movement tracking was cancelled.", "AbortError");

/** Legacy Solutions and Tasks both use Emscripten globals. A fresh same-origin
 * window keeps those globals apart, including after retries and game changes. */
export function loadHolisticRuntime(
  signal?: AbortSignal,
): Promise<HolisticRuntime> {
  if (signal?.aborted) return Promise.reject(trackingAborted());
  return new Promise((resolve, reject) => {
    const frame = document.createElement("iframe");
    frame.dataset.mediapipeRuntime = "holistic";
    frame.title = "Local movement tracker";
    frame.tabIndex = -1;
    frame.setAttribute("aria-hidden", "true");
    frame.style.cssText =
      "position:fixed;left:-10000px;top:0;width:1px;height:1px;border:0;pointer-events:none;opacity:0";
    let settled = false;
    const cleanup = () => {
      clearTimeout(timer);
      frame.removeEventListener("load", ready);
      frame.removeEventListener("error", failed);
      signal?.removeEventListener("abort", cancel);
    };
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      frame.remove();
      reject(error);
    };
    const ready = () => {
      if (settled) return;
      const realm = frame.contentWindow as
        | (Window & { Holistic?: Constructor })
        | null;
      if (!realm?.Holistic) {
        fail(
          new Error(
            "The movement tracker could not load. Try the camera again.",
          ),
        );
        return;
      }
      settled = true;
      cleanup();
      resolve({
        Holistic: realm.Holistic,
        image: frame.contentDocument!.createElement("canvas"),
        dispose: () => frame.remove(),
      });
    };
    const failed = () =>
      fail(
        new Error("The movement tracker could not load. Try the camera again."),
      );
    const cancel = () => fail(trackingAborted());
    const timer = setTimeout(
      () =>
        fail(
          new Error(
            "The movement tracker took too long to load. Try the camera again.",
          ),
        ),
      20000,
    );
    frame.addEventListener("load", ready);
    frame.addEventListener("error", failed);
    signal?.addEventListener("abort", cancel, { once: true });
    frame.src = "/mediapipe/holistic/runtime.html?v=isolated-1";
    document.body.append(frame);
  });
}
