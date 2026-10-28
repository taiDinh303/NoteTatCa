/** Measure the character, excluding detached symbols and neighbouring-cell specks.
 * Measurement only: never changes any sprite pixels or separates head/body art.
 */
export function mascotBodyAnchor(
  data: Uint8ClampedArray,
  width: number,
  height: number,
) {
  const seen = new Uint8Array(width * height);
  const groups: {
    area: number;
    left: number;
    right: number;
    top: number;
    bottom: number;
    pixels: number[];
  }[] = [];
  for (let start = 0; start < seen.length; start++) {
    if (seen[start] || data[start * 4 + 3] <= 96) continue;
    const queue = [start];
    seen[start] = 1;
    let left = width,
      right = 0,
      top = height,
      bottom = 0;
    for (let i = 0; i < queue.length; i++) {
      const p = queue[i],
        x = p % width,
        y = Math.floor(p / width);
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
      for (const q of [
        x ? p - 1 : -1,
        x + 1 < width ? p + 1 : -1,
        y ? p - width : -1,
        y + 1 < height ? p + width : -1,
      ]) {
        if (q < 0 || seen[q] || data[q * 4 + 3] <= 96) continue;
        seen[q] = 1;
        queue.push(q);
      }
    }
    groups.push({
      area: queue.length,
      left,
      right,
      top,
      bottom,
      pixels: queue,
    });
  }
  groups.sort((a, b) => b.area - a.area);
  const main = groups[0];
  if (!main) return { floor: 1, center: 0.5, width: 0 };
  const cx = (main.left + main.right) / 2;
  // Some robot drawings have a real gap at the neck. Include their substantial
  // lower chest component, but never tiny detached decorative fragments.
  const bodies = groups.filter(
    (g) =>
      g.area >= main.area * 0.12 &&
      Math.abs((g.left + g.right) / 2 - cx) < width * 0.2 &&
      g.top <= main.bottom + height * 0.15 &&
      g.right - g.left >= width * 0.1,
  );
  const bottom = Math.max(main.bottom, ...bodies.map((g) => g.bottom));
  const top = Math.min(main.top, ...bodies.map((g) => g.top));
  // Use occupied height, so transparent headroom and atlas resolution cannot
  // move the measuring band up into the jaw or change the inferred chest size.
  const chestBand = (bottom - top + 1) * 0.08;
  const rows = new Map<number, { left: number; right: number }>();
  for (const g of new Set([main, ...bodies]))
    for (const p of g.pixels) {
      const y = Math.floor(p / width),
        x = p % width;
      if (y < bottom - chestBand) continue;
      const row = rows.get(y) ?? { left: width, right: -1 };
      row.left = Math.min(row.left, x);
      row.right = Math.max(row.right, x);
      rows.set(y, row);
    }
  const solid = [...rows.values()].filter(
    (r) => r.right - r.left >= width * 0.15,
  );
  const center = solid.length
    ? solid.reduce((sum, r) => sum + (r.left + r.right + 1) / 2, 0) /
      solid.length
    : cx;
  const chestWidth = solid.length
    ? Math.max(...solid.map((r) => r.right - r.left + 1))
    : 0;
  return {
    floor: (bottom + 1) / height,
    center: center / width,
    width: chestWidth / width,
  };
}

export function mascotBodyFloor(
  data: Uint8ClampedArray,
  width: number,
  height: number,
) {
  return mascotBodyAnchor(data, width, height).floor;
}
