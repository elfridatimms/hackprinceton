import { useEffect, useRef, useState } from "react";
import { Circle, Download, Play, Trash2, Video, X } from "lucide-react";
import { exerciseOrder, exercises, type Exercise } from "../movement/exercises";
import { childInstructions } from "../movement/instructions";
import { GameGlyph } from "./GameTabs";
import {
  bundledClip,
  cameraConstraints,
  deleteClip,
  loadClip,
  recordClip,
  saveClip,
} from "../demo/demoClips";

const CLIP_SECONDS = 15;
type Status = "recorded" | "bundled" | "none";

/**
 * Presentation helper: record a short clip per game in good light, then play
 * the games from those clips through the real tracker if the venue camera fails.
 */
export function DemoVideoSetup({
  enabled,
  onToggle,
  onClose,
}: {
  enabled: boolean;
  onToggle: (on: boolean) => void;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<Record<Exercise, Status>>(
    {} as Record<Exercise, Status>,
  );
  const [recording, setRecording] = useState<Exercise | null>(null),
    [countdown, setCountdown] = useState<number | null>(null),
    [left, setLeft] = useState(0),
    [preview, setPreview] = useState<{ exercise: Exercise; url: string } | null>(null),
    [error, setError] = useState("");
  const live = useRef<HTMLVideoElement>(null),
    stream = useRef<MediaStream | null>(null);
  const refresh = async () => {
    const next = {} as Record<Exercise, Status>;
    for (const e of exerciseOrder)
      next[e] = (await loadClip(e)) ? "recorded" : (await bundledClip(e)) ? "bundled" : "none";
    setStatus(next);
  };
  useEffect(() => {
    void refresh();
    return () => stream.current?.getTracks().forEach((t) => t.stop());
  }, []);
  useEffect(
    () => () => {
      if (preview?.url.startsWith("blob:")) URL.revokeObjectURL(preview.url);
    },
    [preview],
  );

  const record = async (exercise: Exercise) => {
    setError("");
    setPreview(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia(cameraConstraints);
      stream.current = s;
      setRecording(exercise);
      requestAnimationFrame(() => {
        if (live.current) {
          live.current.srcObject = s;
          void live.current.play();
        }
      });
      for (const n of [3, 2, 1]) {
        setCountdown(n);
        await new Promise((r) => setTimeout(r, 1000));
      }
      setCountdown(null);
      const blob = await recordClip(s, CLIP_SECONDS, setLeft);
      await saveClip(exercise, blob);
      setPreview({ exercise, url: URL.createObjectURL(blob) });
    } catch (e) {
      setError(
        e instanceof DOMException && e.name === "NotAllowedError"
          ? "Camera permission is needed to record a demo clip."
          : "Recording didn’t work in this browser. Try Chrome, or add a file to public/demo.",
      );
    } finally {
      stream.current?.getTracks().forEach((t) => t.stop());
      stream.current = null;
      setRecording(null);
      setCountdown(null);
      void refresh();
    }
  };
  const download = async (exercise: Exercise) => {
    const blob = await loadClip(exercise);
    if (!blob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${exercise}.${blob.type.includes("mp4") ? "mp4" : "webm"}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const show = async (exercise: Exercise) => {
    const blob = await loadClip(exercise);
    const url = blob ? URL.createObjectURL(blob) : await bundledClip(exercise);
    if (url) setPreview({ exercise, url });
  };

  return (
    <div className="modal-backdrop">
      <section
        className="modal care-plan-modal demo-video-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="demo-video-title"
      >
        <div className="report-head">
          <div>
            <span className="eyebrow">FOR PRESENTATIONS</span>
            <h2 id="demo-video-title">Recorded demo videos</h2>
            <p>
              Record a {CLIP_SECONDS}-second clip for each game in good light. If the
              venue camera fails, the games run on these clips through the real
              MediaPipe tracker, clearly labelled as a recording.
            </p>
          </div>
          <button className="icon-button" aria-label="Close demo videos" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <label className="demo-toggle">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
          />
          <span>
            <strong>Play games from recorded videos</strong>
            <small>Instead of the live camera. Games without a clip use the camera.</small>
          </span>
        </label>

        {recording && (
          <div className="record-stage">
            <video ref={live} muted playsInline className="record-live" />
            <div className="record-overlay">
              {countdown !== null ? (
                <strong className="record-count">{countdown}</strong>
              ) : (
                <span className="record-badge">
                  <Circle size={12} fill="currentColor" /> REC {left}s
                </span>
              )}
              <p>{exercises[recording].camera}</p>
            </div>
          </div>
        )}
        {preview && !recording && (
          <div className="record-stage">
            <video
              key={preview.url}
              src={preview.url}
              autoPlay
              loop
              muted
              playsInline
              className="record-live"
            />
            <div className="record-overlay">
              <span className="record-badge saved">
                {exercises[preview.exercise].tab} clip
              </span>
            </div>
          </div>
        )}
        {error && <div className="error-message">{error}</div>}

        <ol className="plan-items demo-clips">
          {exerciseOrder.map((e) => (
            <li key={e}>
              <span className="panel-game-glyph">
                <GameGlyph exercise={e} />
              </span>
              <div>
                <strong>{exercises[e].tab}</strong>
                <small>
                  {status[e] === "recorded"
                    ? "Clip recorded in this browser"
                    : status[e] === "bundled"
                      ? `Clip file in public/demo`
                      : `Move: ${childInstructions[e].high.replace(/\.$/, "").toLowerCase()}, then back, a few times`}
                </small>
              </div>
              <div className="demo-clip-actions">
                {status[e] && status[e] !== "none" && (
                  <button aria-label={`Preview ${exercises[e].tab} clip`} onClick={() => void show(e)}>
                    <Play size={14} />
                  </button>
                )}
                <button
                  className="record-button"
                  disabled={!!recording}
                  onClick={() => void record(e)}
                >
                  <Video size={14} /> {status[e] === "recorded" ? "Re-record" : "Record"}
                </button>
                {status[e] === "recorded" && (
                  <button
                    aria-label={`Download ${exercises[e].tab} clip`}
                    disabled={!!recording}
                    onClick={() => void download(e)}
                  >
                    <Download size={14} />
                  </button>
                )}
                {status[e] === "recorded" && (
                  <button
                    aria-label={`Delete ${exercises[e].tab} clip`}
                    disabled={!!recording}
                    onClick={() => void deleteClip(e).then(refresh)}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ol>
        <p className="report-note">
          Clips stay in this browser. Sessions played from a clip are marked as example
          data in the progress report. To make a clip permanent, save it as
          public/demo/&lt;game&gt;.webm (grip, elbow, wrist, ship).
        </p>
      </section>
    </div>
  );
}
