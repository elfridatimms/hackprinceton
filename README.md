# Luma & the Firefly Forest

A child-friendly, camera-controlled forest with four playable game tabs, original procedural Three.js art, animated movement lessons, and a complete welcome → animation → one practice movement → play → rest → finish flow.

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

## Four little games

| Tab | Movement input | Visual response |
| --- | --- | --- |
| Sleepy Flowers | Comfortably open and softly close one hand | Closing gathers seeds in the magic flower; opening wide sows them across the meadow, where new flowers sprout and then open and close with the hand. Bees arrive as the meadow grows |
| Dragon Flight | Seated elbow bending and returning, viewed approximately side-on | Flappy-style scrolling columns. The dragon is drawn at exactly the size the rules use, so it visibly fits the gaps it passes and visibly touches the columns it hits |
| Butterfly Breeze | Bend the hand at the wrist away from straight, arm resting or raised | A butterfly flutters between two nectar flowers; the bend is measured against the forearm line |
| Pirate Ship | Turn a bent forearm left and right around the elbow, facing the camera | Treasures float toward the ship, alternating left and right; steer under the light beam so they bump the hull. The lagoon, islands and a dolphin flow past |

Firefly Trail was retired from the game list. Its movement math remains in `src/movement` for now.

The tabs have visible selected states and support arrow keys, Home, and End. Switching games during active play pauses first and asks before finishing that adventure. Each exercise keeps an independent movement range. Session summaries record the actual game and input mode.

Every game has a large, silent animated demonstration before camera permission, an in-game guide, and **Show me how** / **?** controls to replay the lesson. Instructions use concrete actions such as “Open your hand.” or “Turn your arm left.” The 5.5-second full movement demonstration disappears before the live attempt. No observations are captured or counted during the demonstration. Returning from a hidden tab restarts the example. The child then copies one complete movement, earns one sticker, and enters the game automatically. There are no separate “comfy spots”, endpoint-saving screens, or voice instructions. During the attempt the live camera and game character respond to fresh input. Target progress appears only once an observed range is available. This is game task progress, not a clinical movement-quality score. MediaPipe counts, traces, and technical information stay inside grown-up details. Text stays English.

## Play

- The big **Play** button opens the demonstration and camera setup. Camera permission is requested automatically as soon as the animation ends, with no extra button.
- **Play without a camera** / **Play with buttons instead** uses ↑ / ↓ (← / → for Pirate Ship) or a touch/pointer slider. Demo controls are explicitly labeled and never counted as camera-measured rehabilitation performance.
- A live MediaPipe scan shows the actual mirrored video, current landmarks, on-device inference time and a recent movement trace. One ordinary practice movement learns a personal session range without separately saving positions. Grown-up settings also allow a configured range.
- Escape, pause, or **Take a break** opens the resting screen. Returning from another browser tab requires resuming; the tracking gate reacquires before counting.
- Grown-up settings control the exercise, comfortable range, demonstration cycle target, speed, smoothing, sound, reduced motion, and optional browser-local summaries. The default eight cycles is a demo setting, not a treatment recommendation.
- **Grown-up camera help** can copy a status report with runtime state and errors. It contains no images, video, coordinates, movement angles, or trace. Nothing is uploaded automatically.

## A short personal start for every camera adventure

The camera route is Watch → copy one movement → play. Hand games display a 21-point hand overlay; arm games display the actual visible body connections. The scan trace uses timestamped camera observations and leaves gaps for missing data. The sweeping line is a visual guide, not a claim about scan progress.

The practice range uses the fifth-smallest and fifth-largest observations, requires at least 20 distinct valid samples, and needs at least five observations spanning 220 ms near each endpoint. A full low → high → low cycle with dwell completes the attempt. Actual timestamped observations from the attempt are replayed through the same counter as the supported range grows. The provisional range keeps expanding until the return, avoiding early tiny-range calibration. A long initial rest does not bias the range, and isolated spikes cannot define it. Tracking loss interrupts pending movement. Firefly retains the stable endpoint observations already seen during setup across brief gaps, so a down → up → back attempt can still fit its range. Each endpoint hold needs five consecutive good observations over 220 ms; gaps themselves never count. The profile preserves the actual continuous-cycle count, which may be zero, and the setup shows arm readiness rather than a repetition sticker. Play starts with its own fresh counter. The profile trims at most 8% from observed endpoints and fits bounded filtering from raw signal variation. MediaPipe remains pretrained: this is personalized game input, not model retraining, biometric identification or a clinical assessment.

The profile is applied to filtering and game input mapping. It remains in memory only and is excluded from stored preferences. Camera restart and a new adventure request a fresh attempt. Grown-up help can explicitly start with current settings while tracking is valid. After one successful movement the adventure starts automatically; no separate confirmation is required.

## Home exercise plans and progress for therapists

**Plan & progress** (header) lets a parent or therapist pick an example home plan; each has two games and a daily number of repetitions, adjustable per game:

