import { useLayoutEffect, useRef, type ReactNode } from "react";
import { useDisplayZoom } from "../../shared/displayZoom";
import { t as tr } from "../../shared/i18n";
import "./NotesZoomViewport.css";

export function NotesZoomViewport({
  children,
  mode,
}: {
  children: ReactNode;
  mode: string;
}) {
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
    let fitTimer = 0;
    let availableWidth = 0;
    const reflowAnimations = new Set<Animation>();
    let scale = 1,
      width = 0,
      height = 0;
    let anchor: { x: number; y: number } | undefined;
    function cards() {
      return Array.from(content.querySelectorAll<HTMLElement>(".note-card"));
    }
    function cancelReflow() {
      reflowAnimations.forEach((animation) => animation.cancel());
      reflowAnimations.clear();
    }
    function fit(animate = false) {
      window.clearTimeout(fitTimer);
      // Do not change sortable geometry underneath a pointer/keyboard drag.
      if (content.querySelector(".dragging")) {
        fitTimer = window.setTimeout(() => fit(animate), 100);
        return;
      }
      const nextWidth = availableWidth / scale;
      const columns =
        mode === "list" ? 1 : Math.max(1, Math.floor((nextWidth + 20) / 340));
      if (
        Math.abs(nextWidth - width) < 0.01 &&
        content.style.getPropertyValue("--notes-columns") === String(columns)
      )
        return;
      cancelReflow();
      const nodes = cards();
      const before = nodes.map((node) => node.getBoundingClientRect());
      const top = view.getBoundingClientRect().top;
      const marker = before.findIndex((rect) => rect.bottom > top);
      width = nextWidth;
      content.style.width = `${width}px`;
      content.style.setProperty("--notes-columns", String(columns));
      height = content.offsetHeight;
      space.style.width = `${availableWidth}px`;
      space.style.height = `${height * scale}px`;
      view.scrollLeft = 0;
      // Keep the first visible note at the same reading position when possible.
      if (initialized && marker >= 0)
        view.scrollTop +=
          nodes[marker].getBoundingClientRect().top - before[marker].top;
      if (!animate || matchMedia("(prefers-reduced-motion: reduce)").matches)
        return;
      nodes.forEach((node, index) => {
        const after = node.getBoundingClientRect();
        const x = (before[index].left - after.left) / scale;
        const y = (before[index].top - after.top) / scale;
        if (Math.hypot(x, y) < 1) return;
        const animation = node.animate(
          [
            { transform: `translate(${x}px, ${y}px)` },
            { transform: "translate(0, 0)" },
          ],
          { duration: 180, easing: "cubic-bezier(.2,.8,.2,1)" },
        );
        animation.id = "notes-reflow";
        reflowAnimations.add(animation);
        void animation.finished
          .catch(() => {})
          .finally(() => reflowAnimations.delete(animation));
      });
    }
    function paint(next: number, settled = false) {
      if (next !== scale) {
        window.clearTimeout(fitTimer);
        cancelReflow();
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
      if (settled) fit(initialized);
    }
    function measure() {
      const available = view.clientWidth;
      if (available !== availableWidth) {
        availableWidth = available;
        fit();
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
      window.clearTimeout(fitTimer);
      cancelReflow();
      unsubscribe();
      view.removeEventListener("wheel", point);
      view.removeEventListener("mousemove", point);
      view.removeEventListener("mouseleave", leave);
      view.removeEventListener("touchstart", touch);
      view.removeEventListener("touchmove", touch);
      window.removeEventListener("resize", resize);
    };
  }, [subscribe, mode]);
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
