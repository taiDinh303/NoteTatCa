// Choose the higher-contrast foreground using WCAG relative luminance.
export function notePalette(hex?: string | null) {
  if (!hex || !/^#[\da-f]{6}$/i.test(hex)) return undefined;
  const rgb = [1, 3, 5]
    .map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const luminance = rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  const foreground = luminance > 0.179 ? "#202824" : "#ffffff";
  return {
    color: foreground,
    "--text": foreground,
    "--subtle": foreground,
    "--muted": foreground,
  };
}
