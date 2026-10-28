// Export whole source frames without splitting, warping or replacing artwork.
const fs = require("node:fs"),
  path = require("node:path"),
  sharp = require("sharp");
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const {
  mascotBodyAnchor,
} = require("../ntc_react/src/features/mascot/mascotBodyFloor.ts");
const root = path.resolve(__dirname, ".."),
  source = path.join(root, "assets/mascots/ntc-v5");
const output = path.join(root, "ntc_react/public/mascots/ntc-v5");
const rawSource = path.join(source, "raw");
const names = fs
  .readdirSync(rawSource)
  .filter((n) => n.endsWith(".png") && n !== "preview.png")
  .map((n) => n.slice(0, -4))
  .sort();
const TILE = 448,
  BASE = 384;
async function writeCanonical(name) {
  const data = Buffer.alloc(TILE * 6 * TILE * 3 * 4);
  for (let kind = 0; kind < 2; kind++) {
    const pixels = await sharp(
      path.join(
        output,
        name + "-" + (kind ? "reactions" : "directions") + ".webp",
      ),
    )
      .ensureAlpha()
      .raw()
      .toBuffer();
    for (let row = 0; row < TILE * 3; row++)
      pixels.copy(
        data,
        (row * TILE * 6 + kind * TILE * 3) * 4,
        row * TILE * 3 * 4,
        (row + 1) * TILE * 3 * 4,
      );
  }
  await sharp(data, { raw: { width: TILE * 6, height: TILE * 3, channels: 4 } })
    .webp({ lossless: true })
    .toFile(path.join(source, name + ".webp"));
}
async function pack(name) {
  const im = await loadImage(path.join(rawSource, name + ".png")),
    cells = [];
  const full = createCanvas(im.width, im.height);
  full.getContext("2d").drawImage(im, 0, 0);
  const allPixels = full
    .getContext("2d")
    .getImageData(0, 0, im.width, im.height).data;
  // Generated grids have real transparent gutters, but not necessarily at
  // exact sixths/thirds. Partition there, without masking any artwork pixels.
  function boundaries(count, horizontal, start = 0, end) {
    const length = horizontal ? im.width : im.height;
    const across = horizontal ? im.height : im.width;
    const result = [0];
    for (let k = 1; k < count; k++) {
      const nominal = (length * k) / count;
      let best = Math.round(nominal),
        minimum = Infinity;
      for (
        let p = Math.ceil(nominal - (length / count) * 0.15);
        p <= nominal + (length / count) * 0.15;
        p++
      ) {
        let occupied = 0;
        for (let q = start; q < (end ?? across); q++) {
          const x = horizontal ? p : q,
            y = horizontal ? q : p;
          if (allPixels[(y * im.width + x) * 4 + 3] > 96) occupied++;
        }
        if (
          occupied < minimum ||
          (occupied === minimum &&
            Math.abs(p - nominal) < Math.abs(best - nominal))
        ) {
          minimum = occupied;
          best = p;
        }
      }
      // Never deliberately cut a solid component to force an even grid.
      if (minimum > 0)
        console.warn(
          `${name}: no clear ${horizontal ? "column" : "row"} gutter ${k} (${minimum} pixels)`,
        );
      result.push(minimum === 0 ? best : Math.round(nominal));
    }
    return [...result, length];
  }
  const rows = boundaries(3, false),
    columns = rows
      .slice(0, -1)
      .map((start, row) => boundaries(6, true, start, rows[row + 1]));
  for (let kind = 0; kind < 2; kind++)
    for (let i = 0; i < 9; i++) {
      const col = (i % 3) + kind * 3,
        row = Math.floor(i / 3),
        x = columns[row][col],
        y = rows[row];
      const w = columns[row][col + 1] - x,
        h = rows[row + 1] - y;
      const canvas = createCanvas(w, h),
        c = canvas.getContext("2d");
      c.drawImage(im, x, y, w, h, 0, 0, w, h);
      const pixels = c.getImageData(0, 0, w, h).data;
      let left = w,
        right = -1,
        top = h,
        bottom = -1;
      for (let yy = 0; yy < h; yy++)
        for (let xx = 0; xx < w; xx++)
          if (pixels[(yy * w + xx) * 4 + 3] > 0) {
            left = Math.min(left, xx);
            right = Math.max(right, xx);
            top = Math.min(top, yy);
            bottom = Math.max(bottom, yy);
          }
      if (right < left) throw Error("Empty frame " + name + "/" + i);
      const anchor = mascotBodyAnchor(pixels, w, h);
      cells.push({ canvas, left, right, top, bottom, w, h, anchor, x, y });
    }
  // The same visible chest width for EVERY species. Never scale head/body
  // separately, and never let one large ear shrink that character's whole bust.
  let scale = 140 / (cells[4].anchor.width * cells[4].w);
  // Account for alpha-edge quantization after resampling. Use one final scale
  // for the entire character, never separate scales for its poses or parts.
  for (let attempt = 0; attempt < 4; attempt++) {
    const p = cells[4],
      probe = createCanvas(TILE, TILE),
      c = probe.getContext("2d");
    c.drawImage(
      p.canvas,
      TILE / 2 - p.anchor.center * p.w * scale,
      BASE - p.anchor.floor * p.h * scale,
      p.w * scale,
      p.h * scale,
    );
    const measured =
      mascotBodyAnchor(c.getImageData(0, 0, TILE, TILE).data, TILE, TILE)
        .width * TILE;
    if (Math.abs(measured - 140) <= 0.25) break;
    scale *= 140 / measured;
  }
  const transforms = [];
  for (let kind = 0; kind < 2; kind++) {
    const atlas = createCanvas(TILE * 3, TILE * 3),
      c = atlas.getContext("2d");
    for (let i = 0; i < 9; i++) {
      const p = cells[kind * 9 + i],
        dx = TILE / 2 - p.anchor.center * p.w * scale,
        dy = BASE - p.anchor.floor * p.h * scale;
      const rgba = p.canvas.getContext("2d").getImageData(0, 0, p.w, p.h).data;
      for (let y = 0; y < p.h; y++)
        for (let x = 0; x < p.w; x++) {
          if (rgba[(y * p.w + x) * 4 + 3] <= 96) continue;
          if (
            dx + x * scale < 2 ||
            dx + (x + 1) * scale > TILE - 2 ||
            dy + y * scale < 2 ||
            dy + (y + 1) * scale > TILE - 2
          )
            throw Error(
              name +
                "/" +
                (kind * 9 + i) +
                ": visible source pixels would be clipped; redraw required",
            );
        }
      c.drawImage(
        p.canvas,
        (i % 3) * TILE + dx,
        Math.floor(i / 3) * TILE + dy,
        p.w * scale,
        p.h * scale,
      );
      transforms.push({
        scale,
        dx,
        dy,
        sourceWidth: p.w,
        sourceHeight: p.h,
        sourceX: p.x,
        sourceY: p.y,
        chestWidth: p.anchor.width * p.w * scale,
        chestCenter: TILE / 2,
        chestFloor: BASE,
      });
    }
    await sharp(atlas.toBuffer("image/png"))
      .webp({ lossless: true })
      .toFile(
        path.join(
          output,
          name + "-" + (kind ? "reactions" : "directions") + ".webp",
        ),
      );
  }
  await writeCanonical(name);
  return { name, scale, transforms };
}
(async () => {
  if (!process.argv.includes("--partial") && names.length !== 55)
    throw Error("All55redrawn sources required");
  fs.mkdirSync(output, { recursive: true });
  if (process.argv.includes("--canonical-only")) {
    for (const name of names) await writeCanonical(name);
    return;
  }
  const only = process.argv
    .find((arg) => arg.startsWith("--only="))
    ?.slice(7)
    .split(",");
  const selected = only ? names.filter((name) => only.includes(name)) : names;
  const details = only
    ? JSON.parse(
        fs.readFileSync(path.join(source, "geometry.json")),
      ).details.filter((item) => !selected.includes(item.name))
    : [];
  for (const name of selected) {
    details.push(await pack(name));
    console.log("Packed " + name);
  }
  details.sort((a, b) => a.name.localeCompare(b.name));
  fs.writeFileSync(
    path.join(source, "geometry.json"),
    JSON.stringify(
      { mode: "whole-frame", tile: TILE, baseline: BASE, details },
      null,
      2,
    ) + "\n",
  );
  const previews = [];
  for (let i = 0; i < names.length; i++) {
    const label = createCanvas(244, 244),
      ctx = label.getContext("2d");
    ctx.font = "16px sans-serif";
    ctx.fillStyle = "#56616f";
    ctx.textAlign = "center";
    ctx.fillText(names[i], 122, 238);
    previews.push({
      input: await sharp(path.join(output, names[i] + "-directions.webp"))
        .extract({ left: TILE, top: TILE, width: TILE, height: TILE })
        .resize(224, 224)
        .png()
        .toBuffer(),
      left: (i % 6) * 244 + 10,
      top: Math.floor(i / 6) * 244 + 10,
    });
    previews.push({
      input: label.toBuffer("image/png"),
      left: (i % 6) * 244,
      top: Math.floor(i / 6) * 244,
    });
  }
  await sharp({
    create: {
      width: 1464,
      height: Math.ceil(names.length / 6) * 244,
      channels: 4,
      background: "#f7f7fb",
    },
  })
    .composite(previews)
    .webp({ lossless: true })
    .toFile(path.join(source, "preview-all.webp"));
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
