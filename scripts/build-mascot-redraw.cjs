// Export whole source frames without splitting, warping or replacing artwork.
const fs = require("node:fs"),
  path = require("node:path"),
  sharp = require("sharp");
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const { mascotSourceFrames } = require("./mascot-source-frames.cjs");
const {
  mascotBodyAnchor,
} = require("../ntc_react/src/features/mascot/mascotBodyFloor.ts");
const root = path.resolve(__dirname, ".."),
  version = process.env.NTC_MASCOT_VERSION || "ntc-v5",
  source = path.join(root, "assets/mascots", version);
const output = path.join(root, "ntc_react/public/mascots", version);
const rawSource = path.join(source, "raw");
const retired =
  version === "ntc-v6" ? require("../assets/mascots/ntc-v6/retired.json") : [];
const names = fs
  .readdirSync(rawSource)
  .filter(
    (n) =>
      n.endsWith(".png") &&
      n !== "preview.png" &&
      !retired.includes(n.slice(0, -4)),
  )
  .map((n) => n.slice(0, -4))
  .sort();
const TILE = version === "ntc-v6" ? 640 : 448,
  BASE = TILE - 64;
const inspectOnly = process.argv.includes("--inspect-source");
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
  if (version === "ntc-v6")
    await sharp(data, {
      raw: { width: TILE * 6, height: TILE * 3, channels: 4 },
    })
      .png()
      .toFile(path.join(source, name + ".png"));
}
async function pack(name) {
  const im = await loadImage(path.join(rawSource, name + ".png")),
    cells = [];
  const full = createCanvas(im.width, im.height);
  full.getContext("2d").drawImage(im, 0, 0);
  const allPixels = full
    .getContext("2d")
    .getImageData(0, 0, im.width, im.height).data;
  let wholeFrames;
  try {
    wholeFrames =
      version === "ntc-v6"
        ? mascotSourceFrames(allPixels, im.width, im.height)
        : undefined;
  } catch (error) {
    throw Error(name + ": " + error.message);
  }
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
      if (minimum > 0 && version !== "ntc-v6")
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
  // A tall afro/hat in one column must not force the row cut through another
  // character. Locate each column's row gutters through its central region.
  const columnRows =
    version === "ntc-v6"
      ? Array.from({ length: 6 }, (_, col) =>
          boundaries(
            3,
            false,
            Math.round(((col + 0.2) * im.width) / 6),
            Math.round(((col + 0.8) * im.width) / 6),
          ),
        )
      : undefined;
  for (let kind = 0; kind < 2; kind++)
    for (let i = 0; i < 9; i++) {
      const col = (i % 3) + kind * 3,
        row = Math.floor(i / 3),
        frame = wholeFrames?.[row * 6 + col],
        y = frame ? frame.y : columnRows ? columnRows[col][row] : rows[row],
        endY = columnRows ? columnRows[col][row + 1] : rows[row + 1],
        cellColumns = columnRows ? boundaries(6, true, y, endY) : columns[row],
        x = frame ? frame.x : cellColumns[col];
      const w = frame ? frame.w : cellColumns[col + 1] - x,
        h = frame ? frame.h : endY - y;
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
    if (!inspectOnly)
      await sharp(atlas.toBuffer("image/png"))
        .webp({ lossless: true })
        .toFile(
          path.join(
            output,
            name + "-" + (kind ? "reactions" : "directions") + ".webp",
          ),
        );
  }
  if (!inspectOnly) await writeCanonical(name);
  return { name, scale, transforms };
}
(async () => {
  if (
    !process.argv.includes("--partial") &&
    names.length !== (version === "ntc-v6" ? 50 : 55)
  )
    throw Error("All active redrawn sources required");
  fs.mkdirSync(output, { recursive: true });
  if (inspectOnly) {
    const failures = [];
    for (const name of names) {
      try {
        await pack(name);
        console.log("Source OK: " + name);
      } catch (error) {
        failures.push(String(error));
      }
    }
    if (failures.length) throw Error(failures.join("\n"));
    return;
  }
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
  const failures = [];
  for (const name of selected) {
    try {
      details.push(await pack(name));
    } catch (error) {
      if (!process.argv.includes("--keep-going")) throw error;
      failures.push(String(error));
      continue;
    }
    console.log("Packed " + name);
    // A later rejected source must not discard transforms for completed files.
    fs.writeFileSync(
      path.join(source, "geometry.json"),
      JSON.stringify(
        { mode: "whole-frame", tile: TILE, baseline: BASE, details },
        null,
        2,
      ) + "\n",
    );
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
  if (failures.length) throw Error(failures.join("\n"));
  if (process.argv.includes("--no-preview")) return;
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
