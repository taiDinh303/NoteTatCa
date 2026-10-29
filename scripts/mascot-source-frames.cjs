// Partition complete source at transparent gutters. No masks or part assembly.
function mascotSourceFrames(data, width, height) {
  if (data.length !== width * height * 4) throw Error("Invalid RGBA source");
  function cuts(count, horizontal, start, end) {
    const length = horizontal ? width : height;
    const result = [0];
    for (let i = 1; i < count; i++) {
      const nominal = (length * i) / count;
      let best = -1;
      for (
        let p = Math.ceil(nominal - (length / count) * 0.28);
        p <= Math.floor(nominal + (length / count) * 0.28);
        p++
      ) {
        let clear = true;
        for (let a = p - 2; a <= p + 1 && clear; a++)
          for (let b = start; b < end; b++) {
            const x = horizontal ? a : b,
              y = horizontal ? b : a;
            if (data[(y * width + x) * 4 + 3] > 8) {
              clear = false;
              break;
            }
          }
        if (
          clear &&
          (best < 0 || Math.abs(p - nominal) < Math.abs(best - nominal))
        )
          best = p;
      }
      if (best < 0)
        throw Error(
          `No clear ${horizontal ? "column" : "row"} gutter ${i}; redraw with more padding`,
        );
      result.push(best);
    }
    return [...result, length];
  }
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (
        (x < 2 || x >= width - 2 || y < 2 || y >= height - 2) &&
        data[(y * width + x) * 4 + 3] > 96
      )
        throw Error(
          "Visible character touches outer source edge; redraw with more padding",
        );
  try {
    const rows = cuts(3, false, 0, width),
      frames = [];
    for (let row = 0; row < 3; row++) {
      const columns = cuts(6, true, rows[row], rows[row + 1]);
      for (let col = 0; col < 6; col++)
        frames.push({
          x: columns[col],
          y: rows[row],
          w: columns[col + 1] - columns[col],
          h: rows[row + 1] - rows[row],
        });
    }
    return frames;
  } catch (rowError) {
    // Staggered hair/hats can require a separate horizontal cut per column.
    try {
      const columns = cuts(6, true, 0, height),
        frames = [];
      for (let col = 0; col < 6; col++) {
        const rows = cuts(3, false, columns[col], columns[col + 1]);
        for (let row = 0; row < 3; row++)
          frames[row * 6 + col] = {
            x: columns[col],
            y: rows[row],
            w: columns[col + 1] - columns[col],
            h: rows[row + 1] - rows[row],
          };
      }
      return frames;
    } catch (columnError) {
      try {
        return componentFrames(data, width, height);
      } catch (error) {
        throw Error(
          rowError.message + "; " + columnError.message + "; " + error.message,
        );
      }
    }
  }
}
function componentFrames(data, width, height) {
  const seen = new Uint8Array(width * height),
    groups = [];
  for (let start = 0; start < seen.length; start++) {
    if (seen[start] || data[start * 4 + 3] <= 96) continue;
    const pixels = [start];
    seen[start] = 1;
    let left = width,
      right = 0,
      top = height,
      bottom = 0;
    for (let i = 0; i < pixels.length; i++) {
      const p = pixels[i],
        x = p % width,
        y = Math.floor(p / width);
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx,
            ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const q = ny * width + nx;
          if (!seen[q] && data[q * 4 + 3] > 96) {
            seen[q] = 1;
            pixels.push(q);
          }
        }
    }
    groups.push({
      left,
      right: right + 1,
      top,
      bottom: bottom + 1,
      area: pixels.length,
    });
  }
  groups.sort((a, b) => b.area - a.area);
  const seeds = groups.slice(0, 18),
    median = seeds.map((g) => g.area).sort((a, b) => a - b)[9];
  if (
    seeds.length !== 18 ||
    seeds.some(
      (g) =>
        g.area < median * 0.4 ||
        g.right - g.left > (width / 6) * 1.4 ||
        g.bottom - g.top > (height / 3) * 1.4,
    )
  )
    throw Error("Need 18 distinct whole characters with clear spacing");
  seeds.sort((a, b) => a.top + a.bottom - (b.top + b.bottom));
  const ordered = [];
  for (let row = 0; row < 3; row++)
    ordered.push(
      ...seeds
        .slice(row * 6, row * 6 + 6)
        .sort((a, b) => a.left + a.right - b.left - b.right),
    );
  const boxes = ordered.map((g) => ({ ...g }));
  for (const g of groups.slice(18)) {
    let index = 0,
      distance = Infinity;
    for (let i = 0; i < 18; i++) {
      const b = ordered[i],
        dx = ((g.left + g.right - b.left - b.right) / width) * 3,
        dy = ((g.top + g.bottom - b.top - b.bottom) / height) * 1.5;
      const d = dx * dx + dy * dy;
      if (d < distance) {
        distance = d;
        index = i;
      }
    }
    const b = boxes[index];
    b.left = Math.min(b.left, g.left);
    b.right = Math.max(b.right, g.right);
    b.top = Math.min(b.top, g.top);
    b.bottom = Math.max(b.bottom, g.bottom);
  }
  const frames = boxes.map((b) => ({
    x: Math.max(0, b.left - 1),
    y: Math.max(0, b.top - 1),
    w: Math.min(width, b.right + 1) - Math.max(0, b.left - 1),
    h: Math.min(height, b.bottom + 1) - Math.max(0, b.top - 1),
  }));
  const coverage = new Uint8Array(width * height);
  for (const f of frames)
    for (let y = f.y; y < f.y + f.h; y++)
      for (let x = f.x; x < f.x + f.w; x++) coverage[y * width + x]++;
  for (let p = 0; p < coverage.length; p++)
    if (data[p * 4 + 3] > 96 && coverage[p] !== 1)
      throw Error(
        "Whole-frame rectangles intersect visible artwork; redraw required",
      );
  return frames;
}
module.exports = { mascotSourceFrames };