| Plan | Games |
| --- | --- |
| Wrist injury | Butterfly Breeze (wrist bend) + Sleepy Flowers (grip) |
| Hand & fingers | Sleepy Flowers + Butterfly Breeze |
| Elbow stiffness | Dragon Flight + Pirate Ship |
| Forearm / after a cast | Pirate Ship + Butterfly Breeze |

The start screen then shows today's plan with reps done so far, selects the next unfinished game, and after each game offers **Next in today's plan**. While a plan is active, every session is saved in this browser as numbers only: date, game, mode, reps, active time and a robust movement range (5th–95th percentile of the camera-measured value, so single spikes cannot define it). No video, images or landmarks are stored.

The **progress report** shows, for the last 14 days: days fully done, days with practice, the current streak and active time; a day-by-day consistency strip (icon + label, not colour alone); and per game a range-of-motion line over camera sessions (largest wrist bend, hand-opening span, elbow bend arc or forearm turn arc) with the change since the first session, hover details and a table view. Button play counts toward daily goals but never toward movement range. It can be printed or saved as PDF, or downloaded as CSV. **Load 2 example weeks** adds clearly labelled example data for demonstrations. Plans are examples to be agreed with the child's therapist; the report is a home-practice record, not a clinical assessment.

## Tracking and movement calculation

Sleepy Flowers uses **MediaPipe Hand Landmarker** directly, with detection, presence and tracking confidence 0.3 and up to two candidate hands. The playing hand follows spatial continuity instead of a brittle handedness label; label flicker and changing result order cannot swap hands. Missing observations clear the current signal and require reacquisition.

