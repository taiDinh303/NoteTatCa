import { createContext } from "react";

// Standalone modals are visible on mount. The persistent workspace surface
// reveals its portal later, after the note's frame metadata is registered.
export const NoteSurfaceVisibility = createContext(true);
