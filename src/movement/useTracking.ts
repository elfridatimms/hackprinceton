import { useCallback, useEffect, useRef, useState } from "react";
import type { PoseLandmarker } from "@mediapipe/tasks-vision";
import { elbowAngle, type Arm, type TrackingFrame } from "./core";
const EMPTY: TrackingFrame = {
  valid: false,
  angle: null,
  at: 0,
  points: [],
  message: "Camera is off",
};
export function useTracking(arm: Arm) {
  const [status, setStatus] = useState<"off" | "loading" | "on" | "error">(
    "off",
  );
  const [error, setError] = useState("");
  const [frame, setFrame] = useState<TrackingFrame>(EMPTY);
  const video = useRef<HTMLVideoElement | null>(null),
    stream = useRef<MediaStream | null>(null),
    model = useRef<PoseLandmarker | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    generation = useRef(0),
    armRef = useRef(arm);
  armRef.current = arm;
  const stop = useCallback(() => {
    generation.current++;
    if (timer.current) clearTimeout(timer.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    model.current?.close();
    model.current = null;
    if (video.current) video.current.srcObject = null;
    setFrame(EMPTY);
    setStatus("off");
  }, []);
  const start = useCallback(async () => {
    stop();
    const id = generation.current;
    setStatus("loading");
    setError("");
    let pending: MediaStream | null = null;
    let pendingModel: PoseLandmarker | null = null;
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error(
          "Camera access needs a secure browser connection. You can still explore with demo controls.",
        );
      pending = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
      });
      if (id !== generation.current) {
        pending.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = pending;
      const el = document.createElement("video");
      el.autoplay = true;
      el.playsInline = true;
      el.muted = true;
      el.srcObject = pending;
      video.current = el;
      await el.play();
      const { FilesetResolver, PoseLandmarker } =
        await import("@mediapipe/tasks-vision");
      const files = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
      pendingModel = await PoseLandmarker.createFromOptions(files, {
        baseOptions: {
          modelAssetPath: "/models/pose_landmarker_lite.task",
          delegate: "CPU",
        },
        runningMode: "VIDEO",
        numPoses: 1,
        minPoseDetectionConfidence: 0.65,
        minPosePresenceConfidence: 0.65,
        minTrackingConfidence: 0.65,
      });
      if (id !== generation.current) {
        pending.getTracks().forEach((t) => t.stop());
        pendingModel.close();
        return;
      }
      model.current = pendingModel;
      setStatus("on");
      let lastTime = -1;
      const infer = () => {
        if (id !== generation.current) return;
        try {
          const now = performance.now();
          if (
            el.readyState >= 2 &&
            el.currentTime !== lastTime &&
            !document.hidden
          ) {
            lastTime = el.currentTime;
            const result = model.current!.detectForVideo(el, now);
            const points = result.landmarks[0] ?? [];
            const angle = elbowAngle(
              points,
              armRef.current,
              el.videoWidth / el.videoHeight,
            );
            setFrame({
              valid: angle !== null,
              angle,
              at: now,
              points,
              message:
                angle !== null
                  ? "I can see your arm."
                  : points.length
                    ? "Move your hand into view."
                    : "Let’s adjust the camera.",
            });
          }
          timer.current = setTimeout(infer, 66);
        } catch {
          setFrame({ ...EMPTY, message: "Let’s adjust the camera." });
          setError(
            "Camera tracking stopped. Reconnect your camera or choose demo controls.",
          );
          setStatus("error");
          stream.current?.getTracks().forEach((t) => t.stop());
          model.current?.close();
          model.current = null;
        }
      };
      infer();
      pending.getVideoTracks().forEach((t) =>
        t.addEventListener("ended", () => {
          if (id === generation.current) {
            setFrame(EMPTY);
            setStatus("error");
            setError("Your camera disconnected. Reconnect it to continue.");
          }
        }),
      );
    } catch (e) {
      pending?.getTracks().forEach((t) => t.stop());
      pendingModel?.close();
      if (id !== generation.current) return;
      model.current = null;
      stream.current = null;
      setStatus("error");
      setError(
        e instanceof DOMException && e.name === "NotAllowedError"
          ? "Camera permission wasn’t granted. You can allow it in your browser, or try demo controls."
          : e instanceof DOMException && e.name === "NotFoundError"
            ? "No camera was found. Connect one, or try demo controls."
            : e instanceof Error
              ? e.message
              : "The movement model could not load. Please reconnect, or use demo controls.",
      );
    }
  }, [stop]);
  useEffect(
    () => () => {
      generation.current++;
      if (timer.current) clearTimeout(timer.current);
      stream.current?.getTracks().forEach((t) => t.stop());
      model.current?.close();
    },
    [],
  );
  return { status, error, frame, video, start, stop };
}
export type Tracking = ReturnType<typeof useTracking>;
