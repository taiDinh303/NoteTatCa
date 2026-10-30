import { useLayoutEffect, useRef, type ReactNode } from "react";
import { useDisplayZoom } from "../../shared/displayZoom";
import { t as tr } from "../../shared/i18n";
import { desktopNoteWidth, DESKTOP_NOTE_GAP } from "../../shared/workspaceGrid";
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
    let listSettleTimer = 0;
    let availableWidth = 0;
    let rightInset = 0;
    let cardWidth = 320;
    let gap = 20;
    const reflowAnimations = new Set<Animation>();
    const frozenGrids = new Set<HTMLElement>();
    let scale = 1,
      width = 0,
      height = 0;
    let sidebarMoving = false;
    let sidebarHidden = view
      .closest(".customer-shell")
      ?.classList.contains("sidebar-hidden");
    const shell = view.closest<HTMLElement>(".customer-shell");
    const main = shell?.querySelector<HTMLElement>(":scope > .main-column");
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
      releaseGrids();
    }
    function releaseGrids() {
      frozenGrids.forEach((grid) => {
        grid.style.gridTemplateRows = "";
      });
      frozenGrids.clear();
    }
    function fitWidth(nextScale: number) {
      // At half scale the next complete column needs half a gap more room.
      // Borrow that from the existing right inset, keeping card/gap unchanged.
      const allowance =
        mode !== "list" && window.innerWidth > 800 && nextScale <= 0.50001
          ? Math.min(gap / 2, Math.max(0, rightInset - 12))
          : 0;
      return availableWidth + allowance;
    }
    function columnsFor(nextScale: number) {
      return mode === "list"
        ? 1
        : Math.max(
            1,
            Math.floor(
              (fitWidth(nextScale) / nextScale + gap + 0.01) /
                (cardWidth + gap),
            ),
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
    function fit(animate = false, resizeOnly = false, sidebar = false) {
      window.clearTimeout(fitTimer);
      // Do not change sortable geometry underneath a pointer/keyboard drag.
      if (content.querySelector(".dragging")) {
        fitTimer = window.setTimeout(() => fit(animate, resizeOnly), 100);
        return;
      }
      const columns = columnsFor(scale);
      const fittedWidth = fitWidth(scale);
      view.style.paddingRight = `${rightInset - (fittedWidth - availableWidth)}px`;
      const nextWidth =
        mode === "list"
          ? fittedWidth / scale
          : Math.min(
              fittedWidth / scale,
              columns * cardWidth + (columns - 1) * gap,
            );
      const tracksChanged =
        content.style.getPropertyValue("--notes-card-width") !==
          `${cardWidth}px` ||
        content.style.getPropertyValue("--notes-gap") !== `${gap}px`;
      if (
        !tracksChanged &&
        Math.abs(nextWidth - width) < 0.01 &&
        content.style.getPropertyValue("--notes-columns") === String(columns)
      ) {
        return;
      }
      // Fixed card/gap tracks keep their geometry until a column boundary is
      // crossed. Do not measure or restart card motion on each resize tick.
      if (
        !tracksChanged &&
        ((mode === "list" && resizeOnly) || mode !== "list") &&
        content.style.getPropertyValue("--notes-columns") === String(columns)
      ) {
        const clamped = width < cardWidth || nextWidth < cardWidth;
        width = nextWidth;
        content.style.width = `${width}px`;
        space.style.width = `${fitWidth(scale)}px`;
        if (mode === "list" || clamped) {
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
      width = nextWidth;
      content.style.width = `${width}px`;
      content.style.setProperty("--notes-columns", String(columns));
      content.style.setProperty("--notes-card-width", `${cardWidth}px`);
      content.style.setProperty("--notes-gap", `${gap}px`);
      height = content.offsetHeight;
      space.style.width = `${fitWidth(scale)}px`;
      space.style.height = `${height * scale}px`;
      view.scrollLeft = 0;
      updateScrollbar();
      if (!animate || matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return;
      }
      // Keep destination rows stable while cards move; List can also resize.
      // Avoid scaling text or moving subsequent rows twice.
      const afterBoxes = nodes.map((node) => node.getBoundingClientRect());
      content.querySelectorAll<HTMLElement>(".note-grid").forEach((grid) => {
        grid.style.gridTemplateRows = getComputedStyle(grid).gridTemplateRows;
        frozenGrids.add(grid);
      });
      const sidebarTransition = sidebar ? sidebarClock() : undefined;
      const sidebarDuration = sidebarTransition?.effect?.getTiming().duration;
      nodes.forEach((node, index) => {
        const after = afterBoxes[index];
        if (!after.width || !after.height) return;
        const x = (before[index].left - after.left) / scale;
        const y = (before[index].top - after.top) / scale;
        if (
          Math.hypot(x, y) < 1 &&
          (mode !== "list" ||
            (Math.abs(before[index].width - after.width) < 1 &&
              Math.abs(before[index].height - after.height) < 1))
        )
          return;
        const animation = node.animate(
          [
            {
              transform: `translate3d(${x}px, ${y}px, 0)`,
              ...(mode === "list"
                ? { width: `${before[index].width / scale}px` }
                : {}),
              ...(mode === "list"
                ? { height: `${before[index].height / scale}px` }
                : {}),
            },
            {
              transform: "translate3d(0, 0, 0)",
              ...(mode === "list" ? { width: `${after.width / scale}px` } : {}),
              ...(mode === "list"
                ? { height: `${after.height / scale}px` }
                : {}),
            },
          ],
          {
            duration: sidebar
              ? typeof sidebarDuration === "number"
                ? sidebarDuration
                : 160
              : 240,
            easing: sidebar
              ? "cubic-bezier(.2,0,0,1)"
              : "cubic-bezier(.4,0,.2,1)",
          },
        );
        // CSS shortens a reversed transition. Share its actual clock as well
        // as its curve so a rapid reversal cannot leave a second animation tail.
        shareClock(animation, sidebarTransition);
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
      if (mode === "list" && next !== scale) {
        window.clearTimeout(listSettleTimer);
        // Capture the painted width before interrupting a previous settle.
        if (content.style.transition && content.style.transition !== "none") {
          width = content.getBoundingClientRect().width / scale;
          content.style.transition = "none";
          content.style.width = `${width}px`;
        }
      }
      if (next !== scale) window.clearTimeout(fitTimer);
      scale = next;
      content.style.transform = `scale(${scale})`;
      content.style.setProperty("--notes-scale", String(scale));
      space.style.width = `${fitWidth(scale)}px`;
      space.style.height = `${height * scale}px`;
      // Zoom grows from the top-left. Keep the scroll offset instead of
      // moving toward the pointer and hiding the start of the notes.
      view.scrollLeft = 0;
      // Reflow as soon as a column boundary is crossed, rather than waiting
      // for the zoom gesture and easing tail to stop in two separate phases.
      if (mode !== "list") fit(initialized);
      else if (!initialized) fit(false);
      else if (settled) {
        window.clearTimeout(listSettleTimer);
        listSettleTimer = window.setTimeout(() => {
          content.style.transition = matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "none" : "width 180ms cubic-bezier(0.2, 0, 0, 1)";
          fit(false);
        }, 100);
      }
      updateScrollbar();
    }
    function measure() {
      // Extend only the scrollport to the window edge. Keep the card canvas
      // inside the main column's existing responsive right inset.
      const inset = getComputedStyle(view.parentElement!).paddingRight;
      rightInset = parseFloat(inset);
      view.style.setProperty("--notes-edge-inset", inset);
      // At 100%, closing navigation adds exactly one complete column. Card
      // width, gap and sidebar width stay fixed during zoom and toggles.
      const desktop = window.innerWidth > 800;
      const mainStyle = getComputedStyle(view.parentElement!);
      const fullWidth =
        (shell?.clientWidth ?? window.innerWidth) -
        parseFloat(mainStyle.paddingLeft) -
        parseFloat(mainStyle.paddingRight);
      gap = desktop ? DESKTOP_NOTE_GAP : 16;
      const fullColumns = desktop
        ? Math.max(3, Math.round((fullWidth + gap) / (300 + gap)))
        : Math.max(1, Math.round((fullWidth + gap) / (300 + gap)));
      const nextCardWidth = desktop
        ? desktopNoteWidth(fullWidth)
        : window.innerWidth < 600
          ? Math.max(1, fullWidth - gap)
          : (fullWidth - (fullColumns - 1) * gap) / fullColumns;
      const tracksChanged = Math.abs(nextCardWidth - cardWidth) > 0.01;
      cardWidth = nextCardWidth;
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
        fit(initialized, true);
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
      // clientWidth rounds each intermediate transition width. Derive the exact
      // destination from the shell instead, so a subpixel cannot drop a column.
      availableWidth =
        shell.clientWidth -
        target -
        parseFloat(mainStyle.paddingLeft) -
        parseFloat(mainStyle.paddingRight);
      fit(initialized, true, true);
    }
    function sidebarFinished(event: TransitionEvent) {
      if (event.target !== main || event.propertyName !== "margin-left") return;
      sidebarMoving = false;
      measure();
    }
    measure();
    let resizeFrame = 0;
    const observer = new ResizeObserver(() => {
      if (mode !== "list") measure();
      else if (!resizeFrame) resizeFrame = requestAnimationFrame(() => {
        resizeFrame = 0;
        measure();
      });
    });
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
    // Release presentation transforms before sortable's interaction sensors run.
    view.addEventListener("pointerdown", cancelReflow, true);
    view.addEventListener("keydown", cancelReflow, true);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(resizeFrame);
      sidebarObserver.disconnect();
      main?.removeEventListener("transitionend", sidebarFinished);
      window.clearTimeout(fitTimer);
      window.clearTimeout(listSettleTimer);
      content.style.removeProperty("transition");
      cancelReflow();
      unsubscribe();
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