Firefly Trail, Dragon Flight, Butterfly Breeze and Pirate Ship use the **actual MediaPipe Holistic engine and local assets from [final-thesis-demo](https://github.com/elfridatimms/final-thesis-demo)**, commit `8c8f448`, with its `modelComplexity: 1`, `smoothLandmarks: true`, and 0.3 detection/tracking thresholds. The reference's 0.1 visibility margin picks a reliable arm; the arm is then locked for the attempt. Current hand and arm geometry come from the same Holistic observation. Nothing loads from a third-party CDN during play. Holistic runs in a fresh same-origin iframe for each attempt, keeping its legacy Emscripten globals separate from Tasks Vision. Frames are copied into a canvas owned by that iframe; passing a parent-window video directly would fail Holistic’s element checks. Failed or cancelled startup removes the frame, and normal stop waits for in-flight inference before disposing it. This prevents the reproducible `Module.arguments` abort when switching from an arm game to a hand game. Rendering and asynchronous inference have separate loops; inference targets up to 20 Hz subject to device speed. Frames older than 450 ms are invalid. The attached video is released on stop/unmount/error.

- **Firefly lift:** `(selectedElbow.y - selectedWrist.y) / projectedForearmLength`, in −1..1 with aspect correction. Only the explicitly selected elbow and wrist are required (visibility ≥0.55); the opposite arm and both shoulders are absent from the calculation. The chosen side is never replaced when it leaves view. The first acquisition, a stale gap, and large landmark jumps require three consistent timestamped observations spanning ≥120 ms. A 0.025 input deadband and bounded smoothing suppress jitter. Losing the selected joint produces invalid input and freezes flight; reacquisition cannot teleport Luma.
- **Elbow:** aspect-corrected interior shoulder–elbow–wrist angle; 180° is straight. This follows the reference repository's 2D geometry.
- **Hand opening:** mean distance from the wrist to four fingertips divided by wrist-to-middle-knuckle distance; the thumb is not required.
- **Butterfly bend:** angle between the forearm line (elbow→wrist) and the hand line (wrist→centre of the four finger knuckles), with aspect correction. 0° is "level": the hand continues the forearm. The game uses how far the hand bends away from level (0–90°), so the forearm may rest sideways on a table or point up in the air. Raising, lowering or rotating the whole arm does not change it. The hand must be seen from its side (little finger toward the camera, thumb away); a hand pointing straight at the camera is rejected. The camera overlay draws the level line, the current bend arc and a ghost hand at the next target. This is a projected 2D game input, not a validated anatomical joint measurement.
- **Pirate steering:** aspect-corrected elbow→wrist direction relative to upright in the mirrored preview. The elbow anchors a forearm turn; fingers need not spread or tilt. This is not a claim to measure axial elbow rotation.

Configured endpoints map to the whole usable game range and values are clamped. Moving farther than configured provides no additional reward. Exercise selection and physical limits for rehabilitation should be agreed with the treating professional; the application does not prescribe progression.

## Filtering and game response

The reference repository uses a 0.15 frame-based EMA. Luma combines Holistic's landmark smoothing with a median of three samples and a time-aware EMA for **every** attempt and play frame, including before personalization. Default time constants are 0.1 s for direct hand input and 0.12 s for angles; deadbands are 0.003 picture height, 0.012 opening units, or 0.3°. Personal profiles fit bounded variations. Invalid input and stale gaps reset the filter immediately. Independent game smoothing defaults to 0.12 s and the dragon follows it promptly, avoiding stacked slow responses.

Dragon gates move only during active play, score once on actual geometric crossing, and never award a gate after an obstacle touch. Drawing and rules share one geometry (`src/game/flightCourse.ts`): the dragon is drawn at `FLIGHT_SCALE` with its lantern tucked in, its body spans ±0.78 around its centre, columns have a ±1.5 gap, so the dragon's centre must stay within ±0.72 of the gap centre; a touch counts while a column is within column radius plus wing reach. Butterfly visits alternate between two flowers with actual arrival/dwell. Pirate treasures (`src/game/treasureCourse.ts`) drift from far away to the ship and are caught only if the hull (±1.05) is under them on arrival; missed ones float past with no penalty, and sides alternate so both turns are needed. The helm sits in the corner and tracks current input; sails, flag, captain, waves, islands, a dolphin and seagulls animate the scene. Pausing or losing tracking stops course progression. Reduced-motion preferences keep the essential movement while suppressing decorative motion. The 3D scene uses demand rendering with a 30 Hz animation budget and a 1.25 pixel-ratio cap; camera previews also draw at most 30 Hz, leaving more rendering capacity for tracking.

### Landmark smoothing, fixed reference point, and the camera overlay

Before any value is computed, every pose and hand landmark passes through a **One Euro filter** (`LandmarkSmoother` in `src/movement/filter.ts`): strong smoothing while the child holds still, little lag during a real movement, time-aware across inference rates, and reset after stale gaps. The pivot joint of each game (elbow for Firefly, Butterfly and Pirate Ship; shoulder and elbow for Dragon) is held by an **`AnchorLock`**: wobbles within 1.8% of the picture keep one pinned reference point that drifts only slowly, and a sustained move longer than 180 ms re-pins it smoothly. Brief outliers never start a re-pin. Angles are therefore measured from a steady pivot. The existing median/EMA signal filter still runs afterwards.

The camera preview mirrors the picture in the canvas and eases landmarks every render frame, so 20 Hz inference never looks like stepping. It draws a glowing skeleton in each game's colour, a dashed ring on the pinned pivot (the fixed point to keep still), a fading trail of the moving hand, a dashed "ghost" forearm showing where the next target is (Firefly, Dragon, Pirate Ship), and a movement meter with the next target and a hold-progress ring. Everything turns green when the child is on target.

The games share small effects from `src/game/Effects.tsx`: hold rings that fill while the child stays on a target, guide dots toward the next target, trails, and sparkle bursts on every real success. Sleepy Flowers adds rising pollen, glowing petals and a little garden that grows one flower per completed cycle; Dragon Flight adds drifting clouds, gap glow when aligned, and stars that vanish when collected; Butterfly Breeze banks into its turns; Pirate Ship adds a wake, gold-coin bursts and seagulls. A short word of encouragement pops up after each success, with a streak count from three in a row.

## Calibration, counting, and rest

Quick practice requires distinct, fresh, supported observations at both ends of the observed range. Minimum endpoint differences are input-resolution constraints: 0.2 opening units, 0.18 forearm-lift units, or 5° projected angle. Legacy endpoint-calibration math remains covered by unit tests but is not part of the child-facing camera route.

A repetition is **low → high → low** with 220 ms dwell, separate 18% / 82% thresholds, and 28% / 72% release hysteresis. Starting high, partial movement, jitter, user pause, and unreliable tracking do not complete cycles. Tracking loss immediately invalidates a pending cycle; reacquisition requires 650 ms of stable valid frames. The dragon remains calm, the world stops progressing, and input never silently changes to demo.

Collections are based on actual proximity in the game. Missing a target carries no health penalty or time pressure. Results contain actual completed cycles, active play time, collections, mode, exercise, and a valid-data movement trace. They contain no fabricated clinical scores or recovery percentages.

## Verification and limitations

`npm test` covers projected movement math and aspect correction, calibration, cycle dwell/hysteresis, tracking-loss handling, camera/model lifecycle, the correct hand versus pose model, normalized opening, thumb independence, the median/EMA filter, jitter suppression, real step response, stale-gap resets, frame-rate response, independent game ranges, tab keyboard navigation, and the selected animation/instructions for all five games.

Development-only `tests/runtime-check.html` runs the actual bundled pose model. `tests/runtime-hook-check.html` runs the real camera hook and quick practice with a clearly labeled canvas video stream from official MediaPipe test images. These development pages and test images are not included in the production static build. The real hand model distinguished the open and folded-finger fixtures and the translated-body and opposite-arm-occlusion fixture verifies that Firefly does not depend on absolute image position or the other arm; the real Holistic engine tracks arm and wrist geometry from the pose fixture. This is not a live-child-camera validation.

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
