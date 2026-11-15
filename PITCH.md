# Rehabbit · hackathon pitch

**One line:** *Rehabbit turns a child's boring home physio exercises into camera games, and turns every game into a progress report the therapist can actually use.*

Total time: about 3 minutes + questions. Two people: **Speaker** (story, numbers) and **Driver** (laptop, never talks while the demo runs).

---

## 0:00 – 0:30 · The problem (Speaker)

> "When a child hurts a wrist or an elbow, the real recovery happens at home: the same small movement, every day, for weeks. Kids find it boring, so they skip it. And the therapist sees the child once a week and has to ask, *'Did you do your exercises?'*. Nobody really knows."

- Two gaps: **motivation** for the child, **visibility** for the therapist.
- If you quote adherence numbers, use a real source and show it on the slide. *[add source]*

## 0:30 – 2:15 · Live demo (Driver drives, Speaker narrates)

1. **Plan (15 s).** *Plan & progress* → **Wrist injury** → Start plan.
   > "The therapist picks a plan. A wrist injury gets two games: wrist bend and grip, eight reps a day."
2. **Child's view (10 s).** Back on the start screen: one big **Play** button and *Today's plan*.
   > "The child only sees one button and today's two games."
3. **Butterfly Breeze (40 s).** Press Play → the short movement demo → the camera starts by itself.
   - Point at the overlay: *"The dashed line is 'straight'. The arc is how far the wrist bends. The ghost hand shows the next target."*
   - Bend the wrist a few times; the butterfly visits the flowers, words like "Yay!" pop up.
   > "Everything runs in the browser. The video never leaves the laptop."
4. **Sleepy Flowers (30 s).** *Next in today's plan* → close the hand to gather seeds, open it to sow them; the meadow grows.
   > "Same tracker, different joint. The flowers open and close with the hand."
5. **Therapist report (40 s).** *Plan & progress*. Have **Load 2 example weeks** done beforehand (it is labelled *Includes example data*; say so).
   > "Here is what the therapist gets: which days the child actually practised, the streak, and the range of motion over time: this wrist went from about 24° to 40° of bend. One click to PDF or CSV."

## 2:15 – 2:45 · How it works (Speaker)

- **MediaPipe** (Hand Landmarker + Holistic) runs **on the device**, models bundled locally.
- **Steady tracking:** One Euro filtering of every landmark, plus a pinned *fixed point* at the elbow/wrist, so a trembling child does not shake the game.
- **Honest numbers:** the range of motion is the 5th–95th percentile of camera-measured angles, so single glitches cannot inflate progress. Button play counts toward daily goals, never toward range.
- **Personal:** each game learns the child's own comfortable range from one copied movement.
- **Private:** only dates, reps, time and range numbers are stored, in the browser.

## 2:45 – 3:00 · Close (Speaker)

> "Kids get a game they want to play. Therapists get the numbers they never had. Rehabbit: physio games that hop along with you."

What's next (only if asked or if time allows): therapist sends the plan as a link/QR, compensation detection (e.g. lifting the shoulder instead of bending the elbow), more joints.

---

## Questions judges will likely ask

| Question | Answer |
| --- | --- |
| Is this a medical device? | No. It is a home-practice tool and record. Plans are examples to agree with the therapist; the angles are projected 2D camera estimates, not clinical measurements. |
| How accurate is the angle? | It is a 2D projection from one camera; it is consistent enough to show a trend for the same child, same setup. We filter spikes and use percentiles. Not validated clinically yet. |
| What about privacy? | Video is processed in the browser and never stored or uploaded. Only numbers are saved locally; the parent decides whether to export them. |
| What if the camera can't see the arm? | The game pauses and waits, the edges of the camera view glow and say "bring your hand back to the middle". |
| Why games? | The movement is the controller: you cannot win without doing the exercise, and every repetition is counted only on a real full movement with a short hold. |
| What did you build this weekend? | Four games, the filtering and fixed-point tracking, the camera overlay, plans and the therapist report. |

---

## Demo-day checklist

**The night before (good light, plain background):**
- [ ] Grown-up settings → **Recorded demo videos** → record a 15 s clip for each game. Do the movement slowly, full range, 4–5 times.
- [ ] Download each clip and put it in `public/demo/` as `grip.webm`, `elbow.webm`, `wrist.webm`, `ship.webm`, then rebuild. Then the clips survive a browser reset.
- [ ] Choose the **Wrist injury** plan and **Load 2 example weeks**.
- [ ] Rehearse the 3 minutes twice with a timer.

**At the table:**
- [ ] Laptop on power, brightness up, sound on (chimes help), browser zoom 100 %.
- [ ] Use Chrome. Allow the camera once before judges arrive.
- [ ] Sit sideways-on for Butterfly, little finger toward the camera; face the camera for Pirate Ship.
- [ ] **Plan B:** if light or the camera fails, Grown-up settings → Recorded demo videos → turn on *Play games from recorded videos*. A banner says it is a recording: say it out loud, it is still the real tracker.
- [ ] **Plan C:** *Play without a camera* (arrow keys / slider).

**Do not claim:** clinical accuracy, recovery outcomes, or numbers you cannot source.
