# Luma & the Firefly Forest

A child-friendly, camera-controlled forest with five playable game tabs, original procedural Three.js art, animated movement lessons, and a complete welcome → setup → calibration → practice → play → rest → finish flow.

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
| Dragon Flight | Seated elbow bending and returning, viewed approximately side-on | Luma flies through golden cloud hoops along the forest journey |
| Butterfly Breeze | Gently tilt a supported hand up and return | A lavender butterfly lifts and flutters with the hand's projected direction |
| Pirate Ship | Gently lean an upright palm left and right | A toy ship sails between two islands, collecting lights only after real arrival and a short dwell |

The tabs have visible selected states and support arrow keys, Home, and End. Switching games during active play pauses first and asks before finishing that adventure. Each exercise keeps an independent movement range. Session summaries record the actual game and input mode.

Every game has a large animated demonstration before camera permission, a pose illustration beside calibration, an in-game guide, and **Show me how** / **?** controls to replay the lesson. Lessons pause active play; **My turn!** resumes it. Instructions use one concrete action at a time (for example, “Open your hand.” or “Tilt your hand left.”), followed by “Hold still.” for automatic saving. Directional demonstrations show the requested action and hold its target pose; the full lesson still loops both directions. Instructions are silent and visual: a large isolated movement example sits beside an illustrated game response. During camera setup and practice, that response follows the actual current signal and pauses when tracking is lost; the Watch lesson is explicitly labeled as a demonstration. Two practice stickers are earned only by completed movements. The live camera remains visible, with MediaPipe counts and traces inside grown-up details. Text stays English. Technical information is kept in grown-up controls.

## Play

- **Let’s play with Luma** opens the demonstration and camera setup. Camera permission is requested only after **Let’s try it together**.
- **Try without a camera** / **Play with buttons instead** uses ↑ / ↓ (← / → for Pirate Ship) or a touch/pointer slider. Demo controls are explicitly labeled and never counted as camera-measured rehabilitation performance.
- A live MediaPipe scan shows the actual mirrored video, current landmarks, on-device inference time and a recent movement trace. Hold two comfortable positions to save them automatically, then follow two complete guided movements to fit a personal session profile. A configured range can also be entered in grown-up help while current tracking is valid.
- Escape, pause, or **Take a break** opens the resting screen. Returning from another browser tab requires resuming; the tracking gate reacquires before counting.
- Grown-up settings control the exercise, comfortable range, demonstration cycle target, speed, smoothing, sound, reduced motion, and optional browser-local summaries. The default eight cycles is a demo setting, not a treatment recommendation.
- **Grown-up camera help** can copy a status report with runtime state and errors. It contains no images, video, coordinates, movement angles, or trace. Nothing is uploaded automatically.

## Fresh personal scan for every camera adventure

The camera route is Watch → Scan → Comfy spots → Your magic. Hand games display a 21-point hand overlay; arm games display the actual visible body connections. The scan trace uses timestamped camera observations and leaves gaps for missing data. The sweeping line is a visual guide, not a claim about detection or scan progress.

Endpoint holds save automatically after 1.8 seconds of fresh, steady observations, with a short preparation interval and a visible countdown. No capture button is required. The second endpoint only starts counting down after a distinct valid movement; tracking loss resets the hold. Two stable endpoint holds provide raw stationary signal variation. Two complete low → high → low movements, with distinct fresh observations and dwell, validate the comfortable range. The session profile uses robust percentiles to trim at most 8% from either endpoint (never expand the captured range), MAD-based resting variation to fit a bounded filter deadband and time constant, and a matching response smoothing value. MediaPipe remains pretrained: this is personalized input calibration, not model retraining, biometric identification or a clinical assessment.

The profile is applied to signal filtering and game input mapping. It remains in memory only and is excluded from stored preferences; camera start, restart and a new adventure request a fresh scan. Valid existing endpoints can be used explicitly through grown-up help without extra tuning. Camera loss, stale data, duplicates and gaps cannot complete a pending scan movement. Two completed scan movements satisfy the initial practice step.

## Tracking and movement calculation

Hand games use **MediaPipe Hand Landmarker** on CPU with one hand. Reach and elbow use **Pose Landmarker Full** on CPU with one person. Inference runs separately from rendering, up to 15 Hz, and stale frames older than 450 ms are invalid. The video element remains attached for reliable playback and is removed on stop/unmount/error. The first confidently classified playing hand is retained for a hand session; the tracker does not silently switch to the other hand.

