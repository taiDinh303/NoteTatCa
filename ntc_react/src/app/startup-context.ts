import { createContext } from "react";

// Register visible startup screens so background notices never duplicate them.
export const StartupPresentation = createContext<(() => () => void) | null>(
  null,
);
