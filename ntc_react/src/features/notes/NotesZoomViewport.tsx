import { useLayoutEffect, useRef, type ReactNode } from "react";
import { useDisplayZoom } from "../../shared/displayZoom";
import { t as tr } from "../../shared/i18n";
import "./NotesZoomViewport.css";

export function NotesZoomViewport({ children }: { children: ReactNode }) {
  const viewport = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const { subscribe } = useDisplayZoom();
  useLayoutEffect(() => {
    const view = viewport.current!,
      space = stage.current!,
      content = layer.current!;
    let initialized = false;
    let rasterTimer = 0;
    let scale = 1,
      width = 0,
      height = 0;
    let anchor: { x: number; y: number } | undefined;
    function paint(next: number) {
      if (next !== scale) {
        content.style.willChange = "transform";
        window.clearTimeout(rasterTimer);
        // Release the temporary compositor hint so settled text can rasterize
        // at its final size instead of keeping the initial-size bitmap.
        rasterTimer = window.setTimeout(() => {
          content.style.willChange = "auto";
        }, 180);
      }
      const x = initialized ? (anchor?.x ?? view.clientWidth / 2) : 0;
      const y = initialized ? (anchor?.y ?? view.clientHeight / 2) : 0;
      const docX = (view.scrollLeft + x) / scale;
      const docY = (view.scrollTop + y) / scale;
      scale = next;
      content.style.transform = `scale(${scale})`;
      content.style.setProperty("--notes-scale", String(scale));
      space.style.width = `${width * scale}px`;
      space.style.height = `${height * scale}px`;
      view.scrollLeft = docX * scale - x;
      view.scrollTop = docY * scale - y;
    }
    function measure() {
      const available = view.clientWidth;
      if (available !== width) {
        width = available;
        content.style.width = `${width}px`;
      }
      height = content.offsetHeight;
      paint(scale);
    }
    function resize() {
      const top = view.getBoundingClientRect().top;
      view.style.height = `${Math.max(160, window.innerHeight - top - 20)}px`;
      measure();
    }
    function point(event: MouseEvent) {
      const rect = view.getBoundingClientRect();
      anchor = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }
    function leave() {
      anchor = undefined;
    }
    function touch(event: TouchEvent) {
      if (event.touches.length !== 2) return;
      const [a, b] = Array.from(event.touches);
      const rect = view.getBoundingClientRect();
      anchor = {
        x: (a.clientX + b.clientX) / 2 - rect.left,
        y: (a.clientY + b.clientY) / 2 - rect.top,
      };
    }
    resize();
    const observer = new ResizeObserver(measure);
    observer.observe(view);
    observer.observe(content);
    const unsubscribe = subscribe(paint);
    initialized = true;
    view.addEventListener("wheel", point, { passive: true });
    view.addEventListener("mousemove", point, { passive: true });
    view.addEventListener("mouseleave", leave);
    view.addEventListener("touchstart", touch, { passive: true });
    view.addEventListener("touchmove", touch, { passive: true });
    window.addEventListener("resize", resize);
    return () => {
      observer.disconnect();
      window.clearTimeout(rasterTimer);
      unsubscribe();
      view.removeEventListener("wheel", point);
      view.removeEventListener("mousemove", point);
      view.removeEventListener("mouseleave", leave);
      view.removeEventListener("touchstart", touch);
      view.removeEventListener("touchmove", touch);
      window.removeEventListener("resize", resize);
    };
  }, [subscribe]);
  return (
    <div
      ref={viewport}
      className="notes-zoom-viewport"
      data-notes-zoom
      tabIndex={0}
      role="region"
      aria-label={tr("All notes")}
    >
      <div ref={stage} className="notes-zoom-stage">
        <div ref={layer} className="notes-zoom-layer">
          {children}
        </div>
      </div>
    </div>
  );
}
