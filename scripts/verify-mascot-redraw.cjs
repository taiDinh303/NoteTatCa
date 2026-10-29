// Verify exported pixels against intact source frames, independently of torso geometry.
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict"),
  sharp = require("sharp");
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const { execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, ".."),
  version = process.env.NTC_MASCOT_VERSION || "ntc-v5",
  src = path.join(root, "assets/mascots", version, "raw");
(async () => {
  const geometry = JSON.parse(
    fs.readFileSync(path.join(src, "../geometry.json")),
  );
  assert.equal(geometry.details.length, 55);
  const only = process.argv
    .find((arg) => arg.startsWith("--character="))
    ?.slice(12);
  if (version === "ntc-v6" && !only) {
    // Native image buffers are released by process exit; bound memory per character.
    for (let i = 0; i < geometry.details.length; i++) {
      const name = geometry.details[i].name;
      try {
        execFileSync(process.execPath, [__filename, "--character=" + name], {
          env: process.env,
          stdio: "pipe",
        });
      } catch (error) {
        throw Error(name + ": " + (error.stderr?.toString() || error.message));
      }
      if ((i + 1) % 10 === 0)
        console.log("Verified " + (i + 1) + "/55 characters");
    }
    console.log(
      "PASS: 990 intact frames, 55 characters, expanded PNGs match the runtime atlases.",
    );
    return;
  }
  const selected = only
    ? geometry.details.filter((item) => item.name === only)
    : geometry.details;
  assert.ok(selected.length, "Unknown character");
  const tile = geometry.tile,
    atlas = tile * 3;
  assert.equal(tile, version === "ntc-v6" ? 640 : 448);
  // Reuse native canvas memory: 990 separate 1920px canvases exhaust memory.
  const expected = createCanvas(atlas, atlas),
    c = expected.getContext("2d");
  let checked = 0;
  for (const item of selected) {
    assert.equal(item.transforms.length, 18, item.name + " has every state");
    const image = await loadImage(path.join(src, item.name + ".png"));
    if (version !== "ntc-v6")
      assert.equal(
        item.transforms.reduce(
          (area, t) => area + t.sourceWidth * t.sourceHeight,
          0,
        ),
        image.width * image.height,
        item.name + " preserves the full source grid",
      );
    if (version === "ntc-v6") {
      const original = await sharp(path.join(src, item.name + ".png"))
        .ensureAlpha()
        .raw()
        .toBuffer();
      const coverage = new Uint8Array(image.width * image.height);
      for (const t of item.transforms)
        for (let y = t.sourceY; y < t.sourceY + t.sourceHeight; y++)
          for (let x = t.sourceX; x < t.sourceX + t.sourceWidth; x++)
            coverage[y * image.width + x]++;
      for (let p = 0; p < coverage.length; p++)
        if (original[p * 4 + 3] > 96)
          assert.equal(
            coverage[p],
            1,
            item.name + " preserves each visible source pixel exactly once",
          );
    }
    const canonical = await sharp(path.join(src, "..", item.name + ".webp"))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    assert.equal(canonical.info.width, tile * 6);
    assert.equal(canonical.info.height, atlas);
    if (version === "ntc-v6") {
      const png = await sharp(path.join(src, "..", item.name + ".png"))
        .ensureAlpha()
        .raw()
        .toBuffer();
      // RGB under alpha0 is undefined after WebP encoding and never displayed.
      // Comparing huge unequal buffers also makes assert format millions of bytes.
      for (let p = 0; p < png.length; p += 4) {
        if (png[p + 3] !== canonical.data[p + 3])
          throw Error(item.name + " PNG alpha differs at " + p);
        if (png[p + 3] > 0)
          for (let k = 0; k < 3; k++)
            if (png[p + k] !== canonical.data[p + k])
              throw Error(item.name + " visible PNG color differs at " + p);
      }
    }
    const atlases = await Promise.all(
      ["directions", "reactions"].map((k) =>
        sharp(
          path.join(
            root,
            "ntc_react/public/mascots/" + version,
            item.name + "-" + k + ".webp",
          ),
        )
          .ensureAlpha()
          .raw()
          .toBuffer(),
      ),
    );
    for (let n = 0; n < 18; n++) {
      const kind = Math.floor(n / 9),
        i = n % 9,
        t = item.transforms[n];
      assert.equal(t.scale, item.scale);
      const cell = createCanvas(t.sourceWidth, t.sourceHeight);
      cell
        .getContext("2d")
        .drawImage(
          image,
          t.sourceX,
          t.sourceY,
          t.sourceWidth,
          t.sourceHeight,
          0,
          0,
          t.sourceWidth,
          t.sourceHeight,
        );
      c.clearRect(0, 0, atlas, atlas);
      c.drawImage(
        cell,
        (i % 3) * tile + t.dx,
        Math.floor(i / 3) * tile + t.dy,
        t.sourceWidth * t.scale,
        t.sourceHeight * t.scale,
      );
      const pixels = c.getImageData(
          (i % 3) * tile,
          Math.floor(i / 3) * tile,
          tile,
          tile,
        ).data,
        actual = atlases[kind];
      let visible = 0;
      for (let y = 0; y < tile; y++)
        for (let x = 0; x < tile; x++) {
          const p = (y * tile + x) * 4,
            q =
              ((Math.floor(i / 3) * tile + y) * atlas + (i % 3) * tile + x) * 4;
          assert.ok(
            Math.abs(pixels[p + 3] - actual[q + 3]) <= 1,
            item.name + "/" + n + " alpha",
          );
          if (pixels[p + 3] > 32) {
            visible++;
            for (let k = 0; k < 3; k++)
              assert.ok(
                Math.abs(pixels[p + k] - actual[q + k]) <= 2,
                item.name + "/" + n + " artwork",
              );
          }
          const canonicalIndex =
            ((Math.floor(i / 3) * tile + y) * tile * 6 +
              ((i % 3) + kind * 3) * tile +
              x) *
            4;
          assert.ok(
            Math.abs(actual[q + 3] - canonical.data[canonicalIndex + 3]) <= 1,
            item.name + " canonical alpha",
          );
          if (actual[q + 3] > 32)
            for (let k = 0; k < 3; k++)
              assert.ok(
                Math.abs(actual[q + k] - canonical.data[canonicalIndex + k]) <=
                  2,
                item.name + " canonical artwork",
              );
        }
      assert.ok(visible > 100);
      checked++;
    }
  }
  console.log(
    "PASS: " +
      checked +
      " intact frames, " +
      selected.length +
      " characters, uniform scale per character.",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
