# Luma & the Firefly Forest

A child-friendly, camera-controlled forest with five playable game tabs, original procedural Three.js art, animated movement lessons, and a complete welcome → animation → one practice movement → play → rest → finish flow.

## Run

Requires Node.js 22.12+ (tested on Node 26).

```sh
npm install
npm run dev
```

Open the printed localhost URL. To verify and build:

```sh
npm test
npm run build
```

Serve `dist/` with a static HTTPS host. Camera permission requires HTTPS or localhost. MediaPipe models and WASM are bundled locally under `public/`; camera frames never leave the device. Google Fonts is optional and falls back to system fonts.

## Five little games

| Tab | Movement input | Visual response |
| --- | --- | --- |
| Sleepy Flowers | Comfortably open and softly close one hand | A sculpted flower opens and returns to a bud; complete cycles fill a flower patch |
| Firefly Trail | Raise and return a hand, facing the camera | Luma follows the hand and collects lights; an illustrated glass jar fills with actual collections |
| Dragon Flight | Seated elbow bending and returning, viewed approximately side-on | Flappy-style scrolling columns with glowing gaps; real gap crossings earn stars and obstacle touches give gentle feedback |
| Butterfly Breeze | Gently tilt a supported hand up and return | A lavender butterfly flutters between two nectar flowers using hand bend relative to the forearm |
| Pirate Ship | Turn a bent forearm left and right around the elbow, facing the camera | An animated helm follows the forearm, the ship rocks and its flag flutters; islands reward real arrivals |

The tabs have visible selected states and support arrow keys, Home, and End. Switching games during active play pauses first and asks before finishing that adventure. Each exercise keeps an independent movement range. Session summaries record the actual game and input mode.

Every game has a large, silent animated demonstration before camera permission, an in-game guide, and **Show me how** / **?** controls to replay the lesson. Instructions use concrete actions such as “Open your hand.” or “Turn your arm left.” The 5.5-second full movement demonstration disappears before the live attempt. No observations are captured or counted during the demonstration. Returning from a hidden tab restarts the example. The child then copies one complete movement, earns one sticker, and enters the game automatically. There are no separate “comfy spots”, endpoint-saving screens, or voice instructions. During the attempt the live camera and game character respond to fresh input. Target progress appears only once an observed range is available. This is game task progress, not a clinical movement-quality score. MediaPipe counts, traces, and technical information stay inside grown-up details. Text stays English.

## Play

- **Let’s play with Luma** opens the demonstration and camera setup. Camera permission is requested only after the animation and **Let’s play!**.
- **Try without a camera** / **Play with buttons instead** uses ↑ / ↓ (← / → for Pirate Ship) or a touch/pointer slider. Demo controls are explicitly labeled and never counted as camera-measured rehabilitation performance.
- A live MediaPipe scan shows the actual mirrored video, current landmarks, on-device inference time and a recent movement trace. One ordinary practice movement learns a personal session range without separately saving positions. Grown-up settings also allow a configured range.
- Escape, pause, or **Take a break** opens the resting screen. Returning from another browser tab requires resuming; the tracking gate reacquires before counting.
- Grown-up settings control the exercise, comfortable range, demonstration cycle target, speed, smoothing, sound, reduced motion, and optional browser-local summaries. The default eight cycles is a demo setting, not a treatment recommendation.
- **Grown-up camera help** can copy a status report with runtime state and errors. It contains no images, video, coordinates, movement angles, or trace. Nothing is uploaded automatically.

## A short personal start for every camera adventure

The camera route is Watch → copy one movement → play. Hand games display a 21-point hand overlay; arm games display the actual visible body connections. The scan trace uses timestamped camera observations and leaves gaps for missing data. The sweeping line is a visual guide, not a claim about scan progress.

