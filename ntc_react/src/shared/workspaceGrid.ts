export const DESKTOP_NOTE_GAP = 20;

export function desktopNoteWidth(fullWidth: number) {
  const columns = Math.max(
    3,
    Math.round((fullWidth + DESKTOP_NOTE_GAP) / (300 + DESKTOP_NOTE_GAP)),
  );
  return (fullWidth - (columns - 1) * DESKTOP_NOTE_GAP) / columns;
}
