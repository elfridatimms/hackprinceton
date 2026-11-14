import { GameTabs } from "./components/GameTabs";
import { MovementLesson } from "./components/MovementLesson";
import { exercises, type Exercise } from "./movement/exercises";
import { MovementGuide } from "./components/MovementGuide";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Volume2,
  VolumeX,
  SlidersHorizontal,
  Sparkles,
  Leaf,
  Heart,
  ArrowUpRight,
  Pause,
  Play,
  RotateCcw,
  Home,
  CameraOff,
  Footprints,
  Moon,
  Check,
  Wind,
  X,
  Flag,
} from "lucide-react";
import { Forest } from "./game/Forest";
import {
  loadSettings,
  useSession,
  type Settings as Config,
} from "./game/session";
import { useTracking } from "./movement/useTracking";
import { audio } from "./audio/sound";
import {
  Portrait,
  SeatIllustration,
  TreeIllustration,
} from "./components/Illustrations";
import { InputPanel } from "./components/CameraPanel";
import { Settings, SessionDetails, formatTime } from "./components/Settings";
import { Setup } from "./components/Setup";
export default function App() {
  const [settings, setSettings] = useState<Config>(loadSettings),
    [showSettings, setShowSettings] = useState(false),
    [showDetails, setShowDetails] = useState(false),
    [collapsed, setCollapsed] = useState(false),
    [cameraOff, setCameraOff] = useState(false),
    [practiceUp, setPracticeUp] = useState(false),
    [practiceDone, setPracticeDone] = useState(false),
    [endingReady, setEndingReady] = useState(false);
  const [switchTarget, setSwitchTarget] = useState<Exercise | null>(null);
  const [showLesson, setShowLesson] = useState(false);
  const tracking = useTracking(settings.arm, undefined, settings.exercise),
    session = useSession(settings, tracking.frame, tracking.status === "on");
  const previousArm = useRef(settings.arm);
  const modalRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    try {
      localStorage.setItem("luma-settings", JSON.stringify(settings));
    } catch {}
    audio.mute(settings.muted);
    if (previousArm.current !== settings.arm) {
      previousArm.current = settings.arm;
      if (session.phase === "playing") session.transition("paused");
    }
  }, [settings]);
  useEffect(() => {
    if (session.phase === "practice") {
      setPracticeUp(false);
      setPracticeDone(false);
    }
    if (session.phase === "completed") {
      setEndingReady(false);
      const t = setTimeout(() => setEndingReady(true), 4500);
      return () => clearTimeout(t);
    }
  }, [session.phase]);
  useEffect(() => {
    if (session.phase === "practice" && !session.waiting) {
      if (session.position > 0.78) setPracticeUp(true);
      if (practiceUp && session.position < 0.22) setPracticeDone(true);
    }
  }, [session.position, session.phase, session.waiting, practiceUp]);
  const anyModal =
    !!switchTarget ||
    showLesson ||
    showSettings ||
    showDetails ||
    session.phase === "setup" ||
    session.phase === "calibration" ||
    session.phase === "paused" ||
    (session.phase === "completed" && endingReady) ||
    cameraOff;
  useEffect(() => {
    if (!anyModal) return;
    const previous = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => {
      const dialogs = document.querySelectorAll('[role="dialog"]');
      const dialog = dialogs[dialogs.length - 1];
      (
        dialog?.querySelector("button,input,select") as HTMLElement | null
      )?.focus();
    }, 50);
    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const dialogs = document.querySelectorAll('[role="dialog"]');
      const dialog = dialogs[dialogs.length - 1];
      const nodes = dialog?.querySelectorAll<HTMLElement>(
        'button:not(:disabled),input:not(:disabled),select:not(:disabled),[tabindex="0"]',
      );
      if (!nodes?.length) return;
      const first = nodes[0],
        last = nodes[nodes.length - 1];
      if (!dialog.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
        return;
      }
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", trap);
      previous?.focus();
    };
  }, [anyModal, showSettings, showDetails, switchTarget, showLesson]);
  const startDemo = () => {
    tracking.stop();
    setCameraOff(false);
    setShowSettings(false);
    session.setMode("demo");
    audio.start();
    session.reset("practice");
  };
  const startCamera = () => {
    audio.start();
    session.setMode("camera");
    session.reset("setup");
  };
  const home = () => {
    tracking.stop();
    session.reset("welcome");
    setCameraOff(false);
  };
  const enterGame = (next: Exercise) => {
    if (session.seconds > 0 || session.cycles > 0) session.finish(false);
    tracking.stop();
    session.reset("welcome");
    setSettings((current) => ({ ...current, exercise: next }));
    setSwitchTarget(null);
    setShowLesson(false);
  };
  const selectGame = (next: Exercise) => {
    if (next === settings.exercise) return;
    if (
      session.phase === "playing" &&
      (session.seconds > 0 || session.cycles > 0)
    ) {
      session.transition("paused");
      setSwitchTarget(next);
    } else enterGame(next);
  };
  const watchLesson = () => {
    if (session.phase === "playing" || session.phase === "practice")
      session.transition("paused");
    setShowLesson(true);
  };
  const toggleSound = () => {
    audio.start();
    setSettings((s) => ({ ...s, muted: !s.muted }));
  };
  const openSettings = () => {
    if (session.phase === "playing" || session.phase === "practice")
      session.transition("paused");
    setShowSettings(true);
  };
  const section =
    session.cycles < settings.target / 3
      ? 0
      : session.cycles < (settings.target * 2) / 3
        ? 1
        : 2;
  const chapters = [
    "The waking meadow",
    "The whispering woods",
    "The lantern grove",
  ];
  const previousPhase = useRef(session.phase);
  useEffect(() => {
    const was = previousPhase.current;
    previousPhase.current = session.phase;
    if (
      (session.phase === "practice" || session.phase === "playing") &&
      was !== session.phase &&
      was !== "paused" &&
      window.innerWidth < 620
    )
      document.getElementById("forest-game-panel")?.scrollIntoView({
        block: "start",
        behavior: settings.reducedMotion ? "auto" : "smooth",
      });
  }, [session.phase, settings.reducedMotion]);
  const isHome = ["welcome", "setup", "calibration"].includes(session.phase);
  const progress = Math.min(100, (session.cycles / settings.target) * 100);
  const [tip, setTip] = useState(0);
  useEffect(() => {
    if (session.phase !== "playing") return;
    const t = setInterval(() => setTip((n) => (n + 1) % 3), 18000);
    return () => clearInterval(t);
  }, [session.phase]);
  return (
    <div
      className={settings.reducedMotion ? "app reduced-motion" : "app"}
      ref={modalRef}
    >
      <header className="header">
        <button className="brand" onClick={home} aria-label="Luma home">
          <span className="brand-mark">
            <Portrait />
          </span>
          <span>
            <strong>
              luma<span className="brand-spark">✧</span>
            </strong>
            <small>& THE FIREFLY FOREST</small>
          </span>
        </button>
        <div className="header-center">
          <span className="status-spark">✦</span> A little light goes a long
          way.
        </div>
        <div className="header-actions">
          <button
            className="sound-button"
            aria-label={settings.muted ? "Turn sound on" : "Mute sound"}
            onClick={toggleSound}
          >
            {settings.muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            <span>Sound {settings.muted ? "off" : "on"}</span>
          </button>
          <span className="header-divider" />
          <button className="settings-button" onClick={openSettings}>
            <SlidersHorizontal size={16} />
            <span>Grown-up settings</span>
          </button>
        </div>
      </header>
      <GameTabs selected={settings.exercise} onSelect={selectGame} />
      <main
        id="forest-game-panel"
        role="tabpanel"
        aria-labelledby={`game-tab-${settings.exercise}`}
      >
        {isHome ? (
          <>
            <div className="welcome-scene">
              <Forest
                key="welcome-forest"
                world={session.world}
                exercise={settings.exercise}
                welcome
                onCollect={session.collect}
              />
              <div className="welcome-wash" />
              <div className="hero-copy">
                <div className="hero-label">
                  <span /> YOUR MOVEMENT MAKES THE MAGIC
                </div>
                <h1>
                  {exercises[settings.exercise].hero[0]}
                  <br />
                  <em>{exercises[settings.exercise].hero[1]}</em>
                </h1>
                <p>
                  {exercises[settings.exercise].intro}
                  <br />
                  {exercises[settings.exercise].promise}
                </p>
                <div className="hero-buttons">
                  <button className="button primary" onClick={startCamera}>
                    Let’s play with Luma <ArrowRight size={19} />
                  </button>
                  <button className="hero-demo" onClick={startDemo}>
                    Try without a camera <ArrowUpRight size={16} />
                  </button>
                </div>
                <div className="hero-micro">
                  <Heart size={14} /> Your pace is the perfect pace.
                </div>
              </div>
              <div className="meet-luma">
                <span>
                  {settings.exercise === "ship"
                    ? "A little island awaits"
                    : "Meet Luma"}
                </span>
                <svg viewBox="0 0 80 48" fill="none">
                  <path
                    d="M1 2q50-8 58 24l5 13m-13-7 13 7 6-13"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div className="scene-caption">
                <span className="tiny-firefly">✦</span>{" "}
                {settings.exercise === "ship"
                  ? "YOUR LITTLE SHIP IS READY TO SAIL"
                  : "THE FOREST IS WAITING FOR YOU"}
              </div>
              <div className="scene-bottom-stamp">
                <Leaf size={14} /> A little wonder. A lot of heart.
              </div>
            </div>
            <section className="comfort-strip" aria-label="At your own pace">
              <div className="comfort-item">
                <span className="comfort-icon seat">
                  <SeatIllustration small />
                </span>
                <div>
                  <h3>Settle in, little explorer.</h3>
                  <p>Find a comfy seat. The forest can wait.</p>
                </div>
              </div>
              <span className="comfort-divider" />
              <div className="comfort-item">
                <span className="comfort-icon">
                  <Wind size={27} strokeWidth={1.4} />
                </span>
                <div>
                  <h3>Your movement makes the magic.</h3>
                  <p>Even small movements go a long way.</p>
                </div>
              </div>
              <span className="comfort-divider" />
              <div className="comfort-item">
                <span className="comfort-icon peach">
                  <Moon size={25} strokeWidth={1.4} />
                  <span className="mini-star">✧</span>
                </span>
                <div>
                  <h3>A break is part of the adventure.</h3>
                  <p>Rest anytime. Luma will be right here.</p>
                </div>
              </div>
            </section>
            <section className="journey-teaser">
              <div>
                <span className="eyebrow">ONE LITTLE JOURNEY</span>
                <h2>
                  {settings.exercise === "ship"
                    ? "A little sea of sparkling discoveries."
                    : "A forest to bring back to light."}
                </h2>
              </div>
              <div className="chapter-preview">
                <span className="chapter-dot meadow">
                  <Leaf size={18} />
                </span>
                <span>
                  {settings.exercise === "ship"
                    ? "The little lagoon"
                    : "The waking meadow"}
                </span>
                <i />
                <span className="chapter-dot woods">
                  <Footprints size={18} />
                </span>
                <span>
                  {settings.exercise === "ship"
                    ? "Sparkle Island"
                    : "The whispering woods"}
                </span>
                <i />
                <span className="chapter-dot grove">
                  <TreeIllustration />
                </span>
                <span>
                  {settings.exercise === "ship"
                    ? "A happy homecoming"
                    : "The lantern grove"}
                </span>
              </div>
              <span className="teaser-end">
                Let’s make a little magic <Sparkles size={15} />
              </span>
            </section>
          </>
        ) : (
          <>
            <div className="adventure-topline">
              <button
                className="text-button"
                onClick={() => session.transition("paused")}
              >
                <Leaf size={16} /> Your little adventure
              </button>
              <span className="input-badge">
                {session.mode === "demo" ? "DEMO CONTROLS" : "CAMERA MODE"}
                <span />{" "}
                {session.mode === "demo"
                  ? "Keyboard & slider"
                  : ["grip", "wrist", "ship"].includes(settings.exercise)
                    ? "One playing hand"
                    : settings.arm + " arm"}
              </span>
            </div>
            <div
              className={"play-layout " + (collapsed ? "camera-collapsed" : "")}
            >
              <section className="game-viewport">
                <Forest
                  key="play-forest"
                  world={session.world}
                  exercise={settings.exercise}
                  onCollect={session.collect}
                />
                <div className="game-hud">
                  <div className="section-label">
                    <span className="portrait-chip">
                      <Portrait />
                    </span>
                    <div>
                      <small>CHAPTER {section + 1} OF 3</small>
                      <strong>
                        {settings.exercise === "ship"
                          ? [
                              "The little lagoon",
                              "Sparkle Island",
                              "A happy homecoming",
                            ][section]
                          : chapters[section]}
                      </strong>
                    </div>
                  </div>
                  <div className="journey-progress">
                    <Leaf size={16} />
                    <div>
                      <span style={{ width: progress + "%" }} />
                      {[0, 1, 2].map((i) => (
                        <i key={i} className={section >= i ? "passed" : ""} />
                      ))}
                    </div>
                    <TreeIllustration />
                  </div>
                  <div className="game-hud-buttons">
                    <button
                      className="round-button lesson-help-button"
                      aria-label="Show me how to play"
                      onClick={watchLesson}
                    >
                      ?
                    </button>
                    <button
                      aria-label="Pause adventure"
                      className="round-button"
                      onClick={() => session.transition("paused")}
                    >
                      <Pause size={18} />
                    </button>
                    <button
                      aria-label={
                        settings.muted ? "Turn sound on" : "Mute sound"
                      }
                      className="round-button"
                      onClick={toggleSound}
                    >
                      {settings.muted ? (
                        <VolumeX size={18} />
                      ) : (
                        <Volume2 size={18} />
                      )}
                    </button>
                  </div>
                </div>
                <div className="firefly-score">
                  <Sparkles size={18} />
                  <strong>{session.fireflies}</strong>
                  <span>little lights</span>
                </div>
                {settings.exercise === "ship" && (
                  <div
                    className="pirate-voyage"
                    aria-label={`${session.cycles} of ${settings.target} voyages completed`}
                  >
                    <span>⚑ LITTLE CAPTAIN’S LOG</span>
                    <strong>
                      {session.cycles} / {settings.target} little voyages
                    </strong>
                    <small>Sail to a glowing ring. Then sail back.</small>
                  </div>
                )}
                {settings.exercise === "grip" && (
                  <div
                    className="little-flower-patch"
                    aria-label={`${session.cycles} of ${settings.target} flowers woken`}
                  >
                    <span className="patch-title">
                      YOUR LITTLE FLOWER PATCH
                    </span>
                    <div>
                      {Array.from(
                        { length: Math.min(16, settings.target) },
                        (_, i) => (
                          <i
                            key={i}
                            className={i < session.cycles ? "bloom-awake" : ""}
                          >
                            ✿
                          </i>
                        ),
                      )}
                    </div>
                    <small>
                      {session.cycles} / {settings.target} little blooms
                    </small>
                  </div>
                )}
                {session.waiting && session.phase !== "paused" && (
                  <div className="tracking-wait">
                    <span className="wait-icon">
                      <Portrait />
                    </span>
                    <h3>Luma is right here.</h3>
                    <p>
                      {tracking.status === "on"
                        ? tracking.frame.valid
                          ? "There you are. Let’s settle for a moment."
                          : tracking.frame.message
                        : "Reconnect your camera to keep exploring."}
                    </p>
                    <span>
                      {settings.exercise === "ship"
                        ? "Show your palm with fingers pointing up."
                        : settings.exercise === "wrist"
                          ? "Show your wrist and knuckles to the camera."
                          : settings.exercise === "grip"
                            ? "Show your palm and fingertips to the camera."
                            : settings.exercise === "reach"
                              ? "Let the camera see your shoulders and hand."
                              : "Bring your shoulder, elbow, and wrist into view."}
                    </span>
                    {tracking.status !== "on" && (
                      <button
                        className="button secondary"
                        onClick={() => void tracking.start()}
                      >
                        Reconnect camera
                      </button>
                    )}
                  </div>
                )}
                {session.phase === "practice" && !session.waiting && (
                  <div className="practice-card">
                    <div className="practice-guide">
                      <MovementGuide
                        exercise={settings.exercise}
                        direction={practiceUp ? "down" : "up"}
                        compact
                      />
                    </div>
                    <span className="eyebrow">YOUR LITTLE MAGIC MOVE</span>
                    <h3>
                      {practiceDone
                        ? "You did it, little light keeper!"
                        : practiceUp
                          ? exercises[settings.exercise].down
                          : exercises[settings.exercise].up}
                    </h3>
                    <p>
                      {practiceDone
                        ? settings.exercise === "grip"
                          ? "Ready to wake the sleepy flowers?"
                          : settings.exercise === "ship"
                            ? "Ready to sail to Sparkle Island?"
                            : settings.exercise === "wrist"
                              ? "Ready to give a butterfly a breeze?"
                              : "Ready to bring the fireflies home?"
                        : session.mode === "demo"
                          ? settings.exercise === "ship"
                            ? practiceUp
                              ? "Press ← or slide left."
                              : "Press → or slide right."
                            : practiceUp
                              ? "Press ↓ or move the slider down."
                              : "Press ↑ or move the slider up."
                          : practiceUp
                            ? exercises[settings.exercise].down
                            : exercises[settings.exercise].up}
                    </p>
                    {practiceDone && (
                      <button
                        className="button primary"
                        onClick={() => session.reset("playing")}
                      >
                        {settings.exercise === "grip"
                          ? "Let’s wake the flowers!"
                          : settings.exercise === "ship"
                            ? "Ahoy! Let’s sail!"
                            : settings.exercise === "wrist"
                              ? "Let’s help the butterflies!"
                              : "Let’s find the fireflies"}{" "}
                        <ArrowRight size={16} />
                      </button>
                    )}
                  </div>
                )}
                {session.phase === "playing" && !session.waiting && (
                  <div className="game-encouragement">
                    <span>✦</span>
                    {
                      (settings.exercise === "ship"
                        ? [
                            "Ahoy, little captain. Take your time.",
                            "A little tilt. A lovely voyage.",
                            "Sail to the sparkling ring.",
                            "The islands are happy to see you.",
                            "Rest whenever you like.",
                            "Your next little light is waiting.",
                          ]
                        : [
                            "Take your time. Luma is with you.",
                            "Every little light has a way home.",
                            "The grove is getting closer.",
                          ])[tip]
                    }
                  </div>
                )}
                {session.phase === "completed" && !endingReady && (
                  <div className="ending-title">
                    <span>✦</span>
                    <h2>
                      {session.summary?.finished
                        ? "A little light becomes a thousand."
                        : "Every little adventure matters."}
                    </h2>
                  </div>
                )}
              </section>
              <InputPanel
                onLesson={watchLesson}
                exercise={settings.exercise}
                session={session}
                tracking={tracking}
                arm={settings.arm}
                collapsed={collapsed}
                setCollapsed={setCollapsed}
                onCameraOff={() => {
                  session.transition("paused");
                  setCameraOff(true);
                  tracking.stop();
                }}
              />
            </div>
            <div className="game-bottom">
              <div className="movement-indicator">
                <span className="movement-icon">
                  <Wind size={19} />
                </span>
                <div>
                  <span>Your movement</span>
                  <div className="movement-track">
                    <i style={{ left: `${session.position * 100}%` }} />
                  </div>
                </div>
                <span className="movement-words">
                  {settings.exercise === "ship"
                    ? "left · right"
                    : "lower · higher"}
                </span>
              </div>
              <div className="bottom-stat">
                <strong>
                  {session.cycles}
                  <small> / {settings.target}</small>
                </strong>
                <span>
                  {settings.exercise === "grip"
                    ? "flowers woken"
                    : settings.exercise === "ship"
                      ? "little voyages"
                      : "complete cycles"}
                </span>
              </div>
              <div className="bottom-stat time-stat">
                <strong>{formatTime(session.seconds)}</strong>
                <span>active play</span>
              </div>
              <div className="tracking-bottom">
                <i className={session.waiting ? "" : "valid-dot"} />
                {session.mode === "demo"
                  ? "Demo input"
                  : session.waiting
                    ? ["grip", "wrist", "ship"].includes(settings.exercise)
                      ? "Finding your hand"
                      : "Finding your arm"
                    : ["grip", "wrist", "ship"].includes(settings.exercise)
                      ? "Hand in view"
                      : "Arm in view"}
              </div>
              <button
                className="break-button"
                onClick={() => session.transition("paused")}
              >
                <Moon size={17} /> Take a break
              </button>
            </div>
            <div className="play-footnote">
              <Heart size={13} /> Gentle is good. There’s no hurry here.
              <span>
                {session.mode === "demo"
                  ? "Demo activity is not a clinical measurement."
                  : "Video is processed on this device and is never saved."}
              </span>
            </div>
          </>
        )}
      </main>
      <footer>
        <span>
          <span className="footer-spark">✦</span> Small steps. Wonderful things.
        </span>
        <span>Made with a little magic, for every little explorer.</span>
        <button
          onClick={() => {
            setShowDetails(true);
            if (session.phase === "playing") session.transition("paused");
          }}
        >
          Session details <ShieldIcon />
        </button>
      </footer>
      {(session.phase === "setup" || session.phase === "calibration") && (
        <Setup
          session={session}
          settings={settings}
          setSettings={setSettings}
          tracking={tracking}
          onClose={home}
          onDemo={startDemo}
        />
      )}
      {session.phase === "paused" &&
        !showSettings &&
        !showLesson &&
        !switchTarget &&
        !showDetails &&
        !cameraOff && (
          <div className="modal-backdrop rest-backdrop">
            <section
              className="modal rest-card"
              role="dialog"
              aria-modal="true"
              aria-labelledby="rest-title"
            >
              <div className="rest-illustration">
                <span className="rest-moon">☾</span>
                <Portrait />
                <span className="rest-lantern">✦</span>
                <span className="rest-ground" />
              </div>
              <span className="eyebrow">A LITTLE MOMENT TO REST</span>
              <h2 id="rest-title">Even dragons take breaks.</h2>
              <p>
                Take all the time you need.
                <br />
                Luma is keeping your place warm.
              </p>
              <button
                className="button primary full"
                onClick={() => {
                  audio.start();
                  session.resume();
                }}
              >
                <Play size={16} /> Continue our adventure
              </button>
              <button
                className="button secondary full"
                onClick={() => {
                  audio.start();
                  session.reset("practice");
                }}
              >
                <RotateCcw size={16} /> Restart adventure
              </button>
              <button
                className="text-button centered"
                onClick={() => {
                  tracking.stop();
                  session.finish(false);
                }}
              >
                Finish for now
              </button>
            </section>
          </div>
        )}
      {cameraOff && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="camera-off-title"
          >
            <CameraOff size={30} />
            <h2 id="camera-off-title">Your camera is off.</h2>
            <p>
              Your adventure is resting. Reconnect your camera to continue, or
              start a new adventure with clearly labeled demo controls.
            </p>
            <button
              className="button primary full"
              onClick={() => {
                setCameraOff(false);
                void tracking.start();
                session.transition("playing");
              }}
            >
              Reconnect camera
            </button>
            <button className="button secondary full" onClick={startDemo}>
              Start a demo adventure
            </button>
            <button className="text-button centered" onClick={home}>
              Back to home
            </button>
          </section>
        </div>
      )}
      {session.phase === "completed" && endingReady && session.summary && (
        <div className="modal-backdrop result-backdrop">
          <section
            className="modal result-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="result-title"
          >
            <div className="keepsake-art">
              <TreeIllustration />
              <span>✦</span>
              <i>✧</i>
            </div>
            <span className="eyebrow">
              {session.summary.finished
                ? "A LITTLE ADVENTURE. A BEAUTIFUL ENDING."
                : "A LITTLE LIGHT, SAFELY HOME."}
            </span>
            <h2 id="result-title">
              {session.summary.finished
                ? settings.exercise === "ship"
                  ? "Ahoy! What a lovely little voyage."
                  : "You brought the forest back to light."
                : "Thanks for exploring with Luma."}
            </h2>
            <p>
              {session.summary.finished
                ? "Every little movement made a little magic."
                : "Your little lights will be waiting for next time."}
            </p>
            <div className="result-stats">
              <div>
                <strong>{session.summary.cycles}</strong>
                <span>
                  {settings.exercise === "grip"
                    ? "flowers woken"
                    : settings.exercise === "ship"
                      ? "little voyages"
                      : "complete cycles"}
                </span>
              </div>
              <div>
                <strong>{formatTime(session.summary.seconds)}</strong>
                <span>active play</span>
              </div>
              <div>
                <strong>{session.summary.fireflies}</strong>
                <span>
                  {settings.exercise === "ship"
                    ? "island lights found"
                    : "fireflies found"}
                </span>
              </div>
            </div>
            <div className="result-mode">
              {session.mode === "demo"
                ? "Demo session · keyboard & slider"
                : "Camera session · projected movement"}
            </div>
            <button
              className="button primary full"
              onClick={() => {
                audio.start();
                session.reset("practice");
              }}
            >
              {settings.exercise === "ship"
                ? "Sail together again"
                : "Visit the forest again"}{" "}
              <ArrowRight size={17} />
            </button>
            <button
              className="button secondary full"
              onClick={() => setShowDetails(true)}
            >
              See session details
            </button>
            <button className="text-button centered" onClick={home}>
              <Home size={14} /> Back to home
            </button>
          </section>
        </div>
      )}
      {showLesson && (
        <MovementLesson
          exercise={settings.exercise}
          onClose={() => setShowLesson(false)}
          onTry={() => {
            setShowLesson(false);
            session.resume();
          }}
        />
      )}
      {switchTarget && (
        <div className="modal-backdrop">
          <section
            className="modal switch-game-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="switch-game-title"
          >
            <Portrait />
            <h2 id="switch-game-title">A different kind of magic?</h2>
            <p>
              Luma will finish this adventure for now. A fresh little journey is
              waiting in {exercises[switchTarget].tab}.
            </p>
            <button
              className="button primary full"
              onClick={() => enterGame(switchTarget)}
            >
              Try {exercises[switchTarget].tab} <ArrowRight size={16} />
            </button>
            <button
              className="button secondary full"
              onClick={() => setSwitchTarget(null)}
            >
              Stay with this adventure
            </button>
          </section>
        </div>
      )}
      {showSettings && (
        <Settings
          settings={settings}
          onSave={setSettings}
          onClose={() => setShowSettings(false)}
          onRecalibrate={() => {
            setShowSettings(false);
            tracking.stop();
            startCamera();
          }}
          onDetails={() => {
            setShowSettings(false);
            setShowDetails(true);
          }}
        />
      )}
      {showDetails && (
        <SessionDetails
          summary={session.summary}
          onClose={() => setShowDetails(false)}
        />
      )}
    </div>
  );
}
function ShieldIcon() {
  return <Check size={12} />;
}
