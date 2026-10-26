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
  const scrollbar = useRef<HTMLDivElement>(null);
  const scrollRange = useRef<HTMLDivElement>(null);
  const { subscribe } = useDisplayZoom();
  useLayoutEffect(() => {
    const view = viewport.current!,
      space = stage.current!,
      content = layer.current!,
      rail = scrollbar.current!,
      range = scrollRange.current!;
    let initialized = false;
    let rasterTimer = 0;
    let fitTimer = 0;
    let availableWidth = 0;
    const reflowAnimations = new Set<Animation>();
    const frozenGrids = new Set<HTMLElement>();
    let scale = 1,
      width = 0,
      height = 0;
    let anchor: { x: number; y: number } | undefined;
    // A native scrollbar spans the whole window while the note viewport stays
    // below the fixed controls. Both represent the same scroll offset/range.
    function updateScrollbar() {
      const overflow = Math.max(0, view.scrollHeight - view.clientHeight);
      const height = `${rail.clientHeight + overflow}px`;
      if (range.style.height !== height) range.style.height = height;
      rail.style.visibility = overflow > 1 ? "visible" : "hidden";
      if (Math.abs(rail.scrollTop - view.scrollTop) > 0.5)
        rail.scrollTop = view.scrollTop;
    }
    function scrollNotes() {
      if (Math.abs(view.scrollTop - rail.scrollTop) > 0.5)
        view.scrollTop = rail.scrollTop;
    }
    function cards() {
      return Array.from(content.querySelectorAll<HTMLElement>(".note-card"));
    }
    function cancelReflow() {
      reflowAnimations.forEach((animation) => animation.cancel());
      reflowAnimations.clear();
      releaseGrids();
    }
    function releaseGrids() {
      frozenGrids.forEach((grid) => {
        grid.style.gridTemplateRows = "";
      });
      frozenGrids.clear();
    }
    function columnsFor(nextScale: number) {
      return mode === "list"
        ? 1
        : Math.max(1, Math.floor((availableWidth / nextScale + 20) / 340));
    }
    function fit(animate = false, resizeOnly = false) {
      window.clearTimeout(fitTimer);
      // Do not change sortable geometry underneath a pointer/keyboard drag.
      if (content.querySelector(".dragging")) {
        fitTimer = window.setTimeout(() => fit(animate, resizeOnly), 100);
        return;
      }
      const nextWidth = availableWidth / scale;
      const columns = columnsFor(scale);
      if (
        Math.abs(nextWidth - width) < 0.01 &&
        content.style.getPropertyValue("--notes-columns") === String(columns)
      )
        return;
      // A sidebar transition resizes the canvas every frame. Fixed card/gap
      // tracks have identical geometry until a column boundary is crossed.
      // Avoid cancelling/restarting card motion for each margin animation tick.
      if (
        ((mode === "list" && resizeOnly) ||
          (mode !== "list" && width >= 320 && nextWidth >= 320)) &&
        content.style.getPropertyValue("--notes-columns") === String(columns)
      ) {
        width = nextWidth;
        content.style.width = `${width}px`;
        space.style.width = `${availableWidth}px`;
        if (mode === "list") {
          height = content.offsetHeight;
          space.style.height = `${height * scale}px`;
        }
        return;
      }
      const nodes = cards();
      // Capture the on-screen boxes before cancelling any in-flight reflow,
      // so a resize can retarget the current visual position without snapping.
      const before = nodes.map((node) => node.getBoundingClientRect());
      cancelReflow();
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
      updateScrollbar();
      if (!animate || matchMedia("(prefers-reduced-motion: reduce)").matches)
        return;
      // Lock the destination rows while each card's own box interpolates.
      // This avoids scaling/distorting its text or moving subsequent rows twice.
      const afterBoxes = nodes.map((node) => node.getBoundingClientRect());
      content.querySelectorAll<HTMLElement>(".note-grid").forEach((grid) => {
        grid.style.gridTemplateRows = getComputedStyle(grid).gridTemplateRows;
        frozenGrids.add(grid);
      });
      nodes.forEach((node, index) => {
        const after = afterBoxes[index];
        if (!after.width || !after.height) return;
        const x = (before[index].left - after.left) / scale;
        const y = (before[index].top - after.top) / scale;
        if (
          Math.hypot(x, y) < 1 &&
          Math.abs(before[index].width - after.width) < 1 &&
          Math.abs(before[index].height - after.height) < 1
        )
          return;
        const animation = node.animate(
          [
            {
              transform: `translate3d(${x}px, ${y}px, 0)`,
              ...(mode === "list"
                ? { width: `${before[index].width / scale}px` }
                : {}),
              height: `${before[index].height / scale}px`,
            },
            {
              transform: "translate3d(0, 0, 0)",
              ...(mode === "list" ? { width: `${after.width / scale}px` } : {}),
              height: `${after.height / scale}px`,
            },
          ],
          { duration: 240, easing: "cubic-bezier(.4,0,.2,1)" },
        );
        animation.id = "notes-reflow";
        reflowAnimations.add(animation);
        void animation.finished.then(
          () => {
            reflowAnimations.delete(animation);
            // Transformed boxes can temporarily extend the scrollable overflow.
            if (!reflowAnimations.size && view.isConnected) {
              releaseGrids();
              height = content.offsetHeight;
              space.style.height = `${height * scale}px`;
              updateScrollbar();
            }
          },
          () => {
            reflowAnimations.delete(animation);
          },
        );
      });
      if (!reflowAnimations.size) releaseGrids();
    }
    function paint(next: number, settled = false) {
      if (next !== scale) {
        window.clearTimeout(fitTimer);
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
      // Reflow as soon as a column boundary is crossed, rather than waiting
      // for the zoom gesture and easing tail to stop in two separate phases.
      if (
        settled ||
        content.style.getPropertyValue("--notes-columns") !==
          String(columnsFor(scale))
      )
        fit(initialized);
      updateScrollbar();
    }
    function measure() {
      // Extend only the scrollport to the window edge. Keep the card canvas
      // inside the main column's existing responsive right inset.
      const inset = getComputedStyle(view.parentElement!).paddingRight;
      view.style.setProperty("--notes-edge-inset", inset);
      const available = view.clientWidth - parseFloat(inset);
      if (available !== availableWidth) {
        availableWidth = available;
        fit(initialized, true);
      }
      height = content.offsetHeight;
      paint(scale);
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
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(view);
    observer.observe(content);
    observer.observe(rail);
    const unsubscribe = subscribe(paint);
    initialized = true;
    view.addEventListener("wheel", point, { passive: true });
    view.addEventListener("mousemove", point, { passive: true });
    view.addEventListener("mouseleave", leave);
    view.addEventListener("touchstart", touch, { passive: true });
    view.addEventListener("touchmove", touch, { passive: true });
    view.addEventListener("scroll", updateScrollbar, { passive: true });
    rail.addEventListener("scroll", scrollNotes, { passive: true });
    // Release presentation transforms before sortable's interaction sensors run.
    view.addEventListener("pointerdown", cancelReflow, true);
    view.addEventListener("keydown", cancelReflow, true);
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
      view.removeEventListener("scroll", updateScrollbar);
      rail.removeEventListener("scroll", scrollNotes);
      view.removeEventListener("pointerdown", cancelReflow, true);
      view.removeEventListener("keydown", cancelReflow, true);
    };
  }, [subscribe, mode]);
  return (
    <>
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
      <div
        ref={scrollbar}
        className="notes-window-scrollbar"
        aria-hidden="true"
        tabIndex={-1}
      >
        <div ref={scrollRange} />
      </div>
    </>
  );
}
