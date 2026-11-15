/**
 * Development-only presentation poster, built from the real app: the real
 * MediaPipe Hand Landmarker runs on an official MediaPipe test image, the real
 * camera overlay draws it, and the real 3D game scene reacts. Not in the build.
 */
import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { useTracking } from "../src/movement/useTracking";
import { CameraFeed } from "../src/components/CameraPanel";
import { Forest } from "../src/game/Forest";
import { Portrait } from "../src/components/Illustrations";
import { GameGlyph } from "../src/components/GameTabs";
import type { WorldState } from "../src/game/session";
import { consistency, createPlan, exampleHistory } from "../src/care/plan";
import "../src/style.css";

const image = new Image();
image.src = new URL("./fixtures/right_hands.jpg", import.meta.url).href;
const requestSource = async () => {
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = 960;
  canvas.height = 720;
  const c = canvas.getContext("2d")!;
  const draw = () => {
    c.fillStyle = "#dfe6dc";
    c.fillRect(0, 0, canvas.width, canvas.height);
    const sx = 350,
      sw = image.naturalWidth - sx;
    const s = Math.min(canvas.width / sw, canvas.height / image.naturalHeight) * 0.92;
    const w = sw * s,
      h = image.naturalHeight * s;
    c.drawImage(image, sx, 0, sw, image.naturalHeight, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
  };
  draw();
  setInterval(draw, 70);
  return canvas.captureStream(15);
};

const world: { current: WorldState } = {
  current: {
    celebrating: false,
    position: 0.2,
    velocity: 0,
    progress: 0.45,
    phase: "playing",
    waiting: false,
    fireflies: 6,
    collectAt: -100,
    reduced: false,
    speed: 1,
    exercise: "grip",
    goal: 0.9,
    dwell: 0,
    cycles: 3,
    streak: 3,
  },
};

const now = new Date();
const start = new Date(now);
start.setDate(start.getDate() - 13);
const plan = { ...createPlan("wrist", 8, start) };
const habit = consistency(plan, exampleHistory(plan, now), now);

function Poster() {
  const live = useTracking("right", requestSource, "grip", null);
  const [ready, setReady] = useState(false);
  // Headless rendering infers slowly; keep the latest real detection on screen.
  const held = useRef(live.frame);
  if (live.frame.valid) held.current = live.frame;
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 100);
    return () => clearInterval(id);
  }, []);
  const tracking = held.current.valid
    ? { ...live, frame: { ...held.current, at: performance.now() } }
    : live;
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void live.start();
    // Close and open the hand a few times so the meadow is sown and blooming.
    let t = 0;
    const id = setInterval(() => {
      t += 1;
      world.current.position = t % 2 ? 0.08 : 0.95;
      if (t >= 12) {
        clearInterval(id);
        world.current.position = 0.82;
      }
    }, 900);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (!held.current.valid || ready) return;
    const id = setTimeout(() => {
      setReady(true);
      (window as unknown as { __posterReady: boolean }).__posterReady = true;
    }, 13000);
    return () => clearTimeout(id);
  }, [held.current.valid, ready]);
  return (
    <div className="poster">
      <section className="poster-copy">
        <div className="poster-brand">
          <span className="poster-mark">
            <Portrait />
          </span>
          <strong>
            re<span>Habit</span>
          </strong>
        </div>
        <h1>
          Rehab that becomes
          <br />a habit.
        </h1>
        <p className="poster-lead">
          Camera games that turn a child’s home physiotherapy into play, and every
          game into progress a therapist can see.
        </p>
        <ol className="poster-steps">
          <li>
            <b>1</b>
            <div>
              <strong>MediaPipe sees the movement</strong>
              <span>Hand &amp; body landmarks, on the device</span>
            </div>
          </li>
          <li>
            <b>2</b>
            <div>
              <strong>The movement plays the game</strong>
              <span>Open your hand → the meadow blooms</span>
            </div>
          </li>
          <li>
            <b>3</b>
            <div>
              <strong>The habit shows up for the therapist</strong>
              <span>Daily consistency and range of motion</span>
            </div>
          </li>
        </ol>
        <div className="poster-games">
          {(["grip", "elbow", "wrist", "ship"] as const).map((g) => (
            <span key={g}>
              <span className="panel-game-glyph">
                <GameGlyph exercise={g} />
              </span>
              {g === "grip" ? "Hand" : g === "elbow" ? "Elbow" : g === "wrist" ? "Wrist" : "Forearm"}
            </span>
          ))}
        </div>
        <div className="poster-chips">
          <span>MediaPipe Hand + Holistic</span>
          <span>One Euro smoothing</span>
          <span>Video never leaves the device</span>
        </div>
      </section>
      <section className="poster-stage">
        <div className="poster-game">
          <Forest
            world={world}
            exercise="grip"
            onCollect={() => {}}
            focus={{ x: 1.2, y: -0.2, zoom: 92 }}
          />
          <div className="poster-game-label">
            <span className="panel-game-glyph">
              <GameGlyph exercise="grip" />
            </span>
            Sleepy Flowers · close to gather seeds, open to sow
          </div>
        </div>
        <div className="poster-camera">
          <div className="poster-tag">● MediaPipe · live hand landmarks</div>
          <CameraFeed
            tracking={tracking}
            arm="right"
            exercise="grip"
            sourceLabel="MediaPipe test image"
            guide={() => ({ value: world.current.position, goal: 0.9, dwell: 0.65 })}
          />
        </div>
        <svg className="poster-arrow" viewBox="0 0 160 90" aria-hidden="true">
          <path d="M6 70 C 50 80, 100 60, 140 18" />
          <path d="M122 16 L142 16 L138 36" />
        </svg>
        <div className="poster-habit">
          <span className="poster-habit-title">For the therapist · last 14 days</span>
          <div className="poster-days">
            {habit.daily.map((d) => (
              <i key={d.day} className={`poster-day ${d.status}`}>
                {d.status === "complete" ? "✓" : d.status === "partial" ? "◐" : ""}
              </i>
            ))}
          </div>
          <strong>
            {habit.complete}/{habit.planned} days done · wrist bend +18°
          </strong>
          <small>Example data</small>
        </div>
      </section>
      {!ready && <div className="poster-wait">Waiting for MediaPipe…</div>}
    </div>
  );
}