The practice range uses the fifth-smallest and fifth-largest observations, requires at least 20 distinct valid samples, and needs at least five observations spanning 220 ms near each endpoint. A full low → high → low cycle with dwell completes the attempt. Actual timestamped observations from the attempt are replayed through the same counter as the supported range grows. The provisional range keeps expanding until the return, avoiding early tiny-range calibration. A long initial rest does not bias the range, and isolated spikes cannot define it. Tracking loss interrupts pending movement. The profile trims at most 8% from observed endpoints and fits bounded filtering from raw signal variation. MediaPipe remains pretrained: this is personalized game input, not model retraining, biometric identification or a clinical assessment.

The profile is applied to filtering and game input mapping. It remains in memory only and is excluded from stored preferences. Camera restart and a new adventure request a fresh attempt. Grown-up help can explicitly start with current settings while tracking is valid. After one successful movement the adventure starts automatically; no separate confirmation is required.

## Tracking and movement calculation

Firefly Trail and Sleepy Flowers use **MediaPipe Hand Landmarker** directly, with detection, presence and tracking confidence 0.3 and up to two candidate hands. Firefly no longer needs shoulders or a whole-body pose. The playing hand follows spatial continuity instead of a brittle handedness label; label flicker and changing result order cannot swap hands. Missing observations clear the current signal and require reacquisition.

