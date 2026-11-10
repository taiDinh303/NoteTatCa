import { useEffect, useRef, useState } from "react";
import "./HiddenNotesPull.css";
import { useNavigate } from "react-router-dom";
import { t as tr, useLanguage } from "../../shared/i18n";
import { useMobileLayout } from "../../shared/useMobileLayout";
export function HiddenNotesPull({ enabled }: { enabled: boolean }) {
  useLanguage();
  const marker = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [reveal, setReveal] = useState(0);
  const mobile = useMobileLayout();
  const navigate = useNavigate();
  useEffect(() => {
    if (!enabled || !mobile) return;
    const view = marker.current?.closest<HTMLElement>("[data-notes-zoom]");
    if (!view) return;
    let start: { x: number; y: number } | undefined;
    let distance = 0;
    const begin = (e: TouchEvent) => {
      let ancestor: HTMLElement | null = view;
      while (ancestor) {
        if (ancestor.scrollTop > 0) return;
        ancestor = ancestor.parentElement;
      }
      if (
        e.touches.length !== 1 ||
        view.scrollTop > 0 ||
        (e.target as HTMLElement).closest(
          "button,input,a,textarea,select,[contenteditable=true]",
        )
      )
        return;
      start = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      distance = 0;
      setReveal(0);
    };
    const move = (e: TouchEvent) => {
      if (!start) return;
      if (e.touches.length !== 1) { cancel(); return; }
      const dx = Math.abs(e.touches[0].clientX - start.x),
        dy = e.touches[0].clientY - start.y;
      distance = dy > dx * 2 ? dy : 0;
      if (distance > 8 && e.cancelable) e.preventDefault();
      setReveal(Math.min(44, Math.max(0, distance * 0.4)));
      setReady(distance >= 120);
    };
    const end = () => {
      if (start && distance >= 120 && !view.querySelector(".dragging"))
        navigate("/hidden-notes");
      start = undefined;
      distance = 0;
      setReady(false);
      setReveal(0);
    };
    const cancel = () => {
      start = undefined;
      distance = 0;
      setReady(false);
      setReveal(0);
    };
    view.addEventListener("touchstart", begin, { passive: true });
    view.addEventListener("touchmove", move, { passive: false });
    view.addEventListener("touchend", end);
    view.addEventListener("touchcancel", cancel);
    return () => {
      view.removeEventListener("touchstart", begin);
      view.removeEventListener("touchmove", move);
      view.removeEventListener("touchend", end);
      view.removeEventListener("touchcancel", cancel);
    };
  }, [enabled, mobile, navigate]);
  return (
    <div
      ref={marker}
      role="status"
      className="hidden-notes-pull"
      data-enabled={enabled && mobile}
      data-pulling={enabled && mobile && reveal > 0}
      style={{
        height: enabled && mobile ? reveal : 0,
        visibility: enabled && mobile && reveal > 0 ? "visible" : "hidden",
      }}
    >
      <span>{tr(ready ? "Release to open hidden notes" : "Pull down to open hidden notes")}</span>
    </div>
  );
}
