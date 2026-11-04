export const DESKTOP_NOTE_GAP = 20;

export function desktopNoteWidth(fullWidth: number) {
  const columns = Math.max(
    3,
    Math.round((fullWidth + DESKTOP_NOTE_GAP) / (300 + DESKTOP_NOTE_GAP)),
  );
  return (fullWidth - (columns - 1) * DESKTOP_NOTE_GAP) / columns;
}

// Keep the nominal column count through 105%, rather than losing a whole
// column immediately above 100%. Card width is fixed for this viewport;
// the fixed reference gap is retained and spare space stays on the right.
export function desktopGridCardWidth(fullWidth: number, rightInset: number) {
  const nominal = desktopNoteWidth(fullWidth);
  const pitch = nominal + DESKTOP_NOTE_GAP;
  const columns = Math.round((fullWidth + DESKTOP_NOTE_GAP) / pitch);
  const allowance = Math.max(0, rightInset - 12);
  const fit = (width: number, count: number, scale: number) =>
    ((width + allowance) / scale - (count - 1) * DESKTOP_NOTE_GAP) / count;
  const openWidth = fullWidth - pitch;
  return Math.max(1, Math.min(
    nominal,
    fit(fullWidth, columns, 1.05),
    fit(openWidth, columns - 1, 1.05),
    fit(fullWidth, columns * 2, 0.53),
    fit(openWidth, (columns - 1) * 2, 0.53),
  ));
}
