import { t as tr, useLanguage } from "./i18n";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { DisplayZoomContext } from "./displayZoom";

const storageKey = "ntc.interface.zoom.v1";
const clamp = (value: number) => Math.min(150, Math.max(50, value));

export function DisplayPreferences({ children }: { children: ReactNode }) {
  useLanguage();
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
  const indicator = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const manualChange = useRef<(value: number) => void>(() => {});
  const changePercent = useCallback(
    (value: number) => manualChange.current(value),
    [],
  );
  const zoomContext = useMemo(
    () => ({ percent, change: changePercent }),
    [percent, changePercent],
  );
  useLayoutEffect(() => {
    document.documentElement.style.setProperty(
      "--interface-scale",
      String(percent / 100),
    );
    try {
      localStorage.setItem(storageKey, String(percent));
    } catch {
      /* Display preferences are optional when browser storage is blocked. */
    }
  }, [percent]);
  useEffect(() => {
    let frame = 0;
    let hideTimer = 0;
    let commitTimer = 0;
    let pinch: { ids: number[]; distance: number; percent: number } | undefined;
    let safariBase: number | undefined;
    const isContent = (event: Event) =>
      event.target instanceof Element &&
      !!event.target.closest("[data-content-zoom]");
    function paint() {
      frame = 0;
      document.documentElement.style.setProperty(
        "--interface-scale",
        String(target.current / 100),
      );
      if (indicator.current)
        indicator.current.textContent = `${Math.round(target.current)}%`;
      setVisible(true);
    }
    function change(value: number, immediate = false) {
      if (!Number.isFinite(value)) return;
      target.current = clamp(value);
      if (immediate) {
        cancelAnimationFrame(frame);
        paint();
        setPercent(Math.round(target.current));
      } else if (!frame) frame = requestAnimationFrame(paint);
      window.clearTimeout(commitTimer);
      commitTimer = window.setTimeout(
        () => setPercent(Math.round(target.current)),
        160,
      );
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => setVisible(false), 1200);
    }
    manualChange.current = (value) => change(Math.round(value), true);
    function wheel(event: WheelEvent) {
      if (isContent(event)) return;
      if (
        !(event.ctrlKey || event.metaKey) ||
        !event.deltaY ||
        !event.cancelable
      )
        return;
      event.preventDefault();
      const unit =
        event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
            ? window.innerHeight
            : 1;
      change(target.current * Math.exp(-event.deltaY * unit * 0.001));
    }
    const distance = (a: Touch, b: Touch) =>
      Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    function touchStart(event: TouchEvent) {
      if (isContent(event)) {
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
      if (isContent(event)) {
        safariBase = undefined;
        return;
      }
      if (!event.cancelable) return;
      event.preventDefault();
      safariBase = target.current;
    }
    function gestureChange(event: Event) {
      if (isContent(event)) return;
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
      window.clearTimeout(commitTimer);
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
  }, []);
  return (
    <DisplayZoomContext.Provider value={zoomContext}>
      {children}
      {visible
        ? createPortal(
            <div
              ref={indicator}
              className="zoom-indicator"
              role="status"
              aria-label={tr("Interface zoom")}
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
