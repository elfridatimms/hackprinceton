import type { Exercise } from "./exercises";
/** One physical action per instruction. Story goals stay secondary to the actual movement. */
export const childInstructions = {
  grip: {
    low: "Make a soft fist.",
    high: "Open your hand.",
    camera: "Show your palm to the camera.",
    help: "Keep your wrist and fingers in the picture.",
    tip: "No squeezing. Keep it soft.",
    goal: "Let’s wake a flower!",
  },
  reach: {
    low: "Put your hand down.",
    high: "Lift your hand a little.",
    camera: "Show your playing elbow and hand.",
    help: "Rest your elbow. Lift and lower the hand of the same arm. Your other arm can rest.",
    tip: "Keep your elbow in one place. A little lift is enough.",
    goal: "Let’s catch a firefly!",
  },
  elbow: {
    low: "Let your arm come down.",
    high: "Bend your elbow a little.",
    camera: "Turn a little sideways.",
    help: "Keep your shoulder, elbow and hand in the picture.",
    tip: "Stop where it feels comfy.",
    goal: "Let’s help Luma fly!",
  },
  wrist: {
    low: "Rest your hand.",
    high: "Tilt your hand up a little.",
    camera: "Rest your forearm. Point your fingers sideways.",
    help: "Show your elbow, wrist and knuckles from the side. Keep your forearm still.",
    tip: "A tiny tilt is enough.",
    goal: "Let’s help a butterfly!",
  },
  ship: {
    low: "Turn your arm left.",
    high: "Turn your arm right.",
    camera: "Bend your elbow. Hold your hand up.",
    help: "Keep your elbow in one place. Move your forearm left and right like a steering wheel.",
    tip: "Little turns can steer the ship.",
    goal: "Let’s sail a pirate ship!",
  },
} satisfies Record<
  Exercise,
  {
    low: string;
    high: string;
    camera: string;
    help: string;
    tip: string;
    goal: string;
  }
>;
