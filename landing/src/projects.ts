import type { Icon } from "@phosphor-icons/react";
import { Article, BaseballCap, Eyeglasses, Metronome, PawPrint, VectorTwo } from "@phosphor-icons/react/ssr";

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
    name: "AI research, one paper a morning",
    description: "Daily plain-English briefs on the papers that built modern AI, then the frontier.",
    path: "/papers/",
    icon: Article,
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
  {
    name: "Real or Scam? with Pawnzy",
    description: "A Duolingo-style lesson concept for a USC class, where Pawnzy the raccoon learns to spot scam texts in 10 questions.",
    path: "/duolingo-if/",
    icon: PawPrint,
  },
  {
    name: "Cloak",
    description: "Our pitch for a cap that stops cameras and microphones from recording the person wearing it.",
    path: "/cloak/",
    icon: BaseballCap,
  },
];
