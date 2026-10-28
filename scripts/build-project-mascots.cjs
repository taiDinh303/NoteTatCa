/* Pack generated artwork into the existing 3x3 runtime format.
 * Run from the repository root: node scripts/build-project-mascots.cjs
 * Requires sharp and @napi-rs/canvas (available in the workspace image runtime).
 * No generation/network requests: inputs and per-frame anchors are retained.
 */
const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const root = path.resolve(__dirname, "..");
const source = path.join(root, "assets/mascots/ntc-v1");
const output = path.join(root, "ntc_react/public/mascots/ntc-v1");
const outputFor = (_name) => path.join(root, "ntc_react/public/mascots/ntc-v3");
const originalNames = [
  "cat",
  "fox",
  "owl",
  "bear",
  "bunny",
  "otter",
  "notebook",
  "paper",
];
const names = [
  ...originalNames,
  ...fs
    .readdirSync(source)
    .filter((name) => name.endsWith(".png") && name !== "preview.png")
    .map((name) => name.slice(0, -4))
    .filter((name) => !originalNames.includes(name))
    .sort(),
];
const TILE = 320,
  JOIN = 244,
  BASE = 300,
  BODY_WIDTH = 184;

function cleanCell(canvas, strictEdges) {
  const c = canvas.getContext("2d"),
    w = canvas.width,
    h = canvas.height;
  const image = c.getImageData(0, 0, w, h),
    data = image.data;
  const seen = new Uint8Array(w * h),
    groups = [];
  for (let start = 0; start < seen.length; start++) {
    if (seen[start] || data[start * 4 + 3] < 32) continue;
    const group = [start];
    seen[start] = 1;
    let top = h,
      bottom = -1,
      left = w,
      right = -1;
    for (let n = 0; n < group.length; n++) {
      const p = group[n],
        x = p % w,
        y = Math.floor(p / w);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
      left = Math.min(left, x);
      right = Math.max(right, x);
      for (const q of [
        x > 0 ? p - 1 : -1,
        x < w - 1 ? p + 1 : -1,
        y > 0 ? p - w : -1,
        y < h - 1 ? p + w : -1,
      ]) {
        if (q < 0 || seen[q] || data[q * 4 + 3] < 32) continue;
        seen[q] = 1;
        group.push(q);
      }
    }
    groups.push({ pixels: group, top, bottom, left, right });
  }
  groups.sort((a, b) => b.pixels.length - a.pixels.length);
  const keep = new Uint8Array(w * h);
  for (const [i, group] of groups.entries()) {
    // Small edge strips are fragments from the adjacent generated grid row.
    if (
      i &&
      (group.pixels.length < 60 ||
        (strictEdges &&
          (group.left === 0 ||
            group.right === w - 1 ||
            group.top === 0 ||
            group.bottom === h - 1)) ||
        ((group.top === 0 || group.bottom === h - 1) &&
          group.bottom - group.top < h * 0.15))
    )
      continue;
    for (const p of group.pixels) keep[p] = 1;
  }
  for (let p = 0; p < keep.length; p++)
    if (!keep[p]) data.fill(0, p * 4, p * 4 + 4);
  c.putImageData(image, 0, 0);
}

function bounds(data, width, height, start = 0, end = height) {
  let left = width,
    top = height,
    right = -1,
    bottom = -1;
  for (let y = start; y < end; y++)
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] < 96) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  if (right < left) throw new Error("Empty artwork");
  return {
    left,
    top,
    right,
    bottom,
    width: right - left + 1,
    height: bottom - top + 1,
  };
}

function anchor(canvas) {
  const { width: w, height: h } = canvas;
  const pixels = canvas.getContext("2d").getImageData(0, 0, w, h).data;
  // Ignore detached expression symbols: the chest must meet the central column.
  let floor = h - 1;
  for (; floor > 0; floor--) {
    let n = 0;
    for (let x = Math.floor(w * 0.35); x < w * 0.65; x++)
      if (pixels[(floor * w + x) * 4 + 3] > 128) n++;
    if (n >= w * 0.16) break;
  }
  let best;
  for (let y = Math.round(floor - h * 0.27); y <= floor - h * 0.075; y++) {
    let left = w,
      right = -1;
    for (let x = Math.floor(w * 0.15); x < w * 0.85; x++) {
      if (pixels[(y * w + x) * 4 + 3] > 128) {
        left = Math.min(left, x);
        right = Math.max(right, x);
      }
    }
    const span = right - left + 1;
    if (span > w * 0.16 && (!best || span < best.span))
      best = { y, left, right, span };
  }
  if (!best) throw new Error("Missing neck anchor");
  return {
    neck: best.y,
    neckWidth: best.span,
    cx: (best.left + best.right) / 2,
    floor,
    head: bounds(pixels, w, h, 0, best.y),
    torso: bounds(pixels, w, h, best.y, floor + 1),
  };
}

