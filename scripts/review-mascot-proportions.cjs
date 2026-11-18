// Visual measurement worksheet. This does not edit or assemble character parts.
const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto");
const sharp = require("sharp");
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const root = path.resolve(__dirname, ".."),
  version = process.env.NTC_MASCOT_VERSION || "ntc-v6";
const source = path.join(root, "assets/mascots", version),
  output = path.join(root, "ntc_react/public/mascots", version);
const tile = 448,
  targetArea = 188 * 120,
  targetBody = [140, 54];
const hash = (file) =>
  crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
(async () => {
  const names = fs
    .readdirSync(output)
    .filter((n) => n.endsWith("-directions.webp"))
    .map((n) => n.replace("-directions.webp", ""))
    .sort();
  const manifestFile = path.join(source, "proportion-review.json");
  const previous = fs.existsSync(manifestFile)
    ? JSON.parse(fs.readFileSync(manifestFile))
    : {};
  const entries = {};
  for (const name of names) {
    const file = path.join(output, name + "-directions.webp"),
      sha256 = hash(file);
    entries[name] =
      previous.entries?.[name]?.sha256 === sha256
        ? previous.entries[name]
        : { sha256, headBounds: null, bodyTop: null, approved: false };
  }
  if (process.argv.includes("--verify")) {
    if (names.length !== 55) throw Error("Need all 55 characters");
    for (const [name, e] of Object.entries(entries)) {
      if (!e.approved || !Array.isArray(e.headBounds) || e.bodyTop === null)
        throw Error(
          name +
            ": needs a visual anatomy review bound to the current atlas hash",
        );
      const [left, top, right, bottom] = e.headBounds,
        ratio = ((right - left) * (bottom - top)) / targetArea;
      if (Math.abs(ratio - 1) > 0.1)
        throw Error(
          name + ": core-head bounding area differs more than 10% from Fox",
        );
      if (Math.abs(384 - e.bodyTop - 54) > 5)
        throw Error(name + ": body height differs more than 5px from Fox");
    }
    console.log(
      "PASS: all55 current atlases have manually reviewed head size/body height within the Fox standard.",
    );
    return;
  }
  fs.writeFileSync(
    manifestFile,
    JSON.stringify(
      {
        method:
          "Manual anatomical landmarks on neutral frame; no automatic facial recognition",
        targetHeadArea: targetArea,
        targetBody,
        entries,
      },
      null,
      2,
    ) + "\n",
  );
  const dir = path.join(root, "artifacts", version + "-proportion-review");
  fs.mkdirSync(dir, { recursive: true });
  for (let page = 0; page < Math.ceil(names.length / 6); page++) {
    const group = names.slice(page * 6, page * 6 + 6),
      canvas = createCanvas(448 * 3, 488 * 2),
      c = canvas.getContext("2d");
    c.fillStyle = "#eef1f5";
    c.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < group.length; i++) {
      const name = group[i],
        x = (i % 3) * 448,
        y = Math.floor(i / 3) * 488;
      const pixels = await sharp(path.join(output, name + "-directions.webp"))
        .extract({ left: tile, top: tile, width: tile, height: tile })
        .png()
        .toBuffer();
      c.drawImage(await loadImage(pixels), x, y);
      c.lineWidth = 0.5;
      c.strokeStyle = "#64748b35";
      for (let a = 0; a <= 448; a += 16) {
        c.beginPath();
        c.moveTo(x + a, y);
        c.lineTo(x + a, y + 448);
        c.stroke();
        c.beginPath();
        c.moveTo(x, y + a);
        c.lineTo(x + 448, y + a);
        c.stroke();
      }
      c.font = "11px sans-serif";
      c.fillStyle = "#556477";
      for (let a = 32; a < 448; a += 32) {
        c.fillText(String(a), x + a, y + 12);
        c.fillText(String(a), x + 2, y + a);
      }
      c.lineWidth = 2;
      c.strokeStyle = "#30926b";
      c.strokeRect(x + 154, y + 330, 140, 54);
      const promptFile = path.join(source, "prompts", name + ".json");
      const [hw, hh] = fs.existsSync(promptFile)
        ? JSON.parse(fs.readFileSync(promptFile)).head
        : [188, 120];
      c.strokeStyle = "#2879b9";
      c.setLineDash([6, 4]);
      c.strokeRect(x + 224 - hw / 2, y + 330 - hh, hw, hh);
      c.setLineDash([]);
      c.font = "17px sans-serif";
      c.fillStyle = "#243449";
      c.fillText(
        name + " | head " + hw + "x" + hh + "; body 140x54",
        x + 8,
        y + 475,
      );
    }
    fs.writeFileSync(
      path.join(dir, "page-" + page + ".png"),
      canvas.toBuffer("image/png"),
    );
  }
  console.log(
    "Wrote anatomy worksheets and pending manual review manifest for " +
      names.length +
      " characters.",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
