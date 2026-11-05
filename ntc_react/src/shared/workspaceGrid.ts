export const DESKTOP_NOTE_GAP = 20;

export function desktopNoteWidth(fullWidth: number) {
  const columns = Math.max(
    3,
    Math.round((fullWidth + DESKTOP_NOTE_GAP) / (300 + DESKTOP_NOTE_GAP)),
  );
  return (fullWidth - (columns - 1) * DESKTOP_NOTE_GAP) / columns;
}

// Choose once per viewport, never per zoom/sidebar state. Minimize the worst
// right-edge remainder over all six anchor layouts, with fixed 20px gaps.
export function desktopGridCardWidth(fullWidth: number) {
  const nominal = desktopNoteWidth(fullWidth);
  const pitch = nominal + DESKTOP_NOTE_GAP;
  const columns = Math.round((fullWidth + DESKTOP_NOTE_GAP) / pitch);
  const openWidth = fullWidth - pitch;
  const layouts = [fullWidth, openWidth].flatMap((width, index) =>
    [0.5, 1, 1.5].map(scale => ({
      width, scale,
      budget: width,
      expected: scale <= 1 ? (columns - index) / scale : undefined,
    })),
  );
  const candidates = new Set([nominal]);
  for (const { width, budget, scale } of layouts) {
    // Remainders decrease between whole-column boundaries. Include both the
    // normal inset target and the last safe width before a column is lost.
    for (let count = 1; count <= Math.ceil(fullWidth / (nominal * 0.4)); count++) {
      for (const edge of [width, budget - 0.125]) {
        const candidate = (edge / scale - (count - 1) * DESKTOP_NOTE_GAP) / count;
        if (candidate >= nominal * 0.85 && candidate <= nominal * 1.05)
          candidates.add(candidate);
      }
    }
  }
  let best = nominal;
  let bestWorst = Infinity;
  let bestTotal = Infinity;
  for (const candidate of candidates) {
    let worst = 0;
    let total = 0;
    let valid = true;
    for (const { width, budget, scale, expected } of layouts) {
      const count = Math.max(1, Math.floor(((budget + 0.01) / scale + DESKTOP_NOTE_GAP) / (candidate + DESKTOP_NOTE_GAP)));
      if (expected !== undefined && count !== expected) { valid = false; break; }
      const remainder = Math.abs(width - scale * (count * candidate + (count - 1) * DESKTOP_NOTE_GAP));
      worst = Math.max(worst, remainder);
      total += remainder * remainder;
    }
    if (valid && (worst < bestWorst - 0.001 || (Math.abs(worst - bestWorst) <= 0.001 && total < bestTotal))) {
      best = candidate;
      bestWorst = worst;
      bestTotal = total;
    }
  }
  return Math.max(1, best);
}
