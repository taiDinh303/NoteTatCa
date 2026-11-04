import { useEffect, useState, type ComponentProps } from "react";
import { Spinner } from "../../shared/ui";
import { t as tr, useLanguage } from "../../shared/i18n";
import type RichEditor from "./RichEditor";
import { loadedRichEditor, loadRichEditor } from "./loadRichEditor";

export default function RichEditorLoader(
  props: ComponentProps<typeof RichEditor>,
) {
  useLanguage();
  const [Editor, setEditor] = useState(loadedRichEditor);
  const [failure, setFailure] = useState<unknown>();
  useEffect(() => {
    if (Editor) return;
    let active = true;
    void loadRichEditor().then(
      (module) => {
        if (active) setEditor(() => module.default);
      },
      (error: unknown) => {
        if (active) setFailure(error);
      },
    );
    return () => {
      active = false;
    };
  }, [Editor]);
  if (failure) throw failure;
  return Editor ? (
    <Editor {...props} />
  ) : (
    <Spinner label={tr("Loading editor…")} />
  );
}
