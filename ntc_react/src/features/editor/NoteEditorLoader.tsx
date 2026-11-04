import { useEffect, useState } from "react";
import { Spinner } from "../../shared/ui";
import { t as tr, useLanguage } from "../../shared/i18n";
import type { NoteEditorProps } from "./NoteEditor";
import { loadedNoteEditor, loadNoteEditor } from "./loadNoteEditor";
import { NoteSurfaceFrame } from "./NoteSurfaceHost";

// A warmed editor renders synchronously. A genuinely cold import shows progress
// until it resolves, without introducing a Suspense fallback/reveal cycle.
export default function NoteEditorLoader(props: NoteEditorProps) {
  useLanguage();
  const [Editor, setEditor] = useState(loadedNoteEditor);
  const [failure, setFailure] = useState<unknown>();
  useEffect(() => {
    if (Editor) return;
    let active = true;
    void loadNoteEditor().then(
      (module) => { if (active) setEditor(() => module.default); },
      (error: unknown) => { if (active) setFailure(error); },
    );
    return () => { active = false; };
  }, [Editor]);
  if (failure) throw failure;
  return Editor ? <Editor {...props} /> : (
    <NoteSurfaceFrame open wide hideTitle className="note-editor-modal" title={tr("Open note")} onClose={props.onClose}>
      <Spinner label={tr("Opening editor…")} />
    </NoteSurfaceFrame>
  );
}
