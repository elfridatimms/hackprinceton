import { useCallback, useEffect, useRef, useState } from "react";
import type { PersonalProfile } from "./personalization";
import { ReachStability } from "./reach";
import { AnchorLock, LandmarkSmoother, MovementFilter } from "./filter";
import {
  createVisionEngine,
  PlayingHand,
  preferredArm,
  type VisionEngine,
} from "./trackerEngine";
import {
  handOpenness,
  handHeight,
  reachTrackingMessage,
  wristBend,
  forearmSteering,
  type Exercise,
} from "./exercises";
import {
  elbowAngle,
  usableLandmark,
  type Arm,
  type Landmark,
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
export const requestCameraStream = () =>
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
    build: "anchored-firefly-10",
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
  const startup = useRef<AbortController | null>(null);
  const requestedExercise = useRef(exercise);
  const current = useRef({ arm, exercise });
  current.current = { arm, exercise };
  const modelExercise = useRef<Exercise | null>(null),
    activeArm = useRef<Arm | null>(null),
    playingHand = useRef(new PlayingHand()),
    missingSince = useRef<number | null>(null);
  const filter = useRef(new MovementFilter());
  const reachStability = useRef(new ReachStability());
  // Landmark-level smoothing and pinned pivot joints keep both the drawn
  // skeleton and the measured value steady without hiding real movement.
  // Lower cutoffs = calmer when still; beta keeps real movement responsive.
  const poseSmoother = useRef(new LandmarkSmoother(0.6, 4.5));
  const handSmoother = useRef(new LandmarkSmoother(0.8, 5.5));
  const anchors = useRef(new Map<number, AnchorLock>());
  const resetSmoothing = () => {
    poseSmoother.current.reset();
    handSmoother.current.reset();
    anchors.current.clear();
  };
  useEffect(() => {
    // Filter both preview/practice and play; raw pose used to be unfiltered before calibration.
    const p =
      profile?.exercise === exercise && profile.arm === arm ? profile : null;
    const angle =
      exercise === "elbow" || exercise === "ship" || exercise === "wrist";
    filter.current.configure(
      exercise === "reach"
        ? Math.max(0.18, p?.signalTau ?? 0.2)
        : (p?.signalTau ?? (angle ? 0.12 : 0.1)),
      exercise === "reach"
        ? Math.max(0.025, p?.signalDeadband ?? 0.025)
        : (p?.signalDeadband ?? (angle ? 0.3 : 0.012)),
    );
    filter.current.reset();
    reachStability.current.reset();
    resetSmoothing();
    setFrame(EMPTY);
  }, [profile, exercise, arm]);
  useEffect(() => {
    activeArm.current = null;
    reachStability.current.reset();
    resetSmoothing();
    setFrame({
      ...EMPTY,
      message:
        exercise === "grip"
          ? "Show one hand to the camera."
          : "Show your arm to the camera.",
    });
  }, [arm, exercise]);
  const stop = useCallback(() => {
    generation.current++;
    startup.current?.abort();
    startup.current = null;
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
    reachStability.current.reset();
    resetSmoothing();
    diagnostics.current.stage = "Camera off";
    setFrame(EMPTY);
    setStatus("off");
  }, []);
  const start = useCallback(async () => {
    stop();
    const id = generation.current;
    requestedExercise.current = current.current.exercise;
    const startupController = new AbortController();
    startup.current = startupController;
    setStatus("loading");
    setError("");
    diagnostics.current = {
      build: "anchored-firefly-10",
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
      pendingModel = await createVisionEngine(
        activeExercise,
        startupController.signal,
      );
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
            const aspect = el.videoWidth / el.videoHeight;
            const pose = poseSmoother.current.update(observation.pose, at);
            if (!activeArm.current)
              activeArm.current =
                activeExercise === "reach"
                  ? current.current.arm
                  : preferredArm(pose, current.current.arm);
            const side = activeArm.current ?? current.current.arm;
            const handMode = activeExercise === "grip";
            const hand = handMode
              ? playingHand.current.select(observation.hands)
              : observation.hands.find((h) => h.label.toLowerCase() === side);
            const handPoints = handSmoother.current.update(
              hand?.points ?? [],
              at,
            );
            // Pin the pivot joint(s) of this exercise to a steady reference point.
            const elbowId = side === "left" ? 13 : 14,
              shoulderId = side === "left" ? 11 : 12;
            const pivotIds =
              activeExercise === "elbow"
                ? [shoulderId, elbowId]
                : handMode
                  ? []
                  : [elbowId];
            for (const id of pivotIds) {
              if (!usableLandmark(pose[id])) continue;
              let lock = anchors.current.get(id);
              if (!lock) {
                lock = new AnchorLock(0.024);
                anchors.current.set(id, lock);
              }
              pose[id] = lock.update(pose[id], at, aspect)!;
            }
            let anchor: Landmark | null = null;
            if (handMode) {
              let lock = anchors.current.get(-1);
              if (!lock) {
                lock = new AnchorLock(0.03);
                anchors.current.set(-1, lock);
              }
              anchor = handPoints[0]
                ? (lock.update(handPoints[0], at, aspect) ?? null)
                : null;
            } else if (usableLandmark(pose[elbowId])) anchor = pose[elbowId];
            const points =
              handMode || activeExercise === "wrist" ? handPoints : pose;
            const rawValue =
              activeExercise === "grip"
                ? handOpenness(points, aspect)
                : activeExercise === "reach"
                  ? handHeight(pose, side, aspect)
                  : activeExercise === "wrist"
                    ? wristBend(pose, points, side, aspect)
                    : activeExercise === "ship"
                      ? forearmSteering(pose, side, aspect)
                      : elbowAngle(pose, side, aspect);
            const confirmed =
              activeExercise === "reach"
                ? reachStability.current.update(
                    timely ? rawValue : null,
                    started,
                  )
                : timely
                  ? rawValue
                  : null;
            const value = filter.current.update(confirmed, at);
            if (value === null) {
              if (missingSince.current === null) missingSince.current = at;
              // Reacquire after a genuine absence, without trusting a flickering handedness label.
              if (handMode && at - missingSince.current > 1000)
                playingHand.current.reset();
            } else missingSince.current = null;
            const valid = value !== null && timely;
            const missing = handMode
              ? "Keep your playing hand in the picture."
              : activeExercise === "reach"
                ? reachTrackingMessage(pose, side)
                : activeExercise === "wrist"
                  ? "Show your elbow and your hand from the side, little finger to the camera."
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
              anchor,
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
                  ? activeExercise === "reach"
                    ? `I’m following your ${side} arm.`
                    : "I’m following you!"
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
              ? /Module\.arguments|Aborted\(|WebAssembly|memory access out of bounds/.test(
                  e.message,
                )
                ? "The movement tracker couldn’t start. Try the camera again."
                : e.message
              : "The movement tracker could not load. Please reconnect.",
      );
    }
  }, [stop, requestStream]);
  useEffect(() => {
    if (
      (status === "on" || status === "loading") &&
      requestedExercise.current !== exercise
    )
      void start();
  }, [exercise, status, start]);
  useEffect(
    () => () => {
      generation.current++;
      startup.current?.abort();
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
