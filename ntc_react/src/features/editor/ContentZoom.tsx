import { useContext, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { Hand, Minus, Plus, RotateCcw } from "lucide-react";
import { IconButton } from "../../shared/ui";
import { t as tr, useLanguage } from "../../shared/i18n";
import "./ContentZoom.css";
import { ContentZoomSession } from "./contentZoomSession";

const clamp = (value: number) => Math.min(300, Math.max(50, value));

// Scale a fixed-width document, so gestures never reflow paragraphs or edit marks.
export default function ContentZoom({
  children,
  readOnly = false,
}: {
  children: ReactNode;
  readOnly?: boolean;
}) {
  useLanguage();
  const viewport = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const change = useRef<(value: number) => void>(() => {});
  const session = useContext(ContentZoomSession);
  const savedPercent = session?.percent;
  const hand = useRef(false);
  const [handEnabled, setHandEnabled] = useState(false);
  const [percent, setPercent] = useState(() =>
    Math.round(savedPercent?.current ?? 100),
  );
  useLayoutEffect(() => {
    const view = viewport.current!;
    const space = stage.current!;
    const document = layer.current!;
    let current = savedPercent?.current ?? 100;
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
      if (savedPercent) savedPercent.current = target;
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
    let drag:
      | {
          id: number;
          x: number;
          y: number;
          left: number;
          top: number;
          scale: number;
        }
      | undefined;
    let dragged = false;
    function pointerDown(event: PointerEvent) {
      dragged = false;
      if (
        !readOnly ||
        !hand.current ||
        event.pointerType !== "mouse" ||
        event.button !== 0
      )
        return;
      if (
        event.target instanceof Element &&
        event.target.closest("a,button,input,textarea,select")
      )
        return;
      if (
        view.scrollWidth <= view.clientWidth &&
        view.scrollHeight <= view.clientHeight
      )
        return;
      event.preventDefault();
      dragged = false;
      drag = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        left: view.scrollLeft,
        top: view.scrollTop,
        scale: view.getBoundingClientRect().width / view.clientWidth || 1,
      };
      view.setPointerCapture(event.pointerId);
      view.dataset.dragging = "true";
    }
    function pointerMove(event: PointerEvent) {
      if (!drag || event.pointerId !== drag.id) return;
      const dx = (event.clientX - drag.x) / drag.scale;
      const dy = (event.clientY - drag.y) / drag.scale;
      if (Math.hypot(dx, dy) > 3) dragged = true;
      view.scrollLeft = drag.left - dx;
      view.scrollTop = drag.top - dy;
    }
    function pointerEnd(event: PointerEvent) {
      if (!drag || event.pointerId !== drag.id) return;
      drag = undefined;
      delete view.dataset.dragging;
      if (view.hasPointerCapture(event.pointerId))
        view.releasePointerCapture(event.pointerId);
    }
    function click(event: MouseEvent) {
      if (!dragged) return;
      dragged = false;
      event.preventDefault();
      event.stopPropagation();
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
    view.addEventListener("pointerdown", pointerDown);
    view.addEventListener("pointermove", pointerMove);
    view.addEventListener("pointerup", pointerEnd);
    view.addEventListener("pointercancel", pointerEnd);
    view.addEventListener("lostpointercapture", pointerEnd);
    view.addEventListener("click", click, true);
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
      view.removeEventListener("pointerdown", pointerDown);
      view.removeEventListener("pointermove", pointerMove);
      view.removeEventListener("pointerup", pointerEnd);
      view.removeEventListener("pointercancel", pointerEnd);
      view.removeEventListener("lostpointercapture", pointerEnd);
      view.removeEventListener("click", click, true);
    };
  }, [savedPercent, readOnly]);
  function commit(input: HTMLInputElement) {
    const value = input.value.trim() ? Number(input.value) : NaN;
    if (Number.isFinite(value)) change.current(value);
    input.value = String(
      Number.isFinite(value) ? Math.round(clamp(value)) : percent,
    );
  }
  const controls = (
    <div
      className="content-zoom-controls"
      role="group"
      aria-label={tr("Content zoom")}
    >
      {readOnly ? (
        <span className="content-pan-toggle">
          <IconButton
            icon={Hand}
            label={tr("Pan content")}
            aria-pressed={handEnabled}
            active={handEnabled}
            onClick={() => {
              hand.current = !hand.current;
              setHandEnabled(hand.current);
            }}
          />
        </span>
      ) : null}
      <IconButton
        icon={Minus}
        label={tr("Zoom out content")}
        disabled={percent <= 50}
        onClick={() => change.current(percent - 10)}
      />
      <label className="content-zoom-value">
        <input
          key={percent}
          type="number"
          inputMode="numeric"
          min={50}
          max={300}
          step={10}
          defaultValue={percent}
          aria-label={tr("Content zoom percentage")}
          onBlur={(event) => commit(event.currentTarget)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              event.currentTarget.blur();
            }
            if (event.key === "Escape")
              event.currentTarget.value = String(percent);
          }}
        />
        <span aria-hidden="true">%</span>
      </label>
      <IconButton
        icon={Plus}
        label={tr("Zoom in content")}
        disabled={percent >= 300}
        onClick={() => change.current(percent + 10)}
      />
      <IconButton
        icon={RotateCcw}
        label={tr("Reset content zoom")}
        onClick={() => change.current(100)}
      />
    </div>
  );
  return (
    <div className="content-zoom">
      <div
        className="content-zoom-viewport"
        data-content-zoom
        data-hand={readOnly && handEnabled}
        ref={viewport}
      >
        <div className="content-zoom-stage" ref={stage}>
          <div className="content-zoom-layer" ref={layer}>
            {children}
          </div>
        </div>
      </div>
      {session?.target ? createPortal(controls, session.target) : null}
    </div>
  );
}
