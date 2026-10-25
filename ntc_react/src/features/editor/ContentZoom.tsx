import { useContext, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Minus, Plus } from "lucide-react";
import { IconButton } from "../../shared/ui";
import { t as tr, useLanguage } from "../../shared/i18n";
import "./ContentZoom.css";
import { ContentZoomSession } from "./contentZoomSession";

const clamp = (value: number) => Math.min(300, Math.max(50, value));

// Scale a fixed-width document, so gestures never reflow paragraphs or edit marks.
export default function ContentZoom({ children }: { children: ReactNode }) {
  useLanguage();
  const viewport = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const change = useRef<(value: number) => void>(() => {});
  const session = useContext(ContentZoomSession);
  const [percent, setPercent] = useState(() =>
    Math.round(session?.current ?? 100),
  );
  useLayoutEffect(() => {
    const view = viewport.current!;
    const space = stage.current!;
    const document = layer.current!;
    let current = session?.current ?? 100;
    let target = current;
    let frame = 0;
    let timer = 0;
    let width = view.clientWidth;
    let height = document.offsetHeight;
    let anchor:
      { x: number; y: number; docX: number; docY: number } | undefined;
    let pinch: { ids: number[]; distance: number; base: number } | undefined;
    let safariBase: number | undefined;
    function point(clientX: number, clientY: number) {
      const rect = view.getBoundingClientRect();
      const scale = rect.width / view.clientWidth || 1;
      return {
        x: (clientX - rect.left) / scale,
        y: (clientY - rect.top) / scale,
      };
    }
    function setAnchor(x: number, y: number) {
      anchor = {
        x,
        y,
        docX: (view.scrollLeft + x) / (current / 100),
        docY: (view.scrollTop + y) / (current / 100),
      };
    }
    function paint() {
      frame = 0;
      current = target;
      const scale = current / 100;
      document.style.transform = `scale(${scale})`;
      space.style.width = `${width * scale}px`;
      space.style.height = `${height * scale}px`;
      if (anchor) {
        view.scrollLeft = anchor.docX * scale - anchor.x;
        view.scrollTop = anchor.docY * scale - anchor.y;
        anchor = undefined;
      }
    }
    function schedule() {
      if (!frame) frame = requestAnimationFrame(paint);
    }
    function update(value: number) {
      if (!Number.isFinite(value)) return;
      target = clamp(value);
      if (session) session.current = target;
      document.style.willChange = "transform";
      schedule();
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        document.style.willChange = "auto";
        setPercent(Math.round(target));
      }, 120);
    }
    change.current = (value) => {
      setAnchor(view.clientWidth / 2, view.clientHeight / 2);
      update(value);
      setPercent(Math.round(target));
    };
    const observer = new ResizeObserver(() => {
      width = view.clientWidth;
      document.style.width = `${width}px`;
      document.style.minHeight = `${view.clientHeight}px`;
      height = document.offsetHeight;
      schedule();
    });
    document.style.width = `${width}px`;
    document.style.minHeight = `${view.clientHeight}px`;
    observer.observe(view);
    observer.observe(document);
    schedule();
    function wheel(event: WheelEvent) {
      if (
        !(event.ctrlKey || event.metaKey) ||
        !event.deltaY ||
        !event.cancelable
      )
        return;
      event.preventDefault();
      const p = point(event.clientX, event.clientY);
      setAnchor(p.x, p.y);
      const unit =
        event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
            ? view.clientHeight
            : 1;
      update(target * Math.exp(-event.deltaY * unit * 0.001));
    }
    const distance = (a: Touch, b: Touch) =>
      Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    function start(event: TouchEvent) {
      pinch = undefined;
      if (event.touches.length !== 2 || !event.cancelable) return;
      event.preventDefault();
      const [a, b] = Array.from(event.touches);
      const span = distance(a, b);
      if (span)
        pinch = {
          ids: [a.identifier, b.identifier],
          distance: span,
          base: target,
        };
    }
    function move(event: TouchEvent) {
      if (!pinch || event.touches.length !== 2 || !event.cancelable) return;
      const a = Array.from(event.touches).find(
        (t) => t.identifier === pinch!.ids[0],
      );
      const b = Array.from(event.touches).find(
        (t) => t.identifier === pinch!.ids[1],
      );
      if (!a || !b) return;
      event.preventDefault();
      const p = point((a.clientX + b.clientX) / 2, (a.clientY + b.clientY) / 2);
      setAnchor(p.x, p.y);
      update((pinch.base * distance(a, b)) / pinch.distance);
    }
    function end() {
      pinch = undefined;
    }
    function gestureStart(event: Event) {
      if (!event.cancelable) return;
      event.preventDefault();
      safariBase = target;
    }
    function gestureChange(event: Event) {
      if (!event.cancelable) return;
      event.preventDefault();
      const scale = (event as Event & { scale?: number }).scale;
      if (!pinch && safariBase !== undefined && typeof scale === "number") {
        setAnchor(view.clientWidth / 2, view.clientHeight / 2);
        update(safariBase * scale);
      }
    }
    function gestureEnd() {
      safariBase = undefined;
    }
    const options = { passive: false };
    view.addEventListener("wheel", wheel, options);
    view.addEventListener("touchstart", start, options);
    view.addEventListener("touchmove", move, options);
    view.addEventListener("touchend", end);
    view.addEventListener("touchcancel", end);
    view.addEventListener("gesturestart", gestureStart, options);
    view.addEventListener("gesturechange", gestureChange, options);
    view.addEventListener("gestureend", gestureEnd);
    return () => {
      change.current = () => {};
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      view.removeEventListener("wheel", wheel);
      view.removeEventListener("touchstart", start);
      view.removeEventListener("touchmove", move);
      view.removeEventListener("touchend", end);
      view.removeEventListener("touchcancel", end);
      view.removeEventListener("gesturestart", gestureStart);
      view.removeEventListener("gesturechange", gestureChange);
      view.removeEventListener("gestureend", gestureEnd);
    };
  }, [session]);
  return (
    <div className="content-zoom">
      <div className="content-zoom-viewport" data-content-zoom ref={viewport}>
        <div className="content-zoom-stage" ref={stage}>
          <div className="content-zoom-layer" ref={layer}>
            {children}
          </div>
        </div>
      </div>
      <div
        className="content-zoom-controls"
        role="group"
        aria-label={tr("Content zoom")}
      >
        <IconButton
          icon={Minus}
          label={tr("Zoom out content")}
          disabled={percent <= 50}
          onClick={() => change.current(percent - 10)}
        />
        <button
          type="button"
          className="content-zoom-reset"
          aria-label={tr("Reset content zoom")}
          title={tr("Reset content zoom")}
          onClick={() => change.current(100)}
        >
          {percent}%
        </button>
        <IconButton
          icon={Plus}
          label={tr("Zoom in content")}
          disabled={percent >= 300}
          onClick={() => change.current(percent + 10)}
        />
      </div>
    </div>
  );
}
