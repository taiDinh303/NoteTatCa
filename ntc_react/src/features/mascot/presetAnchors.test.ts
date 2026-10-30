/// <reference types="node" />
import { expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import metadata from "./mascotAnchors.generated.json";
import { mascotCharacters, mascotPresetSources } from "./mascotPreference";
import { mascotPreviewSources } from "./mascotPreviews";
import { presetAtlasAnchors } from "./presetAnchors";

test("precomputed anchors cover the exact published preset artwork and all 900 frames", () => {
  expect(Object.keys(metadata.atlases)).toHaveLength(mascotCharacters.length * 2);
  for (const name of mascotCharacters) for (const kind of ["directions", "reactions"] as const) {
    const source = mascotPresetSources(name)[kind];
    const value = presetAtlasAnchors(source)!;
    const bytes = readFileSync(new URL(`../../../public${source.split("?")[0]}`, import.meta.url));
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(value.sha256);
    expect(value.floors).toHaveLength(9);
    expect(value.centers).toHaveLength(9);
    for (const number of [...value.floors, ...value.centers]) expect(number > 0 && number <= 1).toBe(true);
    expect(presetAtlasAnchors(mascotPreviewSources(name)[kind])).toBe(value);
  }
});

test("custom, legacy and changed-revision atlases retain runtime measurement", () => {
  expect(presetAtlasAnchors("data:image/webp;base64,AA==")).toBeUndefined();
  expect(presetAtlasAnchors("/mascots/ntc-v5/fox-directions.webp")).toBeUndefined();
  expect(presetAtlasAnchors(mascotPresetSources("fox").directions.replace("optical-20261030", "new-art"))).toBeUndefined();
});
