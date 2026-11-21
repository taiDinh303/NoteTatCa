function cardFor(id: string | number) {
  return document.querySelector<HTMLElement>(
    `[data-testid="${CSS.escape(`note-${id}`)}"]`,
  );
}

export function captureNoteLayout() {
  return new Map(
    [...document.querySelectorAll<HTMLElement>(".note-card")].map((node) => [
      node.dataset.testid!,
      {
        rect: node.getBoundingClientRect(),
        dragging: node.classList.contains("dragging"),
      },
    ]),
  );
}

export function animateNoteLayout(
  before: ReturnType<typeof captureNoteLayout>,
) {
  const nodes = [...document.querySelectorAll<HTMLElement>(".note-card")];
  nodes.forEach((node) => cancelNoteDrop(node.dataset.testid!.slice(5)));
  const destinations = nodes.map((node) => node.getBoundingClientRect());
  for (const [index, node] of nodes.entries()) {
    const captured = before.get(node.dataset.testid!);
    if (!captured) continue;
    const from = captured.rect;
    const to = destinations[index];
    const scale =
      parseFloat(getComputedStyle(node).getPropertyValue("--notes-scale")) || 1;
    const x = (from.x - to.x) / scale,
      y = (from.y - to.y) / scale;
    const resized =
      Math.abs(from.width - to.width) > 1 ||
      Math.abs(from.height - to.height) > 1;
    if (Math.hypot(x, y) < 1 && !resized) continue;
    // FLIP with a GPU-composited transform only. After React's commit the card
    // already has its new size (grid <-> list), so the text reflows exactly
    // once; animating width/height would instead rewrap the text on every
    // frame and read as "chảy chữ". A brief opacity hold on resized cards
    // keeps the reflowed text hidden until the size/position has essentially
    // settled (≈60% of the 220ms), then fades it back in — the card morphs
    // smoothly without the user seeing text reflow mid-move.
    const animation = node.animate(
      [
        {
          transform: `translate3d(${x}px, ${y}px, 0)`,
          opacity: resized ? 0.5 : 1,
          offset: 0,
        },
        {
          opacity: resized ? 0.5 : 1,
          offset: 0.6,
        },
        {
          transform: "translate3d(0, 0, 0)",
          opacity: 1,
        },
      ],
      {
        duration: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? 0
          : 220,
        easing: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
    );
    animation.id = "note-drop";
    if (captured.dragging) {
      node.dataset.dropping = "true";
      void animation.finished
        .catch(() => {})
        .finally(() => {
          if (
            !node.getAnimations().some((current) => current.id === "note-drop")
          )
            delete node.dataset.dropping;
        });
    }
  }
}

export function cancelNoteDrop(id: string | number) {
  cardFor(id)
    ?.getAnimations()
    .filter((animation) => animation.id === "note-drop")
    .forEach((animation) => animation.cancel());
}

// FLIP only the released card. The sortable hook animates its neighbours.
// Measuring after React's commit keeps the existing optimistic order/save flow.
export function animateNoteDrop(id: string | number) {
  const node = cardFor(id);
  if (!node) return;
  const from = node.getBoundingClientRect();
  requestAnimationFrame(() => {
    if (!node.isConnected || node.classList.contains("dragging")) return;
    const to = node.getBoundingClientRect();
    const zoom =
      parseFloat(getComputedStyle(node).getPropertyValue("--notes-scale")) || 1;
    const x = (from.x - to.x) / zoom;
    const y = (from.y - to.y) / zoom;
    if (Math.hypot(x, y) < 1) return;
    cancelNoteDrop(id);
    const animation = node.animate(
      [
        { transform: `translate3d(${x}px, ${y}px, 0)` },
        { transform: "translate3d(0, 0, 0)" },
      ],
      {
        duration: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? 140
          : 220,
        easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
      },
    );
    animation.id = "note-drop";
    node.dataset.dropping = "true";
    void animation.finished
      .catch(() => {})
      .finally(() => {
        if (
          !node.getAnimations().some((current) => current.id === "note-drop")
        ) {
          delete node.dataset.dropping;
        }
      });
  });
}
