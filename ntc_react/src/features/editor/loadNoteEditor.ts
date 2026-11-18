type NoteEditorModule = typeof import("./NoteEditor");
import { loadRichEditor } from "./loadRichEditor";

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

// The editor is the heaviest workspace surface: a ~680 KB NoteEditor chunk
// plus the ~497 KB Tiptap RichEditor chunk behind it. Preloading both lets
// the first note open render instantly instead of blocking on ~1.2 MB of
// JavaScript download + parse. This mirrors how Keep/Notion open notes —
// the data is already in the list cache, so only the editor modules are the
// remaining cost.
export function warmNoteEditor() {
  void loadNoteEditor().catch(() => {});
  void loadRichEditor().catch(() => {});
}

// Preload the whole note workspace (editor + rich editor) the moment it is
// warmed, without ever blocking a pointer interaction.
export function warmNoteWorkspace() {
  warmNoteEditor();
}

// Run the preload during browser idle time so it happens before the user
// opens a note, but never on a critical interaction path. Repeated calls
// are cheap — each loader guards its own promise.
let scheduled = false;
export function scheduleWarmNoteWorkspace() {
  if (scheduled) return;
  scheduled = true;
  const idle = (window as unknown as {
    requestIdleCallback?: (
      callback: () => void,
      options?: { timeout?: number },
    ) => number;
  }).requestIdleCallback;
  if (idle) idle(() => warmNoteWorkspace(), { timeout: 2500 });
  else window.setTimeout(() => warmNoteWorkspace(), 500);
}
