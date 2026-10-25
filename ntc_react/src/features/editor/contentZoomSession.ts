import { createContext } from "react";
import type { RefObject } from "react";

export const ContentZoomSession = createContext<{
  percent: RefObject<number>;
  target: HTMLDivElement | null;
  setTarget: (target: HTMLDivElement | null) => void;
} | null>(null);
