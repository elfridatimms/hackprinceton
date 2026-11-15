import { useRef } from "react";
import { clamp } from "../movement/core";
import type { Exercise } from "../movement/exercises";
import { MovementGuide } from "./MovementGuide";
import { Portrait } from "./Illustrations";

export function MovementResponse({
  exercise,
  position,
  watch = false,
}: {
  exercise: Exercise;
  position: number | null;
  watch?: boolean;
}) {
  const valid = position !== null && Number.isFinite(position);
  const lastPosition = useRef(0);
  if (valid) lastPosition.current = clamp(position);
  const p = lastPosition.current;
  const label = watch
    ? "An example of what your movement will do."
    : valid
      ? "The picture follows your current camera movement."
      : "Waiting for your hand. The picture is paused.";
  return (
    <div
      className={`movement-response response-${exercise} ${watch ? "response-watch" : ""} ${!valid && !watch ? "response-waiting" : ""}`}
      role="img"
      aria-label={label}
      data-position={valid ? p.toFixed(3) : "waiting"}
    >
      <svg
        viewBox={
          exercise === "grip"
            ? "35 20 150 165"
            : exercise === "ship"
              ? "0 0 220 190"
              : "30 10 160 180"
        }
        fill="none"
        aria-hidden="true"
      >
        {exercise === "grip" ? (
          <>
            <ellipse cx="110" cy="174" rx="56" ry="10" fill="#dce6ce" />
            <path
              d="M112 168q-6-25-3-54"
              stroke="#8caa77"
              strokeWidth="7"
              strokeLinecap="round"
            />
            <ellipse
              cx="94"
              cy="145"
              rx="20"
              ry="9"
              transform="rotate(25 94 145)"
              fill="#a6bd85"
            />
            <ellipse
              cx="129"
              cy="132"
              rx="18"
              ry="9"
              transform="rotate(-28 129 132)"
              fill="#a6bd85"
            />
            <g transform="translate(110 86)">
              <g
                className="response-petals"
                style={{ transform: `scale(${0.18 + p * 0.82})` }}
              >
                {Array.from({ length: 7 }, (_, i) => (
                  <ellipse
                    key={i}
                    cy="-29"
                    rx="17"
                    ry="29"
                    transform={`rotate(${(i * 360) / 7})`}
                    fill={i % 2 ? "#edb9a9" : "#f3cdb9"}
                  />
                ))}
              </g>
              <circle r="25" fill="#f2d187" />
              {p > 0.45 || watch ? (
                <>
                  <ellipse cx="-9" cy="0" rx="2.7" ry="4" fill="#8f8054" />
                  <ellipse cx="9" cy="0" rx="2.7" ry="4" fill="#8f8054" />
                </>
              ) : (
                <path
                  d="M-14 2q5 5 10 0m9 0q5 5 10 0"
                  stroke="#998357"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              )}
              <path
                d="M-6 11q6 6 12 0"
                stroke="#b59b5f"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <ellipse cx="-16" cy="9" rx="4" ry="2" fill="#e6b57b" />
              <ellipse cx="16" cy="9" rx="4" ry="2" fill="#e6b57b" />
            </g>
          </>
        ) : exercise === "ship" ? (
          <>
            <path
              d="M8 149q20-9 40 0t40 0 40 0 40 0 44 0v30H8z"
              fill="#bad9d2"
            />
            <ellipse cx="23" cy="148" rx="20" ry="9" fill="#dfd2ac" />
            <ellipse cx="197" cy="148" rx="20" ry="9" fill="#dfd2ac" />
            <g
              className="response-boat"
              style={{ transform: `translateX(${(p - 0.5) * 124}px)` }}
            >
              <path d="M76 134h70l-13 23H90z" fill="#ba896b" />
              <path
                d="M107 133V63"
                stroke="#927b5e"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <path d="M112 70q27 15 29 52h-29z" fill="#fff0c9" />
              <path d="m105 63-23 5 23 10z" fill="#80aca1" />
              <circle cx="99" cy="144" r="3" fill="#f4d48c" />
              <circle cx="123" cy="144" r="3" fill="#f4d48c" />
            </g>
            <path
              d="M40 167q12-4 24 0m79 6q13-4 26 0"
              stroke="#eff2dd"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </>
        ) : exercise === "reach" ? (
          <>
            <path
              d="M45 170q22-23 28-3m77 3q18-27 25-4"
              stroke="#bed0a1"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <g
              className="response-light"
              style={{ transform: `translateY(${-p * 90}px)` }}
            >
              <ellipse
                cx="99"
                cy="138"
                rx="16"
                ry="8"
                transform="rotate(-24 99 138)"
                fill="#e5ddbd"
              />
              <ellipse
                cx="123"
                cy="138"
                rx="16"
                ry="8"
                transform="rotate(24 123 138)"
                fill="#e5ddbd"
              />
              <ellipse cx="111" cy="147" rx="12" ry="18" fill="#edcd78" />
              <circle cx="111" cy="147" r="25" fill="#f2d77b" opacity=".13" />
              <circle cx="109" cy="141" r="4" fill="#fff3b6" />
            </g>
          </>
        ) : exercise === "wrist" ? (
          <>
            <ellipse cx="112" cy="174" rx="49" ry="9" fill="#e0dce7" />
            <g
              className="response-butterfly"
              style={{ transform: `translateY(${-p * 72}px)` }}
            >
              <g transform="translate(110 122)">
                <ellipse
                  cx="-19"
                  cy="-5"
                  rx="20"
                  ry="28"
                  transform="rotate(-28 -19 -5)"
                  fill="#b8add3"
                />
                <ellipse
                  cx="19"
                  cy="-5"
                  rx="20"
                  ry="28"
                  transform="rotate(28 19 -5)"
                  fill="#b8add3"
                />
                <ellipse cx="-15" cy="23" rx="16" ry="17" fill="#d5bfdb" />
                <ellipse cx="15" cy="23" rx="16" ry="17" fill="#d5bfdb" />
                <path
                  d="M0-18v50m-2-49-6-11m10 11 6-11"
                  stroke="#93917a"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
                <circle cy="-17" r="6" fill="#9d997c" />
                <circle cx="-24" cy="-8" r="5" fill="#f5dfad" />
                <circle cx="24" cy="-8" r="5" fill="#f5dfad" />
              </g>
            </g>
          </>
        ) : (
          <>
            <ellipse cx="110" cy="173" rx="47" ry="9" fill="#dce5ce" />
            <g
              className="response-dragon"
              style={{ transform: `translateY(${-p * 72}px)` }}
            >
              <svg x="68" y="94" width="90" height="90" viewBox="0 0 80 80">
                <Portrait />
              </svg>
            </g>
          </>
        )}
        <path
          d="m29 35 2 6 6 2-6 2-2 6-2-6-6-2 6-2zM186 57l2 4 4 2-4 2-2 4-2-4-4-2 4-2z"
          fill="#d3bd79"
        />
      </svg>
    </div>
  );
}
export function PlayAlong({
  exercise,
  direction,
  position,
  watch = false,
}: {
  exercise: Exercise;
  direction: "loop" | "up" | "down" | "low" | "high";
  position: number | null;
  watch?: boolean;
}) {
  return (
    <div className="play-along">
      <div className="play-along-side copy-move">
        <span className="picture-label">
          {watch ? "Watch the hand" : "Copy this"}
        </span>
        <MovementGuide
          key={direction}
          exercise={exercise}
          direction={direction}
          handOnly
        />
      </div>
      <span className="picture-arrow" aria-hidden="true">
        ↝
      </span>
      <div className="play-along-side">
        <span className="picture-label">
          {watch
            ? "Make a little magic"
            : position === null
              ? "I’m waiting for you"
              : "You make it happen!"}
        </span>
        <MovementResponse
          exercise={exercise}
          position={position}
          watch={watch}
        />
      </div>
    </div>
  );
}
export function PracticeStickers({ count }: { count: number }) {
  return (
    <div
      className="practice-stickers"
      role="img"
      aria-label={`${Math.min(2, count)} of 2 movements completed`}
    >
      {[0, 1].map((i) => (
        <span key={i} className={count > i ? "sticker-done" : ""}>
          <svg viewBox="0 0 60 60" fill="none" aria-hidden="true">
            <path
              d="m30 5 8 16 18 3-13 13 3 18-16-9-16 9 3-18L4 24l18-3z"
              fill={count > i ? "#eac675" : "#eeeedc"}
              stroke={count > i ? "#d7b366" : "#d7dfc5"}
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {count > i && (
              <path
                d="M21 29q3 3 5 0m8 0q3 3 5 0m-15 8q6 5 12 0"
                stroke="#9e8755"
                strokeWidth="2"
                strokeLinecap="round"
              />
            )}
          </svg>
        </span>
      ))}
    </div>
  );
}
