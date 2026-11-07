import { useEffect, useRef, useState } from "react";
import "./HiddenNotesPull.css";
import { useNavigate } from "react-router-dom";
import { t as tr } from "../../shared/i18n";
import { useMobileLayout } from "../../shared/useMobileLayout";
export function HiddenNotesPull({ enabled }: { enabled: boolean }) {
  const marker = useRef<HTMLSpanElement>(null);
  const [ready, setReady] = useState(false);
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
    };
    const move = (e: TouchEvent) => {
      if (!start || e.touches.length !== 1) return;
      const dx = Math.abs(e.touches[0].clientX - start.x),
        dy = e.touches[0].clientY - start.y;
      distance = dy > dx * 2 ? dy : 0;
      setReady(distance >= 120);
    };
    const end = () => {
      if (start && distance >= 120 && !view.querySelector(".dragging"))
        navigate("/hidden-notes");
      start = undefined;
      distance = 0;
      setReady(false);
    };
    const cancel = () => {
      start = undefined;
      distance = 0;
      setReady(false);
    };
    view.addEventListener("touchstart", begin, { passive: true });
    view.addEventListener("touchmove", move, { passive: true });
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
    <span
      ref={marker}
      role="status"
      className="hidden-notes-pull"
      data-enabled={enabled && mobile}
      style={{
        position: "absolute",
        insetInline: 0,
        top: 0,
        pointerEvents: "none",
        textAlign: "center",
        visibility: ready ? "visible" : "hidden",
      }}
    >
      {tr("Pull down to open hidden notes")}
    </span>
  );
}
