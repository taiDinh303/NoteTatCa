// QA worksheet only; runtime/source artwork is never modified here.
const fs = require("node:fs"),
  path = require("node:path");
const sharp = require("sharp");
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const root = path.resolve(__dirname, ".."),
  source = path.join(root, "assets/mascots/ntc-v6");
(async () => {
  const geometry = JSON.parse(
      fs.readFileSync(path.join(source, "geometry.json")),
    ),
    tile = 640;
  const names =
    process.argv
      .find((a) => a.startsWith("--only="))
      ?.slice(7)
      .split(",") || geometry.details.map((d) => d.name);
  const out = path.join(root, "artifacts/mascot-uniform-review");
  fs.mkdirSync(out, { recursive: true });
  for (let page = 0; page < Math.ceil(names.length / 12); page++) {
    const group = names.slice(page * 12, page * 12 + 12),
      canvas = createCanvas(320 * 4, 350 * 3),
      c = canvas.getContext("2d");
    c.fillStyle = "#f3f5f8";
    c.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < group.length; i++) {
      const name = group[i],
        x = (i % 4) * 320,
        y = Math.floor(i / 4) * 350;
      const buffer = await sharp(
        path.join(
          root,
          "ntc_react/public/mascots/ntc-v6",
          name + "-directions.webp",
        ),
      )
        .extract({ left: tile + 160, top: tile + 288, width: 320, height: 320 })
        .png()
        .toBuffer();
      c.drawImage(await loadImage(buffer), x, y);
      c.lineWidth = 0.5;
      c.strokeStyle = "#94a3b844";
      c.font = "9px sans-serif";
      c.fillStyle = "#64748b";
      for (let a = 0; a < 320; a += 16) {
        c.strokeRect(x + a, y, 0, 320);
        c.strokeRect(x, y + a, 320, 0);
        if (a % 32 === 0) {
          c.fillText(String(a + 160), x + a, y + 10);
          c.fillText(String(a + 288), x, y + a + 9);
        }
      }
      c.lineWidth = 1;
      c.strokeStyle = "#2563eb";
      c.strokeRect(x + 66, y + 114, 188, 120);
      c.strokeStyle = "#059669";
      c.strokeRect(x + 90, y + 234, 140, 54);
      c.font = "16px sans-serif";
      c.fillStyle = "#1e293b";
      c.fillText(name, x + 8, y + 340);
    }
    fs.writeFileSync(
      path.join(out, "page-" + page + ".png"),
      canvas.toBuffer("image/png"),
    );
  }
  console.log(
    "Wrote " +
      names.length +
      " current neutral frames with fixed Fox head/body guides.",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