const css = `
html, body { margin: 0; background: #f6f4ec; }
.poster { position: relative; width: 1600px; height: 900px; overflow: hidden; display: grid;
  grid-template-columns: 520px 1fr; gap: 36px; padding: 56px 60px; box-sizing: border-box;
  background: radial-gradient(1200px 700px at 85% 10%, #e3eedc 0%, #f6f4ec 60%); color: #24483e;
  font-family: "DM Sans", system-ui, sans-serif; }
.poster-brand { display: flex; align-items: center; gap: 14px; }
.poster-mark { width: 74px; height: 78px; transform: rotate(-7deg); }
.poster-mark svg { width: 100%; height: 100%; }
.poster-brand strong { font-family: Nunito, sans-serif; font-weight: 900; font-size: 64px; letter-spacing: -2.5px; }
.poster-brand strong span { color: #5b8061; }
.poster h1 { font-family: Nunito, sans-serif; font-size: 50px; line-height: 1.08; letter-spacing: -1.5px; margin: 26px 0 16px; }
.poster-lead { font-size: 19px; line-height: 1.5; color: #4f6a55; margin: 0 0 28px; }
.poster-steps { list-style: none; padding: 0; margin: 0; display: grid; gap: 16px; }
.poster-steps li { display: flex; gap: 14px; align-items: center; }
.poster-steps b { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%;
  background: #2a5949; color: #fffdf0; font-family: Nunito, sans-serif; font-size: 20px; }
.poster-steps div { display: grid; }
.poster-steps strong { font-size: 19px; }
.poster-steps span { font-size: 15px; color: #61765e; }
.poster-games { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 30px; }
.poster-games > span { display: grid; justify-items: center; gap: 6px; padding: 12px 6px; border-radius: 18px;
  background: #fffef8; border: 1px solid #e6e1cc; font-weight: 700; font-size: 14px; }
.poster-games .panel-game-glyph { width: 46px; height: 46px; }
.poster-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 30px; }
.poster-chips span { padding: 7px 12px; border-radius: 999px; background: #fff; border: 1px solid #dfe3d2;
  font-size: 13px; font-weight: 600; }
.poster-stage { position: relative; }
.poster-game { position: absolute; right: 0; top: 0; width: 930px; height: 560px; border-radius: 28px;
  overflow: hidden; box-shadow: 0 30px 60px #24483e2e; background: #dce9d8; }
.poster-game-label { position: absolute; left: 18px; top: 16px; display: flex; align-items: center; gap: 10px;
  padding: 8px 14px 8px 8px; border-radius: 999px; background: #fffdf4ee; font-weight: 700; font-size: 15px; }
.poster-game-label .panel-game-glyph { width: 34px; height: 34px; }
.poster-camera { position: absolute; left: -10px; bottom: 0; width: 470px; padding: 12px; border-radius: 24px;
  background: #1f3d33; box-shadow: 0 26px 50px #0e312540; }
.poster-camera .camera-feed { border-radius: 16px; }
.poster-tag { color: #c6f59a; font-weight: 700; font-size: 14px; margin: 2px 4px 10px; letter-spacing: .2px; }
.poster-arrow { position: absolute; left: 468px; top: 400px; width: 160px; height: 90px; fill: none;
  stroke: #2a5949; stroke-width: 5; stroke-linecap: round; stroke-linejoin: round; }
.poster-habit { position: absolute; right: 24px; bottom: 0; width: 470px; padding: 18px 20px; border-radius: 22px;
  background: #fffef8; border: 1px solid #e6e1cc; box-shadow: 0 20px 40px #24483e1f; display: grid; gap: 10px; }
.poster-habit-title { font-size: 13px; font-weight: 700; color: #6b7b67; letter-spacing: .3px; }
.poster-habit strong { font-size: 18px; }
.poster-habit small { color: #8a9486; font-size: 12px; }
.poster-days { display: grid; grid-template-columns: repeat(14, 1fr); gap: 5px; }
.poster-day { display: grid; place-items: center; aspect-ratio: 1; border-radius: 50%; font-style: normal;
  font-weight: 900; font-size: 14px; border: 1.5px dashed #c9cdbd; color: #fff; }
.poster-day.complete { background: #0ca30c; border: none; }
.poster-day.partial { background: #fab219; border: none; color: #3b2a05; }
.poster-wait { position: absolute; right: 20px; top: 14px; font-size: 12px; color: #9aa; }
`;
const style = document.createElement("style");
style.textContent = css;
document.head.append(style);
createRoot(document.getElementById("root")!).render(<Poster />);
