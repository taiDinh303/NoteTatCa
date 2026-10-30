import { useMobileLayout } from "./useMobileLayout";
import { t as tr, useLanguage } from "./i18n";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { DisplayZoomContext } from "./displayZoom";

const storageKey = "ntc.interface.zoom.v1";
const clamp = (value: number) => Math.min(150, Math.max(50, value));

export function DisplayPreferences({ children }: { children: ReactNode }) {
  useLanguage();
  const mobile = useMobileLayout();
  const [percent, setPercent] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved?.trim() && Number.isFinite(Number(saved))
        ? Math.round(clamp(Number(saved)))
        : 100;
    } catch {
      return 100;
    }
  });
  const target = useRef(percent);
  const current = useRef(percent);
  const listeners = useRef(
    new Set<(scale: number, settled: boolean) => void>(),
  );
  const subscribe = useCallback(
    (paint: (scale: number, settled: boolean) => void) => {
      listeners.current.add(paint);
      paint(mobile ? 1 : current.current / 100, true);
      return () => {
        listeners.current.delete(paint);
      };
    },
    [mobile],
  );
  const indicator = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const manualChange = useRef<(value: number) => void>(() => {});
  const changePercent = useCallback(
    (value: number) => manualChange.current(value),
    [],
  );
  const zoomContext = useMemo(
    () => ({ percent: mobile ? 100 : percent, change: changePercent, subscribe }),
    [mobile, percent, changePercent, subscribe],
  );
  useEffect(() => {
    if (mobile) return;
    let frame = 0;
    let hideTimer = 0;
    let lastTime = 0;
    let lastInput = 0;
    let pinch: { ids: number[]; distance: number; percent: number } | undefined;
    let safariBase: number | undefined;
    const isContent = (event: Event) =>
      event.target instanceof Element &&
      !!event.target.closest("[data-content-zoom]");
    const hasList = () => !!document.querySelector("[data-notes-zoom]");
    const isList = (event: Event) =>
      event.target instanceof Element &&
      !!event.target.closest("[data-notes-zoom]");
    function persist() {
      const value = Math.round(current.current);
      setPercent(value);
      try {
        localStorage.setItem(storageKey, String(value));
      } catch {
        /* Optional preference. */
      }
    }
    function paint(time: number) {
      const elapsed = lastTime ? Math.min(32, time - lastTime) : 16;
      lastTime = time;
      const difference = target.current - current.current;
      current.current += difference * (1 - Math.exp(-elapsed / 55));
      if (Math.abs(difference) < 0.015) current.current = target.current;
      listeners.current.forEach((listener) =>
        listener(current.current / 100, false),
      );
      if (indicator.current)
        indicator.current.textContent = `${Math.round(current.current)}%`;
      if (current.current !== target.current || time - lastInput < 160) {
        frame = requestAnimationFrame(paint);
      } else {
        frame = 0;
        lastTime = 0;
        listeners.current.forEach((listener) =>
          listener(current.current / 100, true),
        );
        persist();
      }
    }
    function change(value: number, immediate = false) {
      if (!Number.isFinite(value)) return;
      target.current = clamp(value);
      lastInput = performance.now();
      if (immediate) {
        cancelAnimationFrame(frame);
        frame = 0;
        lastTime = 0;
        current.current = target.current;
        listeners.current.forEach((listener) =>
          listener(current.current / 100, true),
        );
        persist();
      } else if (!frame) frame = requestAnimationFrame(paint);
      setVisible(true);
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => setVisible(false), 1200);
    }
    // Retain the saved preference; its scope is now the notes list only.
    persist();
    manualChange.current = (value) => change(Math.round(value), true);
    function wheel(event: WheelEvent) {
      if (isContent(event)) return;
      if (
        !(event.ctrlKey || event.metaKey) ||
        !event.deltaY ||
        !event.cancelable
      )
        return;
      if (!hasList()) return;
      event.preventDefault();
      if (!isList(event)) return;
      const unit =
        event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
            ? window.innerHeight
            : 1;
      change(
        target.current *
          Math.exp(-Math.max(-80, Math.min(80, event.deltaY * unit)) * 0.0012),
      );
    }
    const distance = (a: Touch, b: Touch) =>
      Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    function touchStart(event: TouchEvent) {
      if (isContent(event) || !isList(event)) {
        pinch = undefined;
        return;
      }
      if (event.touches.length !== 2) {
        pinch = undefined;
        return;
      }
      if (!event.cancelable) return;
      event.preventDefault();
      const [a, b] = Array.from(event.touches);
      const span = distance(a, b);
      if (span > 0)
        pinch = {
          ids: [a.identifier, b.identifier],
          distance: span,
          percent: target.current,
        };
    }
    function touchMove(event: TouchEvent) {
      if (!pinch || event.touches.length !== 2 || !event.cancelable) return;
      const touches = Array.from(event.touches);
      const a = touches.find((touch) => touch.identifier === pinch?.ids[0]);
      const b = touches.find((touch) => touch.identifier === pinch?.ids[1]);
      if (!a || !b) return;
      event.preventDefault();
      change((pinch.percent * distance(a, b)) / pinch.distance);
    }
    function touchEnd() {
      pinch = undefined;
    }
    function pointerMove(event: PointerEvent) {
      // Pinching on a drag handle must not also start reordering notes.
      if (pinch && event.pointerType === "touch") event.stopPropagation();
    }
    function gestureStart(event: Event) {
      if (isContent(event) || !isList(event)) {
        safariBase = undefined;
        return;
      }
      if (!event.cancelable) return;
      event.preventDefault();
      safariBase = target.current;
    }
    function gestureChange(event: Event) {
      if (isContent(event) || safariBase === undefined) return;
      if (!event.cancelable) return;
      event.preventDefault();
      const scale = (event as Event & { scale?: number }).scale;
      if (!pinch && safariBase !== undefined && typeof scale === "number")
        change(safariBase * scale);
    }
    function gestureEnd() {
      safariBase = undefined;
    }
    const options = { passive: false, capture: true };
    window.addEventListener("wheel", wheel, options);
    window.addEventListener("touchstart", touchStart, options);
    window.addEventListener("touchmove", touchMove, options);
    window.addEventListener("touchend", touchEnd, true);
    window.addEventListener("touchcancel", touchEnd, true);
    window.addEventListener("pointermove", pointerMove, true);
    window.addEventListener("gesturestart", gestureStart, options);
    window.addEventListener("gesturechange", gestureChange, options);
    window.addEventListener("gestureend", gestureEnd, true);
    return () => {
      manualChange.current = () => {};
      cancelAnimationFrame(frame);
      window.clearTimeout(hideTimer);
      window.removeEventListener("wheel", wheel, true);
      window.removeEventListener("touchstart", touchStart, true);
      window.removeEventListener("touchmove", touchMove, true);
      window.removeEventListener("touchend", touchEnd, true);
      window.removeEventListener("touchcancel", touchEnd, true);
      window.removeEventListener("pointermove", pointerMove, true);
      window.removeEventListener("gesturestart", gestureStart, true);
      window.removeEventListener("gesturechange", gestureChange, true);
      window.removeEventListener("gestureend", gestureEnd, true);
    };
  }, [mobile]);
  return (
    <DisplayZoomContext.Provider value={zoomContext}>
      {children}
      {visible && !mobile
        ? createPortal(
            <div
              ref={indicator}
              className="zoom-indicator"
              role="status"
              aria-label={tr("Notes zoom")}
              aria-atomic="true"
            >
              {percent}%
            </div>,
            document.body,
          )
        : null}
    </DisplayZoomContext.Provider>
  );
}
