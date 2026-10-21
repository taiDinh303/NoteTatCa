import { createContext, useContext } from "react";

export const DisplayZoomContext = createContext<{
  percent: number;
  change: (percent: number) => void;
}>({ percent: 100, change: () => {} });

export const useDisplayZoom = () => useContext(DisplayZoomContext);
