import { useCallback, useEffect, useRef, useState } from "react";
import type { PoseLandmarker } from "@mediapipe/tasks-vision";
import {
  armTrackingMessage,
  elbowAngle,
  type Arm,
  type TrackingFrame,
} from "./core";
import {FRAME_MAX_AGE_MS} from "./calibration";
const EMPTY: TrackingFrame = {
  valid: false,
  angle: null,
  at: 0,
  points: [],
  message: "Camera is off",
};
export type TrackingDiagnostics={build:string;stage:string;engine:string;video:string;inferenceMs:number|null;frames:number;lastError:string};
const requestCameraStream=()=>navigator.mediaDevices.getUserMedia({audio:false,video:{width:{ideal:1280},height:{ideal:720},facingMode:'user'}});
export function useTracking(arm: Arm,requestStream:()=>Promise<MediaStream>=requestCameraStream) {
  const [status, setStatus] = useState<"off" | "loading" | "on" | "error">(
    "off",
  );
  const [error, setError] = useState("");
  const [frame, setFrame] = useState<TrackingFrame>(EMPTY);
  const diagnostics=useRef<TrackingDiagnostics>({build:'camera-3',stage:'Camera off',engine:'CPU',video:'—',inferenceMs:null,frames:0,lastError:''});
  const video = useRef<HTMLVideoElement | null>(null),
    stream = useRef<MediaStream | null>(null),
    model = useRef<PoseLandmarker | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    generation = useRef(0),
    armRef = useRef(arm);
  armRef.current = arm;
  useEffect(() => {
    setFrame({ ...EMPTY, message: `Finding your ${arm} arm…` });
  }, [arm]);
  const stop = useCallback(() => {
    generation.current++;
    if (timer.current) clearTimeout(timer.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    model.current?.close();
    model.current = null;
    if (video.current) {video.current.pause();video.current.srcObject=null;video.current.remove();video.current=null;}
    diagnostics.current.stage='Camera off';
    setFrame(EMPTY);
    setStatus("off");
  }, []);
  const start = useCallback(async () => {
    stop();
    const id = generation.current;
    setStatus("loading");
    setError("");
    diagnostics.current={build:'camera-3',stage:'Waiting for camera permission',engine:'CPU',video:'—',inferenceMs:null,frames:0,lastError:''};
    let pendingVideo:HTMLVideoElement|null=null;
    let pending: MediaStream | null = null;
    let pendingModel: PoseLandmarker | null = null;
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
      const el = document.createElement("video");pendingVideo=el;
      el.setAttribute('aria-hidden','true');el.tabIndex=-1;
      el.style.cssText='position:fixed;left:0;bottom:0;width:1px;height:1px;pointer-events:none;opacity:0.01';
      document.body.appendChild(el);
      el.autoplay = true;
      el.playsInline = true;
      el.muted = true;
      el.srcObject = pending;
      video.current = el;
      await el.play();
      if(id!==generation.current){el.remove();pending.getTracks().forEach(t=>t.stop());return;}
      diagnostics.current.stage='Loading arm tracker';
      diagnostics.current.video=`${el.videoWidth} × ${el.videoHeight}`;
      setFrame({...EMPTY,message:'Camera is on. Loading arm tracking…'});
      const { FilesetResolver, PoseLandmarker } =
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
      // CPU avoids long WebGL shader compilation and contention with the 3D game.
      pendingModel=await createModel('CPU');
      if (id !== generation.current) {
        pending.getTracks().forEach((t) => t.stop());
        pendingModel.close();
        return;
      }
      model.current = pendingModel;
      diagnostics.current.stage='Waiting for a visible arm';
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
            const inferenceMs=performance.now()-now;
            diagnostics.current.inferenceMs=Math.round(inferenceMs);
            diagnostics.current.frames++;
            const points = result.landmarks[0] ?? [];
            const angle = elbowAngle(
              points,
              armRef.current,
              el.videoWidth / el.videoHeight,
            );
            const timely=inferenceMs<=FRAME_MAX_AGE_MS;
            diagnostics.current.stage=!timely?'Camera processing is too slow':angle!==null?'Arm in view':armTrackingMessage(points,armRef.current);
            setFrame({
              valid: angle !== null&&timely,
              angle:timely?angle:null,
              at: now,
              points,
              message:
                !timely?'Camera processing is slow. Close other camera apps or try demo controls.':angle!==null?'I can see your arm.':armTrackingMessage(points, armRef.current),
            });
          } else if (!document.hidden) {
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
          diagnostics.current.stage='Tracking error';
          diagnostics.current.lastError=cause instanceof Error?cause.message:String(cause);
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
      if(pendingVideo){pendingVideo.srcObject=null;pendingVideo.remove();if(video.current===pendingVideo)video.current=null;}
      pendingModel?.close();
      diagnostics.current.stage='Camera setup error';
      diagnostics.current.lastError=e instanceof Error?e.message:String(e);
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
  }, [stop,requestStream]);
  useEffect(
    () => () => {
      generation.current++;
      if (timer.current) clearTimeout(timer.current);
      stream.current?.getTracks().forEach((t) => t.stop());
      model.current?.close();
      if(video.current){video.current.pause();video.current.srcObject=null;video.current.remove();}
    },
    [],
  );
  return { status, error, frame, video, start, stop,diagnostics:diagnostics.current };
}
export type Tracking = Omit<ReturnType<typeof useTracking>,'diagnostics'>&{diagnostics?:TrackingDiagnostics};
