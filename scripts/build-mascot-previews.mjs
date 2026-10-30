// Build-time measurements and small, whole-atlas gallery copies. No artwork edits.
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { mascotBodyAnchor } from "../ntc_react/src/features/mascot/mascotBodyFloor.ts";
const require = createRequire(import.meta.url);
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const root = resolve(import.meta.dirname, "..");
const catalog = await readFile(resolve(root, "ntc_react/src/features/mascot/mascotPreference.ts"), "utf8");
const names = [...catalog.slice(0, catalog.indexOf("] as const;")).matchAll(/^      "([a-z]+)",$/gm)].map(match => match[1]);
if (names.length !== 50) throw new Error("Unexpected mascot catalog; review preview coverage.");
const directory = resolve(root, "ntc_react/public/mascots/ntc-v6");
await mkdir(resolve(directory, "previews"), { recursive: true });
const atlas = createCanvas(1920, 1920), preview = createCanvas(480, 480);
const context = atlas.getContext("2d"), small = preview.getContext("2d");
const atlases = {};
for (const name of names) for (const kind of ["directions", "reactions"]) {
  const key = `${name}-${kind}`, bytes = await readFile(resolve(directory, `${key}.webp`));
  const image = await loadImage(bytes);
  if (image.width !== 1920 || image.height !== 1920) throw new Error(`Unexpected atlas size: ${key}`);
  context.clearRect(0, 0, 1920, 1920);
  context.drawImage(image, 0, 0);
  const anchors = Array.from({ length: 9 }, (_, cell) => mascotBodyAnchor(context.getImageData(cell % 3 * 640, Math.floor(cell / 3) * 640, 640, 640).data, 640, 640));
  atlases[key] = { sha256: createHash("sha256").update(bytes).digest("hex"), floors: anchors.map(anchor => anchor.floor), centers: anchors.map(anchor => anchor.center) };
  small.clearRect(0, 0, 480, 480);
  small.drawImage(atlas, 0, 0, 480, 480);
  await writeFile(resolve(directory, "previews", `${key}.webp`), preview.toBuffer("image/webp", 92));
}
await writeFile(resolve(root, "ntc_react/src/features/mascot/mascotAnchors.generated.json"), JSON.stringify({ revision: "optical-20261030", atlases }, null, 2) + "\n");
console.log(`Generated ${Object.keys(atlases).length} preview atlases and 900 frame anchors.`);