async function pack(name) {
  fs.mkdirSync(outputFor(name), { recursive: true });
  const image = await loadImage(path.join(source, name + ".png"));
  const cells = [];
  // The left 3x3 contains directions, the right 3x3 contains reactions.
  for (let kind = 0; kind < 2; kind++)
    for (let i = 0; i < 9; i++) {
      const col = (i % 3) + kind * 3,
        row = Math.floor(i / 3);
      const x = Math.round((col * image.width) / 6),
        y = Math.round((row * image.height) / 3);
      const w = Math.round(((col + 1) * image.width) / 6) - x;
      const h = Math.round(((row + 1) * image.height) / 3) - y;
      const cell = createCanvas(w, h);
      cell.getContext("2d").drawImage(image, x, y, w, h, 0, 0, w, h);
      cleanCell(cell, !originalNames.includes(name) || name === "paper");
      cells.push({ canvas: cell, anchor: anchor(cell) });
    }
  const neutral = cells[4],
    a = neutral.anchor,
    b = a.torso;
  const body = createCanvas(TILE, TILE),
    ctx = body.getContext("2d");
  ctx.drawImage(
    neutral.canvas,
    b.left,
    a.neck,
    b.width,
    a.floor - a.neck + 1,
    TILE / 2 - ((a.cx - b.left) * BODY_WIDTH) / b.width,
    JOIN,
    BODY_WIDTH,
    BASE - JOIN,
  );
  // One scale per character: head turns do not zoom the head in/out.
  const scale = Math.min(
    BODY_WIDTH / b.width,
    ...cells.map(({ anchor: p }) =>
      Math.min(
        (TILE * 0.5 - 14) /
          Math.max(p.cx - p.head.left, p.head.right - p.cx + 1),
        (JOIN - 16) / (p.neck - p.head.top),
      ),
    ),
  );
  const frames = cells.map(({ canvas, anchor: p }) => {
    const frame = createCanvas(TILE, TILE),
      c = frame.getContext("2d");
    const sx = Math.min(
      ((BODY_WIDTH / b.width) * a.neckWidth) / p.neckWidth,
      (TILE * 0.5 - 14) / Math.max(p.cx - p.head.left, p.head.right - p.cx + 1),
    );
    c.drawImage(body, 0, 0);
    c.save();
    c.beginPath();
    c.rect(0, 0, TILE, JOIN + 32);
    c.clip();
    c.drawImage(
      canvas,
      TILE / 2 - p.cx * sx,
      JOIN - p.neck * scale,
      canvas.width * sx,
      canvas.height * scale,
    );
    c.restore();
    // The same torso pixels in all 18 frames. This deliberately cannot drift.
    for (let y = JOIN; y < JOIN + 32; y++) {
      c.globalAlpha = (y - JOIN) / 31;
      c.drawImage(body, 0, y, TILE, 1, 0, y, TILE, 1);
    }
    c.globalAlpha = 1;
    c.drawImage(
      body,
      0,
      JOIN + 32,
      TILE,
      TILE - JOIN - 32,
      0,
      JOIN + 32,
      TILE,
      TILE - JOIN - 32,
    );
    return frame;
  });
  for (let kind = 0; kind < 2; kind++) {
    const atlas = createCanvas(TILE * 3, TILE * 3),
      c = atlas.getContext("2d");
    for (let i = 0; i < 9; i++)
      c.drawImage(
        frames[kind * 9 + i],
        (i % 3) * TILE,
        Math.floor(i / 3) * TILE,
      );
    // Lossless keeps the shared torso pixel-identical across atlas cells.
    const { data, info } = await sharp(atlas.toBuffer("image/png"))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    for (let i = 0; i < data.length; i += 4)
      if (data[i + 3] === 0) data.fill(0, i, i + 3);
    await sharp(data, {
      raw: { width: info.width, height: info.height, channels: 4 },
    })
      .webp({ lossless: true })
      .toFile(
        path.join(
          outputFor(name),
          `${name}-${kind ? "reactions" : "directions"}.webp`,
        ),
      );
  }
  return {
    name,
    headScale: scale,
    anchors: cells.map(({ anchor: p }) => ({
      neck: p.neck,
      cx: p.cx,
      floor: p.floor,
    })),
  };
}

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const details = [];
  for (const name of names) {
    details.push(await pack(name));
    console.log("Packed " + name);
  }
  fs.writeFileSync(
    path.join(source, "geometry.json"),
    JSON.stringify(
      {
        tile: TILE,
        shoulderLine: JOIN,
        baseline: BASE,
        bodyWidth: BODY_WIDTH,
        details,
      },
      null,
      2,
    ) + "\n",
  );
  const previews = [];
  for (let i = 0; i < names.length; i++) {
    const label = createCanvas(180, 180),
      labelContext = label.getContext("2d");
    labelContext.font = "14px sans-serif";
    labelContext.fillStyle = "#56616f";
    labelContext.textAlign = "center";
    labelContext.fillText(names[i], 90, 175);
    previews.push({
      input: await sharp(
        path.join(outputFor(names[i]), names[i] + "-directions.webp"),
      )
        .extract({ left: TILE, top: TILE, width: TILE, height: TILE })
        .resize(160, 160)
        .png()
        .toBuffer(),
      left: (i % 6) * 180 + 10,
      top: Math.floor(i / 6) * 180,
    });
    previews.push({
      input: label.toBuffer("image/png"),
      left: (i % 6) * 180,
      top: Math.floor(i / 6) * 180,
    });
  }
  await sharp({
    create: {
      width: 1080,
      height: Math.ceil(names.length / 6) * 180,
      channels: 4,
      background: "#f7f7fb",
    },
  })
    .composite(previews)
    .png()
    .toFile(path.join(source, "preview.png"));
  await sharp(path.join(outputFor("paper"), "paper-directions.webp"))
    .extract({ left: TILE, top: TILE, width: TILE, height: TILE })
    .webp({ lossless: true })
    .toFile(path.join(source, "paper-preview-v3.webp"));
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
