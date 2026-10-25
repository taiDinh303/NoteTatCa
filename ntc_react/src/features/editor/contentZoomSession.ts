import { createContext } from "react";
import type { RefObject } from "react";

export const ContentZoomSession = createContext<RefObject<number> | null>(null);
