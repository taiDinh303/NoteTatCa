// Keep the same artwork pixel density when transparent sprite cells grow.
// Account-generated/legacy atlases retain their existing scale.
import { mascotCalibration } from "./mascotCalibration";

export function mascotArtScale(source: string) {
  if (source.includes("/ntc-v6/")) {
    const name = source.match(
      /\/([^/]+)-(?:directions|reactions)\.webp(?:\?|$)/,
    )?.[1];
    return (640 / 320) * (mascotCalibration[name ?? ""] ?? 1);
  }
  if (source.includes("/ntc-v5/")) return 448 / 320;
  return 1;
}

export function mascotDirectionFrame(source: string, index: number) {
  return /\/ntc-v6\/(gearbot|knight)-directions\.webp(?:\?|$)/.test(source)
    ? Math.floor(index / 3) * 3 + 2 - (index % 3)
    : index;
}
