import { useCallback, useEffect, useRef, useState } from "react";
import type { PersonalProfile } from "./personalization";
import { MovementFilter } from "./filter";
import {
  createVisionEngine,
  PlayingHand,
  preferredArm,
  type VisionEngine,
} from "./trackerEngine";
import {
  handOpenness,
  cameraHandHeight,
  wristBend,
  forearmSteering,
  type Exercise,
} from "./exercises";
import { elbowAngle, type Arm, type TrackingFrame } from "./core";
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
  profile: PersonalProfile | null = null,
) {
  const [status, setStatus] = useState<"off" | "loading" | "on" | "error">(
      "off",
    ),
    [error, setError] = useState(""),
    [frame, setFrame] = useState<TrackingFrame>(EMPTY);
  const diagnostics = useRef<TrackingDiagnostics>({
    build: "holistic-play-8",
    stage: "Camera off",
    engine: "—",
    video: "—",
    inferenceMs: null,
    frames: 0,
    lastError: "",
  });
  const video = useRef<HTMLVideoElement | null>(null),
    stream = useRef<MediaStream | null>(null),
    model = useRef<VisionEngine | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    generation = useRef(0);
  const current = useRef({ arm, exercise });
  current.current = { arm, exercise };
  const modelExercise = useRef<Exercise | null>(null),
    activeArm = useRef<Arm | null>(null),
    playingHand = useRef(new PlayingHand()),
    missingSince = useRef<number | null>(null);
  const filter = useRef(new MovementFilter());
  useEffect(() => {
    // Filter both preview/practice and play; raw pose used to be unfiltered before calibration.
    const p = profile?.exercise === exercise ? profile : null;
    const angle =
      exercise === "elbow" || exercise === "ship" || exercise === "wrist";
    filter.current.configure(
      p?.signalTau ?? (angle ? 0.12 : 0.1),
      p?.signalDeadband ?? (angle ? 0.3 : exercise === "grip" ? 0.012 : 0.003),
    );
    filter.current.reset();
    setFrame(EMPTY);
  }, [profile, exercise, arm]);
  useEffect(() => {
    activeArm.current = null;
    setFrame({
      ...EMPTY,
      message:
        exercise === "reach" || exercise === "grip"
          ? "Show one hand to the camera."
          : "Show your arm to the camera.",
    });
  }, [arm, exercise]);
  const stop = useCallback(() => {
    generation.current++;
    if (timer.current) clearTimeout(timer.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    model.current?.close();
    model.current = null;
    modelExercise.current = null;
    if (video.current) {
      video.current.pause();
      video.current.srcObject = null;
      video.current.remove();
      video.current = null;
    }
    activeArm.current = null;
    playingHand.current.reset();
    missingSince.current = null;
    filter.current.reset();
    diagnostics.current.stage = "Camera off";
    setFrame(EMPTY);
    setStatus("off");
  }, []);
  const start = useCallback(async () => {
    stop();
    const id = generation.current;
    setStatus("loading");
    setError("");
    diagnostics.current = {
      build: "holistic-play-8",
      stage: "Waiting for camera permission",
      engine: "—",
      video: "—",
      inferenceMs: null,
      frames: 0,
      lastError: "",
    };
    let pending: MediaStream | null = null,
      pendingVideo: HTMLVideoElement | null = null,
      pendingModel: VisionEngine | null = null;
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error(
          "Camera access needs a secure connection. You can still play with buttons.",
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
      document.body.append(el);
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
      const activeExercise = current.current.exercise;
      diagnostics.current.stage = "Loading movement tracker";
      diagnostics.current.video = `${el.videoWidth} × ${el.videoHeight}`;
      setFrame({ ...EMPTY, message: "Waking up the movement tracker…" });
      pendingModel = await createVisionEngine(activeExercise);
      if (id !== generation.current) {
        pending.getTracks().forEach((t) => t.stop());
        pendingModel.close();
        return;
      }
      model.current = pendingModel;
      modelExercise.current = activeExercise;
      diagnostics.current.engine = pendingModel.name;
      setStatus("on");
      let lastTime = -1,
        lastMeasurementAt = 0;
      const infer = async () => {
        if (id !== generation.current) return;
        const started = performance.now();
        try {
          if (
            modelExercise.current === current.current.exercise &&
            el.readyState >= 2 &&
            el.currentTime !== lastTime &&
            !document.hidden
          ) {
            lastTime = el.currentTime;
            const observation = await pendingModel!.detect(el, started);
            if (id !== generation.current) return;
            const at = performance.now(),
              inferenceMs = at - started,
              timely = inferenceMs <= FRAME_MAX_AGE_MS;
            lastMeasurementAt = at;
            diagnostics.current.inferenceMs = Math.round(inferenceMs);
            diagnostics.current.frames++;
            const pose = observation.pose;
            if (!activeArm.current)
              activeArm.current = preferredArm(pose, current.current.arm);
            const side = activeArm.current ?? current.current.arm;
            const handMode =
              activeExercise === "grip" || activeExercise === "reach";
            const hand = handMode
              ? playingHand.current.select(observation.hands)
              : observation.hands.find((h) => h.label.toLowerCase() === side);
            const points =
              handMode || activeExercise === "wrist"
                ? (hand?.points ?? [])
                : pose;
            const aspect = el.videoWidth / el.videoHeight;
            const rawValue =
              activeExercise === "grip"
                ? handOpenness(points, aspect)
                : activeExercise === "reach"
                  ? cameraHandHeight(points)
                  : activeExercise === "wrist"
                    ? wristBend(pose, points, side, aspect)
                    : activeExercise === "ship"
                      ? forearmSteering(pose, side, aspect)
                      : elbowAngle(pose, side, aspect);
            const value = filter.current.update(timely ? rawValue : null, at);
            if (value === null) {
              if (missingSince.current === null) missingSince.current = at;
              // Reacquire after a genuine absence, without trusting a flickering handedness label.
              if (handMode && at - missingSince.current > 1000)
                playingHand.current.reset();
            } else missingSince.current = null;
            const valid = value !== null && timely;
            const missing = handMode
              ? "Keep your playing hand in the picture."
              : activeExercise === "wrist"
                ? "Show your hand and elbow from the side. Rest your forearm."
                : activeExercise === "ship"
                  ? "Keep your elbow and hand in view. Fingers can stay relaxed."
                  : "Keep your shoulder, elbow and hand in view.";
            diagnostics.current.stage = valid
              ? "Following your movement"
              : missing;
            setFrame({
              valid,
              at: started,
              points,
              posePoints: pose,
              arm: side,
              pointsValid: timely && points.length > 0,
              rawValue: timely ? rawValue : null,
              angle: activeExercise === "elbow" ? value : null,
              height: activeExercise === "reach" ? value : null,
              openness: activeExercise === "grip" ? value : null,
              rawOpenness: activeExercise === "grip" ? rawValue : null,
              tilt: activeExercise === "wrist" ? value : null,
              steering: activeExercise === "ship" ? value : null,
              message: !timely
                ? "The camera is taking a moment."
                : valid
                  ? "I’m following you!"
                  : missing,
            });
          } else if (
            !document.hidden &&
            performance.now() - lastMeasurementAt > FRAME_MAX_AGE_MS
          ) {
            filter.current.reset();
            setFrame({
              ...EMPTY,
              at: performance.now(),
              message: "The camera paused. Check the camera connection.",
            });
          }
          if (id === generation.current)
            timer.current = setTimeout(
              () => void infer(),
              Math.max(0, 50 - (performance.now() - started)),
            );
        } catch (cause) {
          if (id !== generation.current) return;
          filter.current.reset();
          diagnostics.current.stage = "Tracking error";
          diagnostics.current.lastError =
            cause instanceof Error ? cause.message : String(cause);
          setFrame({ ...EMPTY, message: "Let’s adjust the camera." });
          setError(
            "Camera tracking stopped. Reconnect the camera or play with buttons.",
          );
          setStatus("error");
          stream.current?.getTracks().forEach((t) => t.stop());
          pendingModel?.close();
          model.current = null;
        }
      };
      void infer();
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
          ? "Camera permission wasn’t granted. Allow it in your browser, or play with buttons."
          : e instanceof DOMException && e.name === "NotFoundError"
            ? "No camera was found. Connect one, or play with buttons."
            : e instanceof Error
              ? e.message
              : "The movement tracker could not load. Please reconnect.",
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
