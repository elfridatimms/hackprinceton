import { useState } from "react";
import type { Tracking } from "../movement/useTracking";
export function CameraDiagnostics({
  tracking,
  onRestart,
}: {
  tracking: Tracking;
  onRestart: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const d = tracking.diagnostics;
  const report = () =>
    JSON.stringify(
      {
        build: d?.build ?? "forest-games-5",
        stage: d?.stage ?? tracking.status,
        cameraStatus: tracking.status,
        videoSize: d?.video ?? "unknown",
        videoAttached: tracking.video.current?.isConnected ?? false,
        videoReadyState: tracking.video.current?.readyState ?? 0,
        videoPaused: tracking.video.current?.paused ?? true,
        engine: d?.engine ?? "CPU",
        inferenceMs: d?.inferenceMs ?? null,
        processedFrames: d?.frames ?? 0,
        lastFrameAgeMs: tracking.frame.at
          ? Math.round(performance.now() - tracking.frame.at)
          : null,
        armDetected: tracking.frame.valid,
        error: d?.lastError || tracking.error || null,
      },
      null,
      2,
    );
  return (
    <details className="calibration-help camera-diagnostics">
      <summary>Grown-up camera help</summary>
      <p>
        Tracker: {d?.engine ?? "CPU"} · {d?.stage ?? tracking.status}
      </p>
      {d?.inferenceMs !== null && d?.inferenceMs !== undefined && (
        <p>
          Processing: {d.inferenceMs} ms · {d.frames} frames received
        </p>
      )}
      {d?.lastError && <p className="error-message">{d.lastError}</p>}
      <p>
        Use the camera view shown in your movement game. Keep the same playing
        hand visible throughout.
      </p>
      <div className="camera-help-actions">
        <button className="button secondary" onClick={onRestart}>
          Restart camera
        </button>
        <button
          className="button secondary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(report());
              setCopied(true);
            } catch {
              setCopied(false);
            }
          }}
        >
          {copied ? "Report copied" : "Copy camera report"}
        </button>
      </div>
      <textarea
        className="camera-report-text"
        aria-label="Camera report"
        readOnly
        rows={7}
        value={report()}
        onFocus={(e) => e.currentTarget.select()}
      />
      <p>
        No images, video, angles or movement history are included in the report.
      </p>
    </details>
  );
}