- **Opening:** mean image-space distance from wrist (0) to fingertips (8, 12, 16, 20), divided by wrist-to-middle-knuckle distance (0 to 9). The thumb does not have to extend fully. X coordinates are corrected for video aspect ratio; required landmarks must be finite and in frame, and tiny/degenerate palms are rejected. Hand points are not assigned fabricated pose visibility scores.
- **Reach:** wrist height relative to the selected shoulder, divided by the image-space shoulder width. Both shoulders and the selected wrist must be visible. A front-facing camera is supported; a visible elbow is not required for this game.
- **Elbow:** the interior angle between shoulder→elbow and wrist→elbow vectors, with aspect-corrected image coordinates. 180° represents extension, and smaller angles represent more bending. The selected arm is fixed and all three points need visibility/presence of at least 0.35.
- **Hand tilt:** `atan2(wrist.y - middleKnuckle.y, abs(middleKnuckle.x - wrist.x) * aspect)`, in degrees. This is the hand's projected direction in the image, **not an isolated anatomical wrist joint angle**. A visible wrist and middle knuckle and a nondegenerate palm are required.

- **Ship steering:** signed wrist-to-middle-knuckle palm lean, corrected for aspect ratio and mirrored to match the camera preview. An upright palm maps to zero; left is negative, right is positive. Downturned, sideways, tiny and out-of-frame palms are rejected. The same 3-sample median, 0.12 s EMA and 0.4° deadband apply. Calibration is independent of all other games.

Configured endpoints map to the whole usable game range and values are clamped. Moving farther than configured provides no additional reward. Exercise selection and physical limits for rehabilitation should be agreed with the treating professional; the application does not prescribe progression.

## Reference-inspired hand filtering

The inspected reference is https://github.com/elfridatimms/final-thesis-demo, particularly `src/main.js` (`smoothValue`, `SMOOTHING_FACTOR = 0.15`, hand opening and projected wrist direction). Its browser application uses Holistic and a frame-based EMA. Luma retains Tasks Vision and adapts the smoothing to elapsed time:

1. A median of three valid samples removes isolated one-frame spikes.
2. An exponential low-pass filter uses `alpha = 1 - exp(-dt / tau)` instead of assuming a fixed frame rate.
3. A small deadband suppresses stationary jitter: 0.012 in opening/palm units, with a 0.16 s time constant; hand tilt uses 0.4° and 0.12 s.
4. Invalid input, a stale gap, a camera restart, or a game change resets the filter. No filtered last-good value is presented as live tracking after loss.

The existing time-aware game smoothing remains independently configurable. Filters are signal processing, not a judgment that movement is medically correct.

## Calibration, counting, and rest

Calibration requires at least five distinct valid samples spanning 650 ms within a recent 1.6 s window, with no gap over 450 ms. The central 80% spread must be stable (opening 0.16 ratio, reach 0.1 shoulder widths, elbow/tilt 6°). A median endpoint is used. Minimum endpoint differences are input-resolution constraints: 0.2 opening units, 0.12 reach units, or 5° projected angle.

A repetition is **low → high → low** with 220 ms dwell, separate 18% / 82% thresholds, and 28% / 72% release hysteresis. Starting high, partial movement, jitter, user pause, and unreliable tracking do not complete cycles. Tracking loss immediately invalidates a pending cycle; reacquisition requires 650 ms of stable valid frames. The dragon remains calm, the world stops progressing, and input never silently changes to demo.

Collections are based on actual proximity in the game. Missing a target carries no health penalty or time pressure. Results contain actual completed cycles, active play time, collections, mode, exercise, and a valid-data movement trace. They contain no fabricated clinical scores or recovery percentages.

## Verification and limitations

`npm test` covers projected movement math and aspect correction, calibration, cycle dwell/hysteresis, tracking-loss handling, camera/model lifecycle, the correct hand versus pose model, normalized opening, thumb independence, the median/EMA filter, jitter suppression, real step response, stale-gap resets, frame-rate response, independent game ranges, tab keyboard navigation, and the selected animation/instructions for all five games.

Development-only `tests/runtime-check.html` runs the actual bundled pose model. `tests/runtime-hook-check.html` runs the real camera hook and calibration with a clearly labeled canvas video stream from official MediaPipe test images. These development pages and test images are not included in the production static build. The real hand model distinguished the open and folded-finger fixtures and completed both calibration endpoints into practice. This is not a live-child-camera validation.

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
