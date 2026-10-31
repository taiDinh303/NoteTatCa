import { useLayoutEffect, useRef, useState } from "react";
import { useMascotPreference } from "./mascotPreference";
import { useDesktopMascots } from "./desktopMascots";

// Keep the companion inside the clipped notes viewport, below all controls.
// Check its current perch first; only search for another card when necessary.
export function useListMascotPerch(preferred: string | null, layout: string, mode: string) {
  const { enabled } = useMascotPreference();
  const desktop = useDesktopMascots();
  const [perch, setPerch] = useState<string | null>(null);
  const current = useRef<string | null>(null);
  const previousPreferred = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (!enabled || !desktop || !preferred) return;
    const viewport = document.querySelector<HTMLElement>("[data-notes-zoom]");
    const layer = viewport?.querySelector<HTMLElement>(".notes-zoom-layer");
    if (!viewport || !layer) return;
    let frame = 0;
    if (previousPreferred.current !== preferred) {
      previousPreferred.current = preferred;
      current.current = preferred;
    }
    function measure() {
      frame = 0;
      const bounds = viewport!.getBoundingClientRect();
      function safe(card: HTMLElement) {
        const box = card.getBoundingClientRect();
        const scale = box.width / card.offsetWidth;
        // Full 80px sprite, including tall artwork and transparent atlas space.
        return box.top - 120 * scale >= bounds.top + 2 &&
          box.top <= bounds.bottom && box.right - 52 * scale <= bounds.right &&
          box.right - 132 * scale >= bounds.left;
      }
      let next: string | null = null;
      if (window.innerWidth > 800 && preferred) {
        const card = current.current
          ? viewport!.querySelector<HTMLElement>(`[data-testid="${CSS.escape(`note-${current.current}`)}"]`)
          : null;
        if (card && safe(card)) next = current.current;
        else {
          const candidate = Array.from(viewport!.querySelectorAll<HTMLElement>(".note-card")).find(safe);
          next = candidate?.dataset.testid?.slice(5) ?? null;
        }
      }
      current.current = next;
      setPerch(previous => previous === next ? previous : next);
    }
    function schedule() {
      if (!frame) frame = requestAnimationFrame(measure);
    }
    measure();
    const observer = new ResizeObserver(schedule);
    observer.observe(viewport);
    observer.observe(layer);
    viewport.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      viewport.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [preferred, layout, mode, enabled, desktop]);
  return enabled && desktop ? perch : null;
}
