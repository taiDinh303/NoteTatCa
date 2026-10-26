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
    content.style.removeProperty("translate");
    let initialized = false;
    let fitTimer = 0;
    let availableWidth = 0;
    let cardWidth = 320;
    let gap = 20;
    let shownCardPixels = 320;
    let targetCardPixels = 320;
    let widthFrame = 0;
    let widthTime = 0;
    let sidebarWidthMotion:
      { from: number; start: number; end: number } | undefined;
    const reflowAnimations = new Set<Animation>();
    let scale = 1,
      width = 0,
      height = 0;
    let sidebarMoving = false;
    let sidebarHidden = view
      .closest(".customer-shell")
      ?.classList.contains("sidebar-hidden");
    const shell = view.closest<HTMLElement>(".customer-shell");
    const main = shell?.querySelector<HTMLElement>(":scope > .main-column");
    const previousSidebarWidth = shell?.style.getPropertyValue(
      "--workspace-sidebar-width",
    );
    const previousSidebarPriority = shell?.style.getPropertyPriority(
      "--workspace-sidebar-width",
    );
    // A native scrollbar spans the whole window while the note viewport stays
    // below the fixed controls. Both represent the same scroll offset/range.
    function updateScrollbar() {
      if (view.scrollLeft !== 0) view.scrollLeft = 0;
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
    }
    function columnsFor(nextScale: number) {
      return mode === "list"
        ? 1
        : Math.max(
            1,
            Math.round((availableWidth / nextScale + gap) / (cardWidth + gap)),
          );
    }
    function sidebarClock() {
      return main
        ?.getAnimations()
        .find(
          (animation) =>
            "transitionProperty" in animation &&
            animation.transitionProperty === "margin-left",
        );
    }
    function shareClock(animation: Animation, transition?: Animation) {
      if (!transition) return;
      if (transition.startTime != null)
        animation.startTime = transition.startTime;
      else
        void transition.ready.then(
          () => {
            if (animation.playState !== "idle" && transition.startTime != null)
              animation.startTime = transition.startTime;
          },
          () => {},
        );
    }
    function refreshHeight() {
      height = content.offsetHeight;
      space.style.height = `${height * scale}px`;
      updateScrollbar();
    }
    function applyWidth(refresh = true) {
      const logical = shownCardPixels / scale;
      content.style.setProperty("--notes-card-width", `${logical}px`);
      content.style.width = `${mode === "list" ? logical : width}px`;
      if (refresh) refreshHeight();
    }
    function stepWidth(time: number) {
      if (content.querySelector(".dragging")) {
        widthFrame = 0;
        widthTime = 0;
        return;
      }
      // Cap catch-up after a busy frame so resizing cannot jump a large step.
      const elapsed = widthTime ? Math.min(32, time - widthTime) : 16.67;
      widthTime = time;
      if (sidebarWidthMotion && sidebarMoving && main) {
        const { from, start, end } = sidebarWidthMotion;
        const margin = parseFloat(getComputedStyle(main).marginLeft);
        const progress = Math.max(
          0,
          Math.min(1, (margin - start) / (end - start)),
        );
        shownCardPixels = from + (targetCardPixels - from) * progress;
        if (progress >= 0.9999 || !sidebarClock()) {
          shownCardPixels = targetCardPixels;
          sidebarWidthMotion = undefined;
        }
      } else {
        sidebarWidthMotion = undefined;
        shownCardPixels +=
          (targetCardPixels - shownCardPixels) * (1 - Math.exp(-elapsed / 55));
      }
      if (Math.abs(targetCardPixels - shownCardPixels) < 0.01)
        shownCardPixels = targetCardPixels;
      applyWidth();
      if (shownCardPixels !== targetCardPixels)
        widthFrame = requestAnimationFrame(stepWidth);
      else {
        widthFrame = 0;
        widthTime = 0;
        delete content.dataset.widthAnimating;
      }
    }
    function setWidthTarget(value: number) {
      targetCardPixels = value;
      if (
        !initialized ||
        matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        cancelAnimationFrame(widthFrame);
        widthFrame = 0;
        widthTime = 0;
        sidebarWidthMotion = undefined;
        shownCardPixels = targetCardPixels;
        delete content.dataset.widthAnimating;
        applyWidth();
      } else if (
        Math.abs(targetCardPixels - shownCardPixels) > 0.01 &&
        !widthFrame
      ) {
        content.dataset.widthAnimating = "true";
        widthFrame = requestAnimationFrame(stepWidth);
      }
    }
    function fit(animate = false, sidebar = false) {
      window.clearTimeout(fitTimer);
      if (content.querySelector(".dragging")) {
        fitTimer = window.setTimeout(() => fit(animate), 100);
        return;
      }
      const columns = columnsFor(scale);
      width = availableWidth / scale;
      const nextCardWidth = Math.max(
        1,
        (width - (columns - 1) * gap) / columns,
      );
      const changedColumns =
        content.style.getPropertyValue("--notes-columns") !== String(columns);
      content.style.setProperty("--notes-gap", `${gap}px`);
      space.style.width = `${availableWidth}px`;
      if (!changedColumns) {
        content.style.width = `${mode === "list" ? shownCardPixels / scale : width}px`;
        setWidthTarget(nextCardWidth * scale);
        refreshHeight();
        return;
      }
      const nodes = cards();
      const before = nodes.map((node) => node.getBoundingClientRect());
      cancelReflow();
      content.style.setProperty("--notes-columns", String(columns));
      // Re-wrap at the current animated width, then grow/shrink the shared
      // track. FLIP accounts for the new slots without a width jump or scaleX.
      content.style.width = `${mode === "list" ? shownCardPixels / scale : width}px`;
      if (!initialized) shownCardPixels = nextCardWidth * scale;
      applyWidth();
      const after = nodes.map((node) => node.getBoundingClientRect());
      if (animate && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
        const transition = sidebar ? sidebarClock() : undefined;
        const duration = transition?.effect?.getTiming().duration;
        nodes.forEach((node, index) => {
          const x = (before[index].left - after[index].left) / scale;
          const y = (before[index].top - after[index].top) / scale;
          if (Math.hypot(x, y) < 1) return;
          const animation = node.animate(
            [
              { transform: `translate3d(${x}px, ${y}px, 0)` },
              { transform: "translate3d(0, 0, 0)" },
            ],
            {
              duration: sidebar
                ? typeof duration === "number"
                  ? duration
                  : 160
                : 240,
              easing: sidebar
                ? "cubic-bezier(.2,0,0,1)"
                : "cubic-bezier(.4,0,.2,1)",
            },
          );
          shareClock(animation, transition);
          animation.id = "notes-reflow";
          reflowAnimations.add(animation);
          void animation.finished.then(
            () => {
              reflowAnimations.delete(animation);
              if (!reflowAnimations.size && view.isConnected) refreshHeight();
            },
            () => {
              reflowAnimations.delete(animation);
            },
          );
        });
      }
      setWidthTarget(nextCardWidth * scale);
      refreshHeight();
    }
    function paint(next: number) {
      scale = next;
      content.style.transform = `scale(${scale})`;
      content.style.setProperty("--notes-scale", String(scale));
      // Interpolate screen-pixel width separately from text zoom. Compensating
      // the parent's scale avoids growing then shrinking a card in one slot.
      applyWidth(false);
      view.scrollLeft = 0;
      fit(initialized);
      refreshHeight();
    }
    function measure() {
      // Extend only the scrollport to the window edge. Keep the card canvas
      // inside the main column's existing responsive right inset.
      const inset = getComputedStyle(view.parentElement!).paddingRight;
      view.style.setProperty("--notes-edge-inset", inset);
      // At 100%, closing navigation adds exactly one complete column. Card
      // Reference width, gap and sidebar stay fixed; rendered width adapts.
      const desktop = window.innerWidth > 800;
      const mainStyle = getComputedStyle(view.parentElement!);
      const fullWidth =
        (shell?.clientWidth ?? window.innerWidth) -
        parseFloat(mainStyle.paddingLeft) -
        parseFloat(mainStyle.paddingRight);
      gap = desktop ? 20 : 16;
      const fullColumns = desktop
        ? Math.max(3, Math.round((fullWidth + gap) / (300 + gap)))
        : Math.max(1, Math.round((fullWidth + gap) / (300 + gap)));
      const nextCardWidth =
        window.innerWidth < 600
          ? Math.max(1, fullWidth - gap)
          : (fullWidth - (fullColumns - 1) * gap) / fullColumns;
      if (desktop && shell && main) {
        const sidebarWidth = `${nextCardWidth + gap}px`;
        if (
          shell.style.getPropertyValue("--workspace-sidebar-width") !==
          sidebarWidth
        ) {
          // A window resize sets the new geometry before paint. Do not run a
          // margin transition while the sidebar's width itself changes.
          const transition = main.style.getPropertyValue("transition");
          const priority = main.style.getPropertyPriority("transition");
          main.style.setProperty("transition", "none", "important");
          shell.style.setProperty("--workspace-sidebar-width", sidebarWidth);
          void main.offsetWidth;
          if (transition)
            main.style.setProperty("transition", transition, priority);
          else main.style.removeProperty("transition");
        }
      }
      const tracksChanged = Math.abs(nextCardWidth - cardWidth) > 0.01;
      cardWidth = nextCardWidth;
      content.style.setProperty("--notes-base-card-width", `${cardWidth}px`);
      if (
        sidebarMoving &&
        !main
          ?.getAnimations()
          .some(
            (animation) =>
              "transitionProperty" in animation &&
              animation.transitionProperty === "margin-left" &&
              animation.playState === "running",
          )
      )
        sidebarMoving = false;
      const available = view.getBoundingClientRect().width - parseFloat(inset);
      if (tracksChanged || (!sidebarMoving && available !== availableWidth)) {
        availableWidth = available;
        fit(initialized);
      }
      height = content.offsetHeight;
      paint(scale);
    }
    // Choose the final column layout before the sidebar's first moving frame.
    // Subsequent ResizeObserver ticks must not start another card animation.
    function sidebarChanged() {
      if (!shell || !main || window.innerWidth <= 800) return;
      const hidden = shell.classList.contains("sidebar-hidden");
      if (hidden === sidebarHidden) return;
      sidebarHidden = hidden;
      const currentMargin = parseFloat(getComputedStyle(main).marginLeft);
      const sidebar = shell.querySelector<HTMLElement>(":scope > .sidebar");
      const target =
        hidden || !sidebar ? 0 : parseFloat(getComputedStyle(sidebar).width);
      const mainStyle = getComputedStyle(view.parentElement!);
      sidebarMoving = Math.abs(currentMargin - target) > 0.1;
      sidebarWidthMotion = sidebarMoving
        ? { from: shownCardPixels, start: currentMargin, end: target }
        : undefined;
      // clientWidth rounds each intermediate transition width. Derive the exact
      // destination from the shell instead, so a subpixel cannot drop a column.
      availableWidth =
        shell.clientWidth -
        target -
        parseFloat(mainStyle.paddingLeft) -
        parseFloat(mainStyle.paddingRight);
      fit(initialized, true);
    }
    function sidebarFinished(event: TransitionEvent) {
      if (event.target !== main || event.propertyName !== "margin-left") return;
      sidebarMoving = false;
      measure();
    }
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(view);
    observer.observe(content);
    observer.observe(rail);
    const unsubscribe = subscribe(paint);
    const sidebarObserver = new MutationObserver(sidebarChanged);
    if (shell)
      sidebarObserver.observe(shell, {
        attributes: true,
        attributeFilter: ["class"],
      });
    main?.addEventListener("transitionend", sidebarFinished);
    initialized = true;
    view.addEventListener("scroll", updateScrollbar, { passive: true });
    rail.addEventListener("scroll", scrollNotes, { passive: true });
    // Finish presentation geometry before sortable's interaction sensors run.
    function finishMotion() {
      cancelReflow();
      cancelAnimationFrame(widthFrame);
      widthFrame = 0;
      widthTime = 0;
      sidebarWidthMotion = undefined;
      shownCardPixels = targetCardPixels;
      delete content.dataset.widthAnimating;
      applyWidth();
    }
    view.addEventListener("pointerdown", finishMotion, true);
    view.addEventListener("keydown", finishMotion, true);
    return () => {
      observer.disconnect();
      sidebarObserver.disconnect();
      main?.removeEventListener("transitionend", sidebarFinished);
      window.clearTimeout(fitTimer);
      cancelReflow();
      cancelAnimationFrame(widthFrame);
      delete content.dataset.widthAnimating;
      if (previousSidebarWidth)
        shell?.style.setProperty(
          "--workspace-sidebar-width",
          previousSidebarWidth,
          previousSidebarPriority,
        );
      else shell?.style.removeProperty("--workspace-sidebar-width");
      unsubscribe();
      view.removeEventListener("scroll", updateScrollbar);
      rail.removeEventListener("scroll", scrollNotes);
      view.removeEventListener("pointerdown", finishMotion, true);
      view.removeEventListener("keydown", finishMotion, true);
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
          <div ref={layer} className="notes-zoom-layer" data-layout={mode}>
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
