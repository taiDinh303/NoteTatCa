/** Measure the character, excluding detached symbols and neighbouring-cell specks.
 * Measurement only: never changes any sprite pixels or separates head/body art.
 */
export function mascotBodyFloor(
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
    groups.push({ area: queue.length, left, right, top, bottom });
  }
  groups.sort((a, b) => b.area - a.area);
  const main = groups[0];
  if (!main) return 1;
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
  return (Math.max(main.bottom, ...bodies.map((g) => g.bottom)) + 1) / height;
}
