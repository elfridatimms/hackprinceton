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
    camera: "Sit facing the camera.",
    help: "Keep both shoulders and your hand in the picture.",
    tip: "A little lift is enough.",
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
    camera: "Point your fingers sideways.",
    help: "Rest your arm. Keep your wrist and knuckles in the picture.",
    tip: "A tiny tilt is enough.",
    goal: "Let’s help a butterfly!",
  },
  ship: {
    low: "Tilt your hand left.",
    high: "Tilt your hand right.",
    camera: "Show your palm to the camera.",
    help: "Point your fingers up. Keep your hand in the picture.",
    tip: "Only tilt as far as feels comfy.",
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
