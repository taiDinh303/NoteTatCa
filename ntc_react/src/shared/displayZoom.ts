import { createContext, useContext } from "react";

export const DisplayZoomContext = createContext<{
  percent: number;
  change: (percent: number) => void;
  subscribe: (paint: (scale: number) => void) => () => void;
}>({ percent: 100, change: () => {}, subscribe: () => () => {} });

export const useDisplayZoom = () => useContext(DisplayZoomContext);
