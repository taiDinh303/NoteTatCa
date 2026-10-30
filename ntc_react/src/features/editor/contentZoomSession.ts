import { createContext } from "react";
import type { RefObject } from "react";

export const ContentZoomSession = createContext<{
  percent: RefObject<number>;
  scroll: RefObject<{ left: number; top: number }>;
  target: HTMLDivElement | null;
  setTarget: (target: HTMLDivElement | null) => void;
  handTarget: HTMLDivElement | null;
  setHandTarget: (target: HTMLDivElement | null) => void;
} | null>(null);
