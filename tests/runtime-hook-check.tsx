import React, { useState } from "react";
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
  exercises,
  type Exercise,
} from "../src/movement/exercises";
let image = new Image();
image.src = new URL("./fixtures/right_hands.jpg", import.meta.url).href;
const requestSource = async () => {
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const draw = () => {
    if (image.complete && image.naturalWidth) {
      const c = canvas.getContext("2d")!;
      c.clearRect(0, 0, canvas.width, canvas.height);
      const s = Math.min(
          canvas.width / image.naturalWidth,
          canvas.height / image.naturalHeight,
        ),
        w = image.naturalWidth * s,
        h = image.naturalHeight * s;
      c.drawImage(image, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
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
    [phase, setPhase] = useState<"idle" | "calibration" | "practice">("idle");
  const tracking = useTracking(settings.arm, requestSource, settings.exercise);
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
      <button
        className="button secondary"
        onClick={() => setPhase("calibration")}
      >
        Open actual calibration UI
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
            ageMs: Math.round(performance.now() - tracking.frame.at),
            videoAttached: tracking.video.current?.isConnected,
            diagnostics: tracking.diagnostics,
            phase,
          },
          null,
          2,
        )}
      </pre>
      {phase === "calibration" && (
        <Setup
          settings={settings}
          setSettings={setSettings}
          tracking={tracking}
          session={
            {
              phase: "calibration",
              reset: () => setPhase("practice"),
            } as unknown as Session
          }
          onClose={() => setPhase("idle")}
          onDemo={() => setPhase("practice")}
        />
      )}{" "}
      {phase === "practice" && (
        <h2>
          Practice reached with real model tracking:{" "}
          {tracking.frame.valid ? "valid" : "waiting"}
        </h2>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<Check />);