Dragon Flight, Butterfly Breeze and Pirate Ship use the **actual MediaPipe Holistic engine and local assets from [final-thesis-demo](https://github.com/elfridatimms/final-thesis-demo)**, commit `8c8f448`, with its `modelComplexity: 1`, `smoothLandmarks: true`, and 0.3 detection/tracking thresholds. The reference's 0.1 visibility margin picks a reliable arm; the arm is then locked for the attempt. Current hand and arm geometry come from the same Holistic observation. Nothing loads from a third-party CDN during play. Holistic runs in a fresh same-origin iframe for each attempt, keeping its legacy Emscripten globals separate from Tasks Vision. Frames are copied into a canvas owned by that iframe; passing a parent-window video directly would fail Holistic’s element checks. Failed or cancelled startup removes the frame, and normal stop waits for in-flight inference before disposing it. This prevents the reproducible `Module.arguments` abort when switching from an arm game to a hand game. Rendering and asynchronous inference have separate loops; inference targets up to 20 Hz subject to device speed. Frames older than 450 ms are invalid. The attached video is released on stop/unmount/error.

- **Firefly height:** `1 - handWrist.y` in the camera picture, 0–1. Shoulders are unnecessary. The range from one practice movement maps to full flight height.
- **Elbow:** aspect-corrected interior shoulder–elbow–wrist angle; 180° is straight. This follows the reference repository's 2D geometry.
- **Hand opening:** mean distance from the wrist to four fingertips divided by wrist-to-middle-knuckle distance; the thumb is not required.
- **Butterfly bend:** signed angle between elbow→wrist and wrist→middle-knuckle, with aspect correction. Raising or rotating the whole forearm no longer masquerades as wrist bending. This is still a projected 2D game input, not a validated anatomical joint measurement. Side view and a visible elbow are required.
- **Pirate steering:** aspect-corrected elbow→wrist direction relative to upright in the mirrored preview. The elbow anchors a forearm turn; fingers need not spread or tilt. This is not a claim to measure axial elbow rotation.

Configured endpoints map to the whole usable game range and values are clamped. Moving farther than configured provides no additional reward. Exercise selection and physical limits for rehabilitation should be agreed with the treating professional; the application does not prescribe progression.

## Filtering and game response

The reference repository uses a 0.15 frame-based EMA. Luma combines Holistic's landmark smoothing with a median of three samples and a time-aware EMA for **every** attempt and play frame, including before personalization. Default time constants are 0.1 s for direct hand input and 0.12 s for angles; deadbands are 0.003 picture height, 0.012 opening units, or 0.3°. Personal profiles fit bounded variations. Invalid input and stale gaps reset the filter immediately. Independent game smoothing defaults to 0.12 s and the dragon follows it promptly, avoiding stacked slow responses.

Fireflies scroll with active play time rather than the back-and-forth repetition-progress value. Dragon gates move only during active play, score once on actual geometric crossing, and never award a gate after an obstacle touch. Butterfly visits alternate between two flowers with actual arrival/dwell. The ship's large helm tracks current input; sails, flag, waves, collection sparks, wings and score updates animate the scene. Pausing or losing tracking stops course progression. Reduced-motion preferences keep the essential movement while suppressing decorative motion. The 3D scene uses demand rendering with a 30 Hz animation budget and a 1.25 pixel-ratio cap; camera previews also draw at most 30 Hz, leaving more rendering capacity for tracking.

## Calibration, counting, and rest

Quick practice requires distinct, fresh, supported observations at both ends of the observed range. Minimum endpoint differences are input-resolution constraints: 0.2 opening units, 0.08 picture-height units, or 5° projected angle. Legacy endpoint-calibration math remains covered by unit tests but is not part of the child-facing camera route.

A repetition is **low → high → low** with 220 ms dwell, separate 18% / 82% thresholds, and 28% / 72% release hysteresis. Starting high, partial movement, jitter, user pause, and unreliable tracking do not complete cycles. Tracking loss immediately invalidates a pending cycle; reacquisition requires 650 ms of stable valid frames. The dragon remains calm, the world stops progressing, and input never silently changes to demo.

Collections are based on actual proximity in the game. Missing a target carries no health penalty or time pressure. Results contain actual completed cycles, active play time, collections, mode, exercise, and a valid-data movement trace. They contain no fabricated clinical scores or recovery percentages.

## Verification and limitations

`npm test` covers projected movement math and aspect correction, calibration, cycle dwell/hysteresis, tracking-loss handling, camera/model lifecycle, the correct hand versus pose model, normalized opening, thumb independence, the median/EMA filter, jitter suppression, real step response, stale-gap resets, frame-rate response, independent game ranges, tab keyboard navigation, and the selected animation/instructions for all five games.

Development-only `tests/runtime-check.html` runs the actual bundled pose model. `tests/runtime-hook-check.html` runs the real camera hook and quick practice with a clearly labeled canvas video stream from official MediaPipe test images. These development pages and test images are not included in the production static build. The real hand model distinguished the open and folded-finger fixtures and the translated-hand fixture exercises Firefly height; the real Holistic engine tracks arm and wrist geometry from the pose fixture. This is not a live-child-camera validation.

This is a functional prototype, not a clinically validated medical device. It does not detect pain, fatigue, muscle activation, movement quality, recovery, or clinical outcomes. Camera compatibility and the intended users/camera positions require live supervised testing. Synchronous CPU inference can still briefly block slower devices; moving inference to a worker remains a performance improvement.

## Organization

- `src/game/Forest.tsx`, `Dragon.tsx`, `MagicFlower.tsx`, `GameWorldObjects.tsx`: the forest and game-specific 3D visuals.
- `src/components/GameTabs.tsx`, `MovementGuide.tsx`, `GripGuide.tsx`, `TiltGuide.tsx`, `MovementLesson.tsx`: navigation and original animated instructions.
- `src/movement/useTracking.ts`, `core.ts`, `exercises.ts`, `filter.ts`, `calibration.ts`: camera/model lifecycle, input math, filtering, calibration, and counting.
- `src/game/stateMachine.ts`, `session.ts`: explicit transitions, active time, progression, input, and actual summary data.
- `src/components/Setup.tsx`, `CameraPanel.tsx`, `Settings.tsx`, `CameraDiagnostics.tsx`: setup, preview, adult controls, and diagnostics.
- `src/audio/sound.ts`: original synthesized ambience and musical feedback.

## Privacy and licenses

Only minimal settings and optionally the last ten summaries are stored in this browser; grown-up settings can clear them. Raw camera video is never stored or uploaded. Visible focus, modal focus management, large controls, reduced background motion, persistent sound controls, text cues, and a full camera-free mode support accessible play without claims of clinical suitability for a particular condition.

All application illustrations, 3D geometry, animation and synthesized audio are original. MediaPipe models/WASM and official test assets are Apache 2.0; see `public/mediapipe/NOTICE.txt` and `LICENSE.txt`. Three.js, React, and Lucide retain their package licenses. Optional DM Sans and Nunito fonts are SIL Open Font License.
