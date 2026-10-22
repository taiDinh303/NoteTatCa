import { useState } from "react";
import * as Dropdown from "@radix-ui/react-dropdown-menu";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { TextStyle, FontSize } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  AlignJustify,
  Check,
  Bold,
  CheckSquare,
  Code2,
  Highlighter,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Plus,
  Quote,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
} from "lucide-react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import TurndownService from "turndown";
import type { RichNode } from "../../domain/models";
import { canonicalDocument, validateDocument } from "../../domain/document";
import {
  Button,
  ConfirmDialog,
  ErrorBanner,
  Field,
  IconButton,
  Modal,
} from "../../shared/ui";
import {
  DEFAULT_FONT_SIZE,
  FONT_SIZES,
  MAX_FONT_SIZE,
  MIN_FONT_SIZE,
  clampFontSize,
} from "../../domain/formatting";
import { download } from "../../shared/utils";
const alignmentOptions = [
  { value: "left", label: "Align left", icon: AlignLeft },
  { value: "center", label: "Align center", icon: AlignCenter },
  { value: "right", label: "Align right", icon: AlignRight },
  { value: "justify", label: "Justify", icon: AlignJustify },
];
const extensions = [
  StarterKit.configure({
    link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
  }),
  TextAlign.configure({
    types: ["heading", "paragraph"],
    alignments: ["left", "center", "right", "justify"],
  }),
  TaskList,
  TaskItem.configure({ nested: true }),
  TextStyle,
  FontSize,
  Color,
  Highlight.configure({ multicolor: true }),
  Placeholder.configure({
    placeholder: "Start writing… or try # for a heading, [] for a checklist.",
  }),
];
export interface EditorCommands {
  exportMarkdown: () => void;
  importMarkdown: () => void;
  focus: () => void;
  plainText: () => string;
}
export function ReadOnlyContent({ documentJson }: { documentJson: string }) {
  const editor = useEditor({
    extensions: extensions.filter(
      (extension) => extension.name !== "placeholder",
    ),
    content: JSON.parse(documentJson),
    editable: false,
    editorProps: {
      attributes: {
        class: "rich-editor",
        "aria-label": "Note content",
        role: "region",
      },
    },
  });
  return <EditorContent editor={editor} />;
}
export default function RichEditor({
  initial,
  onChange,
  onReady,
  onCharacterCount,
}: {
  initial: string;
  onChange: (json: string) => void;
  onReady: (commands: EditorCommands) => void;
  onCharacterCount: (count: number) => void;
}) {
  const [link, setLink] = useState(false);
  const [fontInput, setFontInput] = useState<string | null>(null);
  const [markdown, setMarkdown] = useState<"import" | "export" | null>(null);
  const [error, setError] = useState<unknown>();
  const [source, setSource] = useState("");
  const editor = useEditor({
    extensions,
    content: JSON.parse(initial),
    editorProps: {
      attributes: {
        class: "rich-editor",
        "aria-label": "Note content",
        role: "textbox",
        "aria-multiline": "true",
      },
    },
    onUpdate: ({ editor }) => {
      onCharacterCount(editor.getText().length);
      const json = JSON.stringify(
        canonicalDocument(editor.getJSON() as RichNode),
      );
      onChange(json);
      try {
        if (editor.getText().length > 100000)
          throw new Error("Note content can contain up to 100,000 characters.");
        setError(undefined);
        validateDocument(json);
      } catch (error) {
        setError(error);
      }
    },
    onCreate: ({ editor }) => {
      onCharacterCount(editor.getText().length);
      onReady({
        // Focus synchronously; a queued frame could run after the user opens the title input.
        focus: () => editor.view.dom.focus({ preventScroll: true }),
        exportMarkdown: () => setMarkdown("export"),
        importMarkdown: () => setMarkdown("import"),
        plainText: () => editor.getText(),
      });
    },
  });
  const state = useEditorState({
    editor,
    selector: ({ editor }) => ({
      alignment:
        ["center", "right", "justify"].find((alignment) =>
          editor?.isActive({ textAlign: alignment }),
        ) ?? "left",
      bold: editor?.isActive("bold"),
      italic: editor?.isActive("italic"),
      underline: editor?.isActive("underline"),
      strike: editor?.isActive("strike"),
      fontSize:
        (editor?.getAttributes("textStyle").fontSize as string | undefined) ??
        "",
      bullet: editor?.isActive("bulletList"),
      ordered: editor?.isActive("orderedList"),
      tasks: editor?.isActive("taskList"),
      quote: editor?.isActive("blockquote"),
      code: editor?.isActive("codeBlock"),
      highlight: editor?.isActive("highlight"),
    }),
  });
  const fontSizeValue = state?.fontSize
    ? parseInt(state.fontSize, 10)
    : DEFAULT_FONT_SIZE;
  function applyFontSize(size: number) {
    editor.chain().focus().setFontSize(`${clampFontSize(size)}px`).run();
    setFontInput(null);
  }
  function stepFontSize(direction: 1 | -1) {
    const options = FONT_SIZES.filter((size) =>
      direction === 1 ? size > fontSizeValue : size < fontSizeValue,
    );
    const target = direction === 1 ? options[0] : options[options.length - 1];
    if (target !== undefined) applyFontSize(target);
  }
  function commitFontSize() {
    if (fontInput === null) return;
    const value = parseInt(fontInput, 10);
    if (Number.isFinite(value)) applyFontSize(value);
    else setFontInput(null);
  }
  if (!editor) return null;
  return (
    <>
      <div className="editor-toolbar" aria-label="Text formatting">
        <IconButton
          icon={Bold}
          label="Bold"
          active={state?.bold}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <IconButton
          icon={Italic}
          label="Italic"
          active={state?.italic}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <IconButton
          icon={Underline}
          label="Underline"
          active={state?.underline}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        />
        <IconButton
          icon={Strikethrough}
          label="Strikethrough"
          active={state?.strike}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        />
        <Dropdown.Root>
          <Dropdown.Trigger asChild>
            <IconButton
              icon={
                alignmentOptions.find(
                  (option) => option.value === state?.alignment,
                )?.icon ?? AlignLeft
              }
              label="Text alignment"
            />
          </Dropdown.Trigger>
          <Dropdown.Portal>
            <Dropdown.Content
              className="dropdown"
              sideOffset={7}
              align="start"
              aria-label="Text alignment"
              onCloseAutoFocus={(event) => {
                event.preventDefault();
                editor.commands.focus();
              }}
            >
              <Dropdown.RadioGroup
                value={state?.alignment ?? "left"}
                onValueChange={(value) =>
                  editor.chain().focus().setTextAlign(value).run()
                }
              >
                {alignmentOptions.map(({ value, label, icon: Icon }) => (
                  <Dropdown.RadioItem
                    className="dropdown-item"
                    key={value}
                    value={value}
                  >
                    <Icon size={16} />
                    <span>{label}</span>
                    <Dropdown.ItemIndicator>
                      <Check size={16} />
                    </Dropdown.ItemIndicator>
                  </Dropdown.RadioItem>
                ))}
              </Dropdown.RadioGroup>
            </Dropdown.Content>
          </Dropdown.Portal>
        </Dropdown.Root>
        <span className="toolbar-divider" />
        <div className="font-size-stepper">
          <IconButton
            icon={Minus}
            label="Decrease font size"
            onClick={() => stepFontSize(-1)}
          />
          <input
            className="font-size-input"
            type="number"
            inputMode="decimal"
            min={MIN_FONT_SIZE}
            max={MAX_FONT_SIZE}
            aria-label="Font size"
            value={fontInput ?? String(fontSizeValue)}
            onChange={(event) => setFontInput(event.target.value)}
            onBlur={() => commitFontSize()}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commitFontSize();
              }
            }}
          />
          <IconButton
            icon={Plus}
            label="Increase font size"
            onClick={() => stepFontSize(1)}
          />
        </div>
        <IconButton
          icon={List}
          label="Bullet list"
          active={state?.bullet}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <IconButton
          icon={ListOrdered}
          label="Numbered list"
          active={state?.ordered}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
        <IconButton
          icon={CheckSquare}
          label="Checklist"
          active={state?.tasks}
          onClick={() => editor.chain().focus().toggleTaskList().run()}
        />
        <IconButton
          icon={Quote}
          label="Quote"
          active={state?.quote}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        />
        <IconButton
          icon={Code2}
          label="Code block"
          active={state?.code}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        />
        <span className="toolbar-divider" />
        <IconButton
          icon={Link2}
          label="Insert link"
          onClick={() => setLink(true)}
        />
        <label className="text-color-picker" title="Text color">
          <span>A</span>
          <input
            type="color"
            aria-label="Text color"
            defaultValue="#374151"
            onChange={(e) =>
              editor.chain().focus().setColor(e.target.value).run()
            }
          />
        </label>
        <IconButton
          icon={Highlighter}
          label="Highlight text"
          active={state?.highlight}
          onClick={() =>
            editor.chain().focus().toggleHighlight({ color: "#fff0a3" }).run()
          }
        />
        <div className="toolbar-spacer" />
        <IconButton
          icon={Undo2}
          label="Undo"
          onClick={() => editor.chain().focus().undo().run()}
        />
        <IconButton
          icon={Redo2}
          label="Redo"
          onClick={() => editor.chain().focus().redo().run()}
        />
      </div>
      <ErrorBanner error={error} />
      <EditorContent className="editor-content" editor={editor} />
      {link ? (
        <Modal open onClose={() => setLink(false)} title="Add a link">
          <form
            className="modal-body"
            onSubmit={(e) => {
              e.preventDefault();
              const href = String(
                new FormData(e.currentTarget).get("url"),
              ).trim();
              if (href && !/^(https?:\/\/|mailto:)/i.test(href)) {
                setError(
                  new Error("Use an https://, http:// or mailto: link."),
                );
                return;
              }
              if (href)
                editor
                  .chain()
                  .focus()
                  .extendMarkRange("link")
                  .setLink({ href })
                  .run();
              else editor.chain().focus().unsetLink().run();
              setLink(false);
            }}
          >
            <ErrorBanner error={error} />
            <Field label="Link URL" hint="Leave empty to remove the link.">
              <input
                name="url"
                placeholder="https://"
                defaultValue={editor.getAttributes("link").href ?? ""}
              />
            </Field>
            <Button type="submit">Apply link</Button>
          </form>
        </Modal>
      ) : null}
      {markdown === "import" ? (
        <Modal
          open
          onClose={() => setMarkdown(null)}
          title="Import Markdown"
          description="This replaces the editor content. Unsupported formatting may be simplified; save or copy your current note first."
        >
          <div className="modal-body">
            <Field label="Markdown content">
              <textarea
                className="markdown-source"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                maxLength={100000}
              />
            </Field>
            <div className="form-actions">
              <Button variant="secondary" onClick={() => setMarkdown(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  void Promise.resolve(marked.parse(source, { async: false }))
                    .then((html) => {
                      const parsed = new DOMParser().parseFromString(
                        DOMPurify.sanitize(html),
                        "text/html",
                      );
                      parsed
                        .querySelectorAll('li > input[type="checkbox"]')
                        .forEach((input) => {
                          const item = input.parentElement!;
                          item.setAttribute("data-type", "taskItem");
                          item.setAttribute(
                            "data-checked",
                            String(input.hasAttribute("checked")),
                          );
                          item.parentElement?.setAttribute(
                            "data-type",
                            "taskList",
                          );
                          input.remove();
                        });
                      editor.commands.setContent(parsed.body.innerHTML);
                      setMarkdown(null);
                      setSource("");
                    })
                    .catch(setError);
                }}
              >
                Replace content
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}
      {markdown === "export" ? (
        <ConfirmDialog
          title="Export as Markdown?"
          description="Markdown cannot preserve text colors, font sizes, highlights, alignment or every rich-text detail. Your original note will stay unchanged."
          confirmLabel="Download Markdown"
          onClose={() => setMarkdown(null)}
          onConfirm={() => {
            const converter = new TurndownService({
              headingStyle: "atx",
              codeBlockStyle: "fenced",
            });
            converter.addRule("task", {
              filter: (node) =>
                node.nodeName === "LI" &&
                node.getAttribute("data-type") === "taskItem",
              replacement: (content, node) =>
                `\n- [${(node as HTMLElement).getAttribute("data-checked") === "true" ? "x" : " "}] ${content.trim()}\n`,
            });
            download(
              "note.md",
              converter.turndown(editor.getHTML()),
              "text/markdown",
            );
          }}
        />
      ) : null}
    </>
  );
}
