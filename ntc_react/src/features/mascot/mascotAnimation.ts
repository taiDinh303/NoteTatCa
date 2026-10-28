import {
  createContext,
  type Dispatch,
  type SetStateAction,
  type RefObject,
} from "react";
import type { Direction, Reaction } from "./MascotPage";

export const MascotAnimationContext = createContext<{
  direction: Direction;
  setDirection: Dispatch<SetStateAction<Direction>>;
  reaction: Reaction | null;
  setReaction: Dispatch<SetStateAction<Reaction | null>>;
  timers: RefObject<number[]>;
  boops: RefObject<{ count: number; at: number }>;
} | null>(null);
