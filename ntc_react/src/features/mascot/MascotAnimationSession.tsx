import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { MascotAnimationContext } from "./mascotAnimation";
import type { Direction, Reaction } from "./MascotPage";

// Own motion for the entire opened-note session, rather than one editor mode.
export function MascotAnimationSession({ children }: { children: ReactNode }) {
  const [direction, setDirection] = useState<Direction>("center");
  const [reaction, setReaction] = useState<Reaction | null>(null);
  const timers = useRef<number[]>([]);
  const boops = useRef({ count: 0, at: 0 });
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(window.clearTimeout);
  }, []);
  const motion = useMemo(
    () => ({ direction, setDirection, reaction, setReaction, timers, boops }),
    [direction, reaction],
  );
  return (
    <MascotAnimationContext.Provider value={motion}>
      {children}
    </MascotAnimationContext.Provider>
  );
}
