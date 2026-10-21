export const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 40, 48] as const;
export function isNoteFontSize(value: unknown): value is string {
  return (
    typeof value === "string" &&
    FONT_SIZES.some((size) => value === `${size}px`)
  );
}
