# Luma & the Firefly Forest

A complete, browser-based React + TypeScript + Three.js adventure about a small dragon bringing the fireflies home. All character and forest art is original, procedural geometry. An orthographic camera, sculpted forms, layered scenery, animated wings, expressive eyes, a glowing lantern, local musical chimes, and a three-chapter journey create the storybook world.

## Run

Requires Node.js 22.12+ (tested with Node 26).

```sh
npm install
npm run dev
```

Open the printed localhost address. For production:

```sh
npm test
npm run build
npm run dev -- --port 5173
```

Serve `dist/` with any static HTTPS host. Camera permission works on HTTPS or localhost. All MediaPipe WASM files and the Pose Landmarker Full model are bundled under `public/`; there is no external model download during play. The optional Google Fonts request can fail safely to system fonts.

## Play

- Choose **Try without a camera** to use ↑ / ↓ or the touch/pointer slider. Practice raising and lowering Luma, then begin the journey. Start low, rise to the top, then return low to complete a cycle. Hold gently at each end for a moment.
- Choose **Start my adventure** for the camera setup. Camera access is requested only after pressing **Turn on my camera**. Choose your arm, sit side-on, and keep shoulder, elbow, and wrist visible. Capture two comfortable, steady endpoints. The whole playable vertical range maps to these endpoints, including a small 5° range.
- **Grown-up settings** configure the arm, range, cycle target, scenery speed, smoothing, sound, reduced motion, and optional local summaries. Eight cycles is a demonstration setting, not a treatment recommendation.
- Escape, **Take a break**, or the pause control opens the rest screen. Switching tabs or windows pauses the session. Restart resets all session data. Camera loss pauses progression and never switches inputs silently.
- Firefly collection uses actual proximity to Luma. Missing targets has no penalty. The tree lights up when the configured cycles are complete. Results contain actual cycles, active time, collections, input mode, and a real movement trace in session details.

## Movement and cycle logic

`src/movement/core.ts` contains pure, tested logic. The image-space shoulder→elbow and wrist→elbow vectors use `x * videoWidth/videoHeight` and unscaled `y`, preventing video aspect ratio from distorting the angle. Their interior angle is 180° at extension and decreases with flexion. The selected arm uses landmark indices 11/13/15 (left) or 12/14/16 (right). Missing, off-screen, degenerate, or low-confidence landmarks are rejected. This is a projected 2D estimate.

Calibration requires at least five valid samples spanning 650 ms within a recent 1.6 s window, with no gap over 450 ms. The central 80% must span no more than 6°. A median endpoint avoids isolated outliers. Calibration keeps a mirrored live camera preview visible, shows each arm landmark’s status, lets the user explicitly switch arms, and always provides an explicit demo exit. Two captured endpoints are ordered by angle, so reversed capture order cannot trap the user. A configured comfortable range can also be used while tracking is currently valid. Endpoints must differ by at least 5°. Normalized flight height is clamped `(lowerAngle - angle) / (lowerAngle - upperAngle)`. Exponential smoothing uses real elapsed time and the configured time constant.

A cycle is **low → high → low**. The counter requires 220 ms dwell at each endpoint, separate 18%/82% thresholds, and release thresholds of 28%/72% for hysteresis. Starting high, partial movement, jitter, pause, and invalid tracking cannot complete a cycle. Loss invalidates the pending cycle; recovery starts from a new low endpoint.

MediaPipe runs one-person inference at up to 15 Hz, separately from Three.js rendering. Frames more than 450 ms old are invalid. Counting stops immediately on an invalid frame; the dragon waits calmly and the world stops. Reacquisition requires 650 ms of stable valid tracking. Backgrounding resets the gate and requires explicit resume. The full pose model uses GPU acceleration with CPU fallback; synchronous inference can briefly block the main thread. A worker-based tracker would be a future performance improvement on slower devices.

## Organization

- `src/game/Forest.tsx`, `Dragon.tsx`: rendering, scenery, fireflies, character animation, celebration.
- `src/movement/useTracking.ts`: camera/model lifecycle, confidence filtering, inference.
- `src/movement/core.ts`: movement calculation, calibration, smoothing, tracking gate, repetition counting.
- `src/game/stateMachine.ts`: explicit permitted session transitions.
- `src/game/session.ts`: session data, time, demo input, trace, pause/background handling.
- `src/components/Setup.tsx`: camera setup and calibration.
- `src/components/CameraPanel.tsx`: actual video/skeleton preview and clearly separate demo controls.
- `src/components/Settings.tsx`: settings, actual session details, movement trace.
- `src/audio/sound.ts`: original synthesized ambience and collection/ending chimes.

## Privacy and accessibility

Camera frames are processed on-device, never uploaded or saved. Settings and, only when enabled, the last ten summaries are stored in this browser. No accounts, tracking analytics, or clinical data server are used. Clear local data from settings. Camera streams stop on camera-off, returning home, or component cleanup. No raw video enters the saved summary.

Keyboard input, a pointer/touch slider, large controls, visible focus rings, modal focus management, reduced-motion preferences, persistent sound controls, and text instructions support accessible play. WebGL is required and a readable fallback is shown when unavailable.

## Verification and limitations

`npm test` verifies projected angles, aspect correction, landmark confidence, small-range mapping, smoothing, stable calibration, complete-cycle counting, jitter rejection, tracking-loss invalidation, stable recovery, and allowed state transitions. The demo journey is manually checked in the browser, including practice, collection, rest/resume, completion, and real summary data. Desktop and phone layouts are inspected.

This is a functional prototype, not a clinically validated device. It does not detect pain, fatigue, muscle activation, movement quality, recovery, or treatment outcomes. Choose rehabilitation exercises and comfortable limits with the treating professional. The camera calculation has not been validated against a clinical instrument. Real-camera accuracy and compatibility require testing with the intended users, supported devices, camera positions, and supervision. No end-to-end live human camera calibration was performed in the automated build environment.

## Asset licenses

All application illustrations, 3D geometry, animations, and synthesized sound are original. MediaPipe Tasks Vision and the Google pose-landmark model are provided under Apache 2.0; see `public/mediapipe/NOTICE.txt`. Three.js is MIT licensed; React and Lucide retain their respective licenses in installed packages. Fonts: DM Sans and Nunito, SIL Open Font License (loaded optionally from Google Fonts).

## Camera calibration fix and reference comparison

Compared with https://github.com/elfridatimms/final-thesis-demo (`src/main.js`): that browser demo uses MediaPipe **Holistic**, full pose complexity (`modelComplexity: 1`), detection/tracking confidence 0.3, visibility 0.35, a 1280×720 camera request, smoothing, and a continuously visible camera canvas. Luma keeps the originally requested **Pose Landmarker** API and aspect-corrected elbow calculation, and now uses the full pose model, 0.3 model confidence gates and 0.35 landmark visibility/presence gates, GPU/CPU fallback, and a 1280×720 ideal camera request. The selected arm never switches silently or mixes calibration endpoints from different arms. The reference was inspected rather than copied; its Git remote was not substituted for the Luma source remote.

Regression tests exercise the actual calibration UI with explicitly synthetic tracking frames: valid low endpoint, tracking loss, stable high-endpoint recovery, stale data, arm switching, configured-range continuation, and explicit demo exit. These are automated fixtures, not recordings or a claim of live-camera validation.
