import { LayoutTemplate } from "lucide-react";
import { IconButton, Modal } from "../../shared/ui";
import { useState } from "react";
import type { Editor } from "@tiptap/react";
import { t as tr, useLanguage } from "../../shared/i18n";

const templates = {
  "Study notes": ["Topic", "Key ideas", "Practice", "Questions"],
  "Daily journal": ["Today", "What went well", "What I learned", "Tomorrow"],
  "Project plan": ["Goal", "Steps", "Next actions"],
  "Meeting notes": ["Agenda", "Discussion", "Decisions", "Next actions"],
};
export default function NoteTemplates({ editor }: { editor: Editor }) {
  useLanguage();
  const [selected, setSelected] = useState("");
  const [open, setOpen] = useState(false);
  return (
    <>
      <IconButton
        icon={LayoutTemplate}
        label={tr("Note templates")}
        onClick={() => setOpen(true)}
      />
      {open && (
        <Modal
          open
          title={tr("Note templates")}
          onClose={() => {
            setOpen(false);
            setSelected("");
          }}
        >
          <div className="modal-body note-templates">
            <label>
              {tr("Choose a template")}{" "}
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
              >
                <option value="">{tr("Choose a template")}</option>
                {Object.keys(templates).map((name) => (
                  <option key={name} value={name}>
                    {tr(name)}
                  </option>
                ))}
              </select>
            </label>
            {selected && (
              <>
                <ul>
                  {templates[selected as keyof typeof templates].map(
                    (title) => (
                      <li key={title}>{tr(title)}</li>
                    ),
                  )}
                </ul>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => {
                    const content = templates[
                      selected as keyof typeof templates
                    ].flatMap((title) => [
                      {
                        type: "heading",
                        attrs: { level: 2 },
                        content: [{ type: "text", text: tr(title) }],
                      },
                      { type: "paragraph" },
                    ]);
                    editor
                      .chain()
                      .focus()
                      .insertContentAt(editor.state.doc.content.size, content)
                      .run();
                    setSelected("");
                    setOpen(false);
                  }}
                >
                  {tr("Append template")}
                </button>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setSelected("")}
                >
                  {tr("Cancel")}
                </button>
              </>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
