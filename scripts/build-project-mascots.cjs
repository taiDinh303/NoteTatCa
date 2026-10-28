// Export whole source frames without splitting, warping or replacing artwork.
const fs = require("node:fs"),
  path = require("node:path"),
  sharp = require("sharp");
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const root = path.resolve(__dirname, ".."),
  source = path.join(root, "assets/mascots/ntc-v1");
const output = path.join(root, "ntc_react/public/mascots/ntc-v4");
const names = fs
  .readdirSync(source)
  .filter((n) => n.endsWith(".png") && n !== "preview.png")
  .map((n) => n.slice(0, -4))
  .sort();
const TILE = 320,
  BASE = 300;
async function pack(name) {
  const im = await loadImage(path.join(source, name + ".png")),
    cells = [];
  for (let kind = 0; kind < 2; kind++)
    for (let i = 0; i < 9; i++) {
      const col = (i % 3) + kind * 3,
        row = Math.floor(i / 3),
        x = Math.round((col * im.width) / 6),
        y = Math.round((row * im.height) / 3);
      const w = Math.round(((col + 1) * im.width) / 6) - x,
        h = Math.round(((row + 1) * im.height) / 3) - y;
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
      cells.push({ canvas, left, right, top, bottom, w, h });
    }
  const scale = Math.min(
      ...cells.map((p) =>
        Math.min(288 / p.w, 276 / (p.bottom - p.top + 1)),
      ),
    ),
    transforms = [];
  for (let kind = 0; kind < 2; kind++) {
    const atlas = createCanvas(960, 960),
      c = atlas.getContext("2d");
    for (let i = 0; i < 9; i++) {
      const p = cells[kind * 9 + i],
        dx = 160 - (p.w / 2) * scale,
        dy = BASE - (p.bottom + 1) * scale;
      c.drawImage(
        p.canvas,
        (i % 3) * TILE + dx,
        Math.floor(i / 3) * TILE + dy,
        p.w * scale,
        p.h * scale,
      );
      transforms.push({ scale, dx, dy, sourceWidth: p.w, sourceHeight: p.h });
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
  return { name, scale, transforms };
}
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const details = [];
  for (const name of names) {
    details.push(await pack(name));
    console.log("Packed " + name);
  }
  fs.writeFileSync(
    path.join(source, "geometry-v4.json"),
    JSON.stringify(
      { mode: "whole-frame", tile: TILE, baseline: BASE, details },
      null,
      2,
    ) + "\n",
  );
  const previews = [];
  for (let i = 0; i < names.length; i++)
    previews.push({
      input: await sharp(path.join(output, names[i] + "-directions.webp"))
        .extract({ left: 320, top: 320, width: 320, height: 320 })
        .resize(160, 160)
        .png()
        .toBuffer(),
      left: (i % 6) * 180 + 10,
      top: Math.floor(i / 6) * 180 + 10,
    });
  await sharp({
    create: {
      width: 1080,
      height: Math.ceil(names.length / 6) * 180,
      channels: 4,
      background: "#f7f7fb",
    },
  })
    .composite(previews)
    .webp({ lossless: true })
    .toFile(path.join(source, "preview-v4.webp"));
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
