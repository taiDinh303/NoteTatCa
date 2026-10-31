import { useEditorState, type Editor } from "@tiptap/react";
import { t as tr, useLanguage } from "../../shared/i18n";

type Heading = { position: number; level: number; text: string };
const outlineCache = new WeakMap<object, Heading[]>();

export default function NoteOutline({ editor }: { editor: Editor | null }) {
  useLanguage();
  const headings = useEditorState({
    editor,
    selector: ({ editor }) => {
      if (editor && outlineCache.has(editor.state.doc))
        return outlineCache.get(editor.state.doc)!;
      const items: Heading[] = [];
      editor?.state.doc.descendants((node, position) => {
        if (node.type.name === "heading" && node.attrs.level <= 3)
          items.push({
            position,
            level: Number(node.attrs.level),
            text: node.textContent,
          });
      });
      if (editor) outlineCache.set(editor.state.doc, items);
      return items;
    },
  });
  if (!editor || !headings?.length) return null;
  return (
    <details className="note-outline">
      <summary>{tr("Table of contents")}</summary>
      <nav aria-label={tr("Table of contents")}>
        <ol>
          {headings.map((item) => (
            <li
              key={item.position}
              style={{ marginInlineStart: (item.level - 1) * 12 }}
            >
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  if (editor.isEditable) {
                    editor
                      .chain()
                      .setTextSelection(item.position + 1)
                      .focus()
                      .scrollIntoView()
                      .run();
                    return;
                  }
                  const element = editor.view.nodeDOM(item.position);
                  if (element instanceof HTMLElement) {
                    element.scrollIntoView({ block: "nearest" });
                    element.tabIndex = -1;
                    element.focus({ preventScroll: true });
                  }
                }}
              >
                {item.text || tr("Untitled")}
              </button>
            </li>
          ))}
        </ol>
      </nav>
    </details>
  );
}
