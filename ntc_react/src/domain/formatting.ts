// Shared font-size allowlist. The React editor and the backend
// ContentRules must stay in lockstep: a note saved with an out-of-range
// size is dropped by both, so changing one side requires changing the
// other.
export const FONT_SIZES = [
  8, 9, 10, 11, 12, 14, 18, 24, 30, 36, 48, 60, 72, 96,
] as const;
export const MIN_FONT_SIZE = 8;
export const MAX_FONT_SIZE = 96;
export const DEFAULT_FONT_SIZE = 11;

export const BULLET_STYLES = [
  { value: "disc", marker: "•", label: "Dot bullets" },
  { value: "dash", marker: "-", label: "Dash bullets" },
  { value: "circle", marker: "○", label: "Circle bullets" },
  { value: "square", marker: "▪", label: "Square bullets" },
] as const;
export function isBulletStyle(
  value: unknown,
): value is (typeof BULLET_STYLES)[number]["value"] {
  return BULLET_STYLES.some((style) => style.value === value);
}

export function orderedMarkerColumn(start: unknown): string {
  const safe =
    typeof start === "number" &&
    Number.isInteger(start) &&
    start >= 1 &&
    start <= 1_000_000
      ? start
      : 1;
  return `${Math.max(1.8, String(safe).length * 0.6 + 0.6)}em`;
}

export function isNoteFontSize(value: unknown): value is string {
  return (
    typeof value === "string" &&
    FONT_SIZES.some((size) => value === `${size}px`)
  );
}

/** Snap a typed number to the nearest supported size within 8-96. */
export function clampFontSize(raw: number): number {
  if (!Number.isFinite(raw)) return DEFAULT_FONT_SIZE;
  let best: number = FONT_SIZES[0];
  for (const size of FONT_SIZES)
    if (Math.abs(size - raw) < Math.abs(best - raw)) best = size;
  return best;
}
