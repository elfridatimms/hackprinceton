import { MovementFilter } from "./filter";
import {
  handHeight,
  handOpenness,
  handTilt,
  handSteering,
  isHandExercise,
  reachTrackingMessage,
  type Exercise,
} from "./exercises";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PoseLandmarker, HandLandmarker } from "@mediapipe/tasks-vision";
import {
  armTrackingMessage,
  elbowAngle,
  type Arm,
  type TrackingFrame,
} from "./core";
import { FRAME_MAX_AGE_MS } from "./calibration";
const EMPTY: TrackingFrame = {
  valid: false,
  angle: null,
  at: 0,
  points: [],
  message: "Camera is off",
};
export type TrackingDiagnostics = {
  build: string;
  stage: string;
  engine: string;
  video: string;
  inferenceMs: number | null;
  frames: number;
  lastError: string;
};
const requestCameraStream = () =>
  navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      facingMode: "user",
    },
  });
export function useTracking(
  arm: Arm,
  requestStream: () => Promise<MediaStream> = requestCameraStream,
  exercise: Exercise = "elbow",
) {
  const [status, setStatus] = useState<"off" | "loading" | "on" | "error">(
    "off",
  );
  const [error, setError] = useState("");
  const [frame, setFrame] = useState<TrackingFrame>(EMPTY);
  const diagnostics = useRef<TrackingDiagnostics>({
    build: "pirate-bay-6",
    stage: "Camera off",
    engine: "CPU",
    video: "—",
    inferenceMs: null,
    frames: 0,
    lastError: "",
  });
  const video = useRef<HTMLVideoElement | null>(null),
    stream = useRef<MediaStream | null>(null),
    model = useRef<PoseLandmarker | HandLandmarker | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    generation = useRef(0),
    armRef = useRef(arm);
  const lockedHand = useRef<string | null>(null);
  const gripFilter = useRef(new MovementFilter(0.16, 0.012));
  const tiltFilter = useRef(new MovementFilter(0.12, 0.4));
  const steeringFilter = useRef(new MovementFilter(0.12, 0.4));
  const modelExercise = useRef<Exercise | null>(null);
  armRef.current = arm;
  const exerciseRef = useRef(exercise);
  exerciseRef.current = exercise;
  useEffect(() => {
    setFrame({ ...EMPTY, message: `Finding your ${arm} arm…` });
  }, [arm, exercise]);
  const stop = useCallback(() => {
    generation.current++;
    if (timer.current) clearTimeout(timer.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    model.current?.close();
    model.current = null;
    if (video.current) {
      video.current.pause();
      video.current.srcObject = null;
      video.current.remove();
      video.current = null;
    }
    diagnostics.current.stage = "Camera off";
    lockedHand.current = null;
    gripFilter.current.reset();
    tiltFilter.current.reset();
    steeringFilter.current.reset();
    modelExercise.current = null;
    setFrame(EMPTY);
    setStatus("off");
  }, []);
  const start = useCallback(async () => {
    stop();
    const id = generation.current;
    setStatus("loading");
    setError("");
    diagnostics.current = {
      build: "pirate-bay-6",
      stage: "Waiting for camera permission",
      engine: "CPU",
      video: "—",
      inferenceMs: null,
      frames: 0,
      lastError: "",
    };
    let pendingVideo: HTMLVideoElement | null = null;
    let pending: MediaStream | null = null;
    let pendingModel: PoseLandmarker | HandLandmarker | null = null;
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error(
          "Camera access needs a secure browser connection. You can still explore with demo controls.",
        );
      pending = await requestStream();
      if (id !== generation.current) {
        pending.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = pending;
      const el = document.createElement("video");
      pendingVideo = el;
      el.setAttribute("aria-hidden", "true");
      el.tabIndex = -1;
      el.style.cssText =
        "position:fixed;left:0;bottom:0;width:1px;height:1px;pointer-events:none;opacity:0.01";
      document.body.appendChild(el);
      el.autoplay = true;
      el.playsInline = true;
      el.muted = true;
      el.srcObject = pending;
      video.current = el;
      await el.play();
      if (id !== generation.current) {
        el.remove();
        pending.getTracks().forEach((t) => t.stop());
        return;
      }
      diagnostics.current.stage = "Loading arm tracker";
      diagnostics.current.video = `${el.videoWidth} × ${el.videoHeight}`;
      setFrame({ ...EMPTY, message: "Camera is on. Loading arm tracking…" });
      const { FilesetResolver, PoseLandmarker, HandLandmarker } =
        await import("@mediapipe/tasks-vision");
      const files = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
      const createModel = (delegate: "GPU" | "CPU") =>
        PoseLandmarker.createFromOptions(files, {
          baseOptions: {
            modelAssetPath: "/models/pose_landmarker_full.task",
            delegate,
          },
          runningMode: "VIDEO",
          numPoses: 1,
          minPoseDetectionConfidence: 0.3,
          minPosePresenceConfidence: 0.3,
          minTrackingConfidence: 0.3,
        });
      // CPU avoids WebGL warm-up. Each exercise uses the model it actually needs.
      const activeExercise = exerciseRef.current;
      pendingModel = isHandExercise(activeExercise)
        ? await HandLandmarker.createFromOptions(files, {
            baseOptions: {
              modelAssetPath: "/models/hand_landmarker.task",
              delegate: "CPU",
            },
            runningMode: "VIDEO",
            numHands: 1,
            minHandDetectionConfidence: 0.5,
            minHandPresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
          })
        : await createModel("CPU");

      if (id !== generation.current) {
        pending.getTracks().forEach((t) => t.stop());
        pendingModel.close();
        return;
      }
      modelExercise.current = activeExercise;
      diagnostics.current.engine = isHandExercise(activeExercise)
        ? "CPU · hand tracker"
        : "CPU · pose tracker";
      model.current = pendingModel;
      diagnostics.current.stage = "Waiting for a visible arm";
      setStatus("on");
      let lastTime = -1,
        lastMeasurementAt = 0;
      const infer = () => {
        if (id !== generation.current) return;
        try {
          const now = performance.now();
          if (
            modelExercise.current === exerciseRef.current &&
            el.readyState >= 2 &&
            el.currentTime !== lastTime &&
            !document.hidden
          ) {
            lastTime = el.currentTime;
            lastMeasurementAt = now;
            const result = model.current!.detectForVideo(el, now);
            const inferenceMs = performance.now() - now;
            diagnostics.current.inferenceMs = Math.round(inferenceMs);
            diagnostics.current.frames++;
            const points = result.landmarks[0] ?? [];
            const isGrip = exerciseRef.current === "grip";
            const isWrist = exerciseRef.current === "wrist";
            const isShip = exerciseRef.current === "ship";
            const handMode = isHandExercise(exerciseRef.current);
            const handedness =
              "handedness" in result ? result.handedness[0]?.[0] : undefined;
            const label = handedness?.categoryName ?? null;
            const confidence = handedness?.score ?? 0;
            if (
              handMode &&
              label &&
              confidence >= 0.5 &&
              lockedHand.current === null
            )
              lockedHand.current = label;
            const sameHand =
              !handMode || (!!label && label === lockedHand.current);
            const rawOpenness =
              isGrip && confidence >= 0.5 && sameHand
                ? handOpenness(points, el.videoWidth / el.videoHeight)
                : null;
            const rawTilt =
              isWrist && confidence >= 0.5 && sameHand
                ? handTilt(points, el.videoWidth / el.videoHeight)
                : null;
            const rawSteering =
              isShip && confidence >= 0.5 && sameHand
                ? handSteering(points, el.videoWidth / el.videoHeight)
                : null;
            const timely = inferenceMs <= FRAME_MAX_AGE_MS;
            const steering = steeringFilter.current.update(
              timely ? rawSteering : null,
              now,
            );
            const openness = gripFilter.current.update(
              timely ? rawOpenness : null,
              now,
            );
            const tilt = tiltFilter.current.update(
              timely ? rawTilt : null,
              now,
            );
            const angle = handMode
              ? null
              : elbowAngle(
                  points,
                  armRef.current,
                  el.videoWidth / el.videoHeight,
                );
            const height = handMode
              ? null
              : handHeight(
                  points,
                  armRef.current,
                  el.videoWidth / el.videoHeight,
                );
            const isReach = exerciseRef.current === "reach";
            const detected = isShip
              ? steering !== null
              : isWrist
                ? tilt !== null
                : isGrip
                  ? openness !== null
                  : isReach
                    ? height !== null
                    : angle !== null;
            const missing = handMode
              ? !sameHand && label
                ? "Bring your playing hand back."
                : isShip
                  ? "Show your palm with fingers up, like a little wave."
                  : "Show your palm. Keep your wrist and fingers in the picture."
              : isReach
                ? reachTrackingMessage(points, armRef.current)
                : armTrackingMessage(points, armRef.current);
            diagnostics.current.stage = !timely
              ? "Camera processing is too slow"
              : detected
                ? "Arm in view"
                : missing;
            setFrame({
              valid: detected && timely,
              height: timely ? height : null,
              openness: timely ? openness : null,
              rawOpenness: timely ? rawOpenness : null,
              tilt: timely ? tilt : null,
              steering: timely ? steering : null,
              angle: timely ? angle : null,
              at: now,
              points,
              message: !timely
                ? "Camera processing is slow. Close other camera apps or try demo controls."
                : detected
                  ? handMode || isReach
                    ? "I can see your hand!"
                    : "I can see your arm."
                  : missing,
            });
          } else if (!document.hidden) {
            if (now - lastMeasurementAt > FRAME_MAX_AGE_MS) {
              gripFilter.current.reset();
              tiltFilter.current.reset();
              steeringFilter.current.reset();
            }
            setFrame((previous) =>
              now - previous.at > FRAME_MAX_AGE_MS
                ? {
                    ...EMPTY,
                    at: now,
                    message: "The camera paused. Check the camera connection.",
                  }
                : previous,
            );
          }
          timer.current = setTimeout(infer, 66);
        } catch (cause) {
          gripFilter.current.reset();
          tiltFilter.current.reset();
          steeringFilter.current.reset();
          diagnostics.current.stage = "Tracking error";
          diagnostics.current.lastError =
            cause instanceof Error ? cause.message : String(cause);
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
      if (pendingVideo) {
        pendingVideo.srcObject = null;
        pendingVideo.remove();
        if (video.current === pendingVideo) video.current = null;
      }
      pendingModel?.close();
      if (id !== generation.current) return;
      diagnostics.current.stage = "Camera setup error";
      diagnostics.current.lastError =
        e instanceof Error ? e.message : String(e);
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
  }, [stop, requestStream]);
  useEffect(() => {
    if (model.current && modelExercise.current !== exercise) void start();
  }, [exercise, start]);
  useEffect(
    () => () => {
      generation.current++;
      if (timer.current) clearTimeout(timer.current);
      stream.current?.getTracks().forEach((t) => t.stop());
      model.current?.close();
      if (video.current) {
        video.current.pause();
        video.current.srcObject = null;
        video.current.remove();
      }
    },
    [],
  );
  return {
    status,
    error,
    frame,
    video,
    start,
    stop,
    diagnostics: diagnostics.current,
  };
}
export type Tracking = Omit<ReturnType<typeof useTracking>, "diagnostics"> & {
  diagnostics?: TrackingDiagnostics;
};
