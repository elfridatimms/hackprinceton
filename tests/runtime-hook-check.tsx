import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { useTracking } from "../src/movement/useTracking";
import { CameraFeed } from "../src/components/CameraPanel";
import { Setup } from "../src/components/Setup";
import {
  defaultSettings,
  type Settings,
  type Session,
} from "../src/game/session";
import "../src/style.css";
import {
  exerciseOrder,
  isHandExercise,
  exercises,
  type Exercise,
} from "../src/movement/exercises";
let recordedTilt = 0,
  targetTilt = 0;
let recordedLift = 0,
  targetLift = 0;
let image = new Image();
image.src = new URL("./fixtures/right_hands.jpg", import.meta.url).href;
const requestSource = async () => {
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = 720;
  const draw = () => {
    if (image.complete && image.naturalWidth) {
      const c = canvas.getContext("2d")!;
      c.clearRect(0, 0, canvas.width, canvas.height);
      const sourceX = image.src.includes("right_hands") ? 350 : 0;
      const sourceWidth = image.naturalWidth - sourceX;
      const s = Math.min(
          canvas.width / sourceWidth,
          canvas.height / image.naturalHeight,
        ),
        w = sourceWidth * s,
        h = image.naturalHeight * s;
      recordedTilt += (targetTilt - recordedTilt) * 0.18;
      c.save();
      recordedLift += (targetLift - recordedLift) * 0.18;
      c.translate(canvas.width / 2, canvas.height / 2 + recordedLift);
      c.rotate((recordedTilt * Math.PI) / 180);
      c.drawImage(
        image,
        sourceX,
        0,
        sourceWidth,
        image.naturalHeight,
        -w * 0.4,
        -h * 0.4,
        w * 0.8,
        h * 0.8,
      );
      c.restore();
    }
  };
  draw();
  const timer = setInterval(draw, 70);
  const stream = canvas.captureStream(15);
  for (const track of stream.getTracks()) {
    const stop = track.stop.bind(track);
    track.stop = () => {
      clearInterval(timer);
      stop();
    };
    track.addEventListener("ended", () => clearInterval(timer));
  }
  return stream;
};
function Check() {
  const [settings, setSettings] = useState<Settings>(defaultSettings),
    [phase, setPhase] = useState<
      "idle" | "setup" | "calibration" | "practice" | "playing"
    >("idle");
  useEffect(() => {
    image = new Image();
    image.src = new URL(
      settings.exercise === "grip" || settings.exercise === "reach"
        ? "./fixtures/right_hands.jpg"
        : "./fixtures/pose.jpg",
      import.meta.url,
    ).href;
    recordedTilt = 0;
    targetTilt = 0;
    targetLift = 0;
    recordedLift = 0;
  }, [settings.exercise]);
  const tracking = useTracking(
    settings.arm,
    requestSource,
    settings.exercise,
    settings.personalization,
  );
  return (
    <div style={{ padding: 30 }}>
      <h1>Actual camera pipeline · recorded test source</h1>
      <label>
        Movement game
        <select
          aria-label="Test exercise"
          value={settings.exercise}
          onChange={(e) => {
            setPhase("idle");
            setSettings((s) => ({
              ...s,
              exercise: e.target.value as Exercise,
              personalization: null,
            }));
          }}
        >
          {exerciseOrder.map((game) => (
            <option key={game} value={game}>
              {exercises[game].tab}
            </option>
          ))}
        </select>
      </label>
      <p>
        No webcam access. Real MediaPipe inference from an official static test
        image. Test sessions are not rehabilitation sessions.
      </p>
      <button className="button primary" onClick={() => void tracking.start()}>
        Start recorded source
      </button>
      <button className="button secondary" onClick={() => setPhase("setup")}>
        Open actual scan UI
      </button>
      <button
        className="button secondary"
        onClick={() => setPhase("calibration")}
      >
        Open actual movement UI
      </button>
      <button
        className="button secondary"
        style={{
          position: "fixed",
          top: 65,
          left: 6,
          zIndex: 120,
          fontSize: 9,
          padding: 6,
        }}
        onClick={() => {
          targetLift = -110;
        }}
      >
        Lift recorded hand
      </button>
      <button
        className="button secondary"
        style={{
          position: "fixed",
          top: 110,
          left: 6,
          zIndex: 120,
          fontSize: 9,
          padding: 6,
        }}
        onClick={() => {
          targetLift = 0;
        }}
      >
        Lower recorded hand
      </button>
      <button className="button secondary" onClick={tracking.stop}>
        Stop source
      </button>
      <button
        className="button secondary"
        style={{
          position: "fixed",
          top: 4,
          left: 6,
          zIndex: 120,
          fontSize: 9,
          padding: 6,
        }}
        onClick={() => {
          image = new Image();
          image.src = new URL("./fixtures/thumb_up.jpg", import.meta.url).href;
        }}
      >
        Show folded fingers fixture
      </button>
      <button
        className="button secondary"
        style={{
          position: "fixed",
          top: 4,
          right: 6,
          zIndex: 120,
          fontSize: 9,
          padding: 6,
        }}
        onClick={() => {
          image = new Image();
          image.src = new URL(
            "./fixtures/right_hands.jpg",
            import.meta.url,
          ).href;
        }}
      >
        Show open fingers fixture
      </button>
      <button
        className="button secondary"
        style={{
          position: "fixed",
          bottom: 4,
          left: 6,
          zIndex: 120,
          fontSize: 9,
          padding: 6,
        }}
        onClick={() => {
          targetTilt = 28;
        }}
      >
        Tilt recorded hand left
      </button>
      <button
        className="button secondary"
        style={{
          position: "fixed",
          bottom: 4,
          right: 6,
          zIndex: 120,
          fontSize: 9,
          padding: 6,
        }}
        onClick={() => {
          targetTilt = -28;
        }}
      >
        Tilt recorded hand right
      </button>
      <div style={{ maxWidth: 430, marginTop: 20 }}>
        <CameraFeed
          tracking={tracking}
          arm={settings.arm}
          sourceLabel="Recorded test source"
          exercise={settings.exercise}
        />
      </div>
      <pre id="diagnostic" style={{ whiteSpace: "pre-wrap" }}>
        {JSON.stringify(
          {
            status: tracking.status,
            valid: tracking.frame.valid,
            angle: tracking.frame.angle,
            handHeight: tracking.frame.height,
            openness: tracking.frame.openness,
            rawOpenness: tracking.frame.rawOpenness,
            tilt: tracking.frame.tilt,
            steering: tracking.frame.steering,
            ageMs: Math.round(performance.now() - tracking.frame.at),
            videoAttached: tracking.video.current?.isConnected,
            diagnostics: tracking.diagnostics,
            phase,
            personalProfile: settings.personalization,
          },
          null,
          2,
        )}
      </pre>
      {(phase === "calibration" || phase === "setup") && (
        <Setup
          settings={settings}
          setSettings={setSettings}
          tracking={tracking}
          session={
            {
              phase,
              transition: (next: "calibration") => setPhase(next),
              reset: (next: "playing") => setPhase(next),
            } as unknown as Session
          }
          onClose={() => setPhase("idle")}
          onDemo={() => setPhase("practice")}
        />
      )}{" "}
      {(phase === "practice" || phase === "playing") && (
        <h2>
          Game reached with real model tracking:{" "}
          {tracking.frame.valid ? "valid" : "waiting"}
        </h2>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<Check />);
