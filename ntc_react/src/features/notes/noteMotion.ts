function cardFor(id: string | number) {
  return document.querySelector<HTMLElement>(
    `[data-testid="${CSS.escape(`note-${id}`)}"]`,
  );
}

export function captureNoteLayout() {
  return new Map(
    [...document.querySelectorAll<HTMLElement>(".note-card")].map((node) => [
      node.dataset.testid!,
      node.getBoundingClientRect(),
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
    const from = before.get(node.dataset.testid!);
    if (!from) continue;
    const to = destinations[index];
    const scale =
      parseFloat(getComputedStyle(node).getPropertyValue("--notes-scale")) || 1;
    const x = (from.x - to.x) / scale,
      y = (from.y - to.y) / scale;
    if (Math.hypot(x, y) < 1) continue;
    const animation = node.animate(
      [
        { transform: `translate3d(${x}px, ${y}px, 0)` },
        { transform: "translate3d(0, 0, 0)" },
      ],
      {
        duration: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? 0
          : 220,
        easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
      },
    );
    animation.id = "note-drop";
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
