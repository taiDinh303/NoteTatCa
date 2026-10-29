// Keep the same artwork pixel density when transparent sprite cells grow.
// Account-generated/legacy atlases retain their existing scale.
export function mascotArtScale(source: string) {
  if (source.includes("/ntc-v6/")) return 640 / 320;
  if (source.includes("/ntc-v5/")) return 448 / 320;
  return 1;
}
