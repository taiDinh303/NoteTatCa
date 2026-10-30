let loading: Promise<typeof import("./NoteEditor")> | undefined;

export function loadNoteEditor() {
  return loading ??= import("./NoteEditor").catch((error: unknown) => {
    loading = undefined;
    throw error;
  });
}

// Intent warming never blocks an interaction; a failed preload can be retried.
export function warmNoteEditor() {
  void loadNoteEditor().catch(() => {});
}
