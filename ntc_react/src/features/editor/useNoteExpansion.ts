import { useCallback, useRef } from "react";

// Show the content immediately; the visual expansion never gates readiness,
// requests or editing. Never move the source card out of the board layout.
export function useNoteExpansion(noteId: string | undefined, fullscreen: boolean) {
  const played = useRef(false);
  const animation = useRef<Animation | null>(null);
  return useCallback((node: HTMLDivElement | null) => {
    if (!node) { animation.current?.cancel(); return; }
    if (played.current) return;
    played.current = true;
    if (!noteId || fullscreen || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const card = document.querySelector(`[data-testid="note-${CSS.escape(noteId)}"]`);
    if (!card) return;
    const source = card.getBoundingClientRect();
    const target = node.getBoundingClientRect();
    if (!source.width || !target.width || source.bottom < 0 || source.top > window.innerHeight) return;
    const scale = target.width / node.offsetWidth || 1;
    const x = (source.left + source.width / 2 - target.left - target.width / 2) / scale;
    const y = (source.top + source.height / 2 - target.top - target.height / 2) / scale;
    const end = getComputedStyle(node).transform;
    animation.current = node.animate([
      { transform: `translate(${x}px, ${y}px) ${end === "none" ? "" : end} scale(${source.width / target.width}, ${source.height / target.height})` },
      { transform: end },
    ], { duration: 100, easing: "cubic-bezier(.2,.8,.2,1)" });
  }, [noteId, fullscreen]);
}
