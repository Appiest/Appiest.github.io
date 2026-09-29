import type { Icon } from "@phosphor-icons/react";
import { Eyeglasses, Metronome, VectorTwo } from "@phosphor-icons/react/ssr";

export type Project = {
  name: string;
  description: string;
  path: string;
  icon: Icon;
};

export const projects: Project[] = [
  {
    name: "Linear algebra, one idea a morning",
    description: "Short animated lessons and notes that walk through a full linear algebra course, one concept per day.",
    path: "/teach-linalg/",
    icon: VectorTwo,
  },
  {
    name: "Understudy",
    description: "Our Blue Ocean Strategy pitch for AI glasses that learn from a store’s best employee and coach new hires during real shifts.",
    path: "/understudy/",
    icon: Eyeglasses,
  },
  {
    name: "James’s practice planner",
    description: "A weekly music practice planner that syncs between James’s phone and laptop.",
    path: "/james/",
    icon: Metronome,
  },
];
