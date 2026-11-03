type NoteEditorModule = typeof import("./NoteEditor");
let loading: Promise<NoteEditorModule> | undefined;
let loaded: NoteEditorModule | undefined;

export function loadedNoteEditor() {
  return loaded?.default;
}

export function loadNoteEditor() {
  return loading ??= import("./NoteEditor").then((module) => {
    loaded = module;
    return module;
  }).catch((error: unknown) => {
    loading = undefined;
    throw error;
  });
}

// Intent warming never blocks an interaction; a failed preload can be retried.
export function warmNoteEditor() {
  void loadNoteEditor().catch(() => {});
}
