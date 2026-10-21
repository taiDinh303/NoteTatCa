import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import * as Popover from "@radix-ui/react-popover";
import { useBlocker } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  Copy,
  Download,
  Maximize2,
  Minimize2,
  Pin,
  PinOff,
  RotateCcw,
  Tag,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AutosaveCoordinator } from "../../application/autosave";
import { notes, workspace } from "../../app/runtime";
import type { Note, NoteDraft } from "../../domain/models";
import { draftFrom, EMOJIS } from "../../domain/models";
import { notePalette } from "../../domain/color";
import { useAuth, useLabels, useMe } from "../../shared/hooks";
import {
  ActionMenu,
  Button,
  ConfirmDialog,
  ErrorBanner,
  ErrorPanel,
  IconButton,
  Modal,
  Spinner,
} from "../../shared/ui";
import NoteColorPicker from "./NoteColorPicker";
import ReminderDialog from "../reminders/ReminderDialog";
import type { EditorCommands } from "./RichEditor";
const RichEditor = lazy(() => import("./RichEditor"));
export default function NoteEditor({
  noteId,
  onClose,
}: {
  noteId?: string;
  onClose: () => void;
}) {
  const query = useQuery({
    queryKey: workspace.key("note", noteId),
    queryFn: () => notes.find(noteId!),
    enabled: !!noteId,
    staleTime: 0,
  });
  if (noteId && !query.data)
    return (
      <Modal
        open
        wide
        hideTitle
        className="note-editor-modal fullscreen"
        onClose={onClose}
        title="Open note"
      >
        {query.isError ? (
          <ErrorPanel error={query.error} retry={() => void query.refetch()} />
        ) : (
          <Spinner label="Opening your note…" />
        )}
        <footer className="editor-footer">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </footer>
      </Modal>
    );
  return (
    <EditorSession
      key={noteId ?? "new"}
      initial={query.data}
      onClose={onClose}
    />
  );
}
function EditorSession({
  initial,
  onClose,
}: {
  initial?: Note;
  onClose: () => void;
}) {
  const state = useAuth();
  const me = useMe();
  const [draft, setDraft] = useState(() => draftFrom(initial));
  const [coordinator] = useState(
    () =>
      new AutosaveCoordinator(
        notes,
        draftFrom(initial),
        initial,
        workspace.commit,
      ),
  );
  const snapshot = useSyncExternalStore(
    coordinator.subscribe,
    coordinator.getSnapshot,
  );
  const labels = useLabels();
  const [fullscreen, setFullscreen] = useState(true);
  const [characterCount, setCharacterCount] = useState(
    initial?.content.length ?? 0,
  );
  const [closing, setClosing] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [closePrompt, setClosePrompt] = useState(false);
  const [trashPrompt, setTrashPrompt] = useState(false);
  const [otherError, setOtherError] = useState<unknown>();
  const [copyBusy, setCopyBusy] = useState(false);
  const fork = useRef<AutosaveCoordinator | undefined>(undefined);
  const draftRef = useRef(draft);
  const editor = useRef<EditorCommands | null>(null);
  const blocker = useBlocker(snapshot.dirty);
  const allLabels = labels.data?.pages.flatMap((p) => p.items) ?? [];
  useEffect(() => {
    const handle = (event: BeforeUnloadEvent) => {
      if (coordinator.getSnapshot().dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handle);
    return () => window.removeEventListener("beforeunload", handle);
  }, [coordinator]);
  useEffect(() => {
    coordinator.resume();
    return () => {
      coordinator.dispose();
      fork.current?.dispose();
    };
  }, [coordinator]);
  function update(patch: Partial<NoteDraft>) {
    const next = { ...draftRef.current, ...patch };
    draftRef.current = next;
    setDraft(next);
    coordinator.update(next);
  }
  async function save() {
    setOtherError(undefined);
    try {
      return await coordinator.flush(true);
    } catch (error) {
      setOtherError(error);
      throw error;
    }
  }
  function requestClose() {
    if (closing) return;
    if (snapshot.dirty) {
      if (snapshot.status === "error" || snapshot.status === "conflict") {
        setClosePrompt(true);
      } else {
        setClosing(true);
        void closeSaved()
          .catch(() => setClosePrompt(true))
          .finally(() => setClosing(false));
      }
      return;
    }
    onClose();
  }
  function discard() {
    coordinator.dispose();
    if (blocker.state === "blocked") blocker.proceed();
    else onClose();
  }
  async function closeSaved() {
    await save();
    if (blocker.state === "blocked") blocker.proceed();
    else onClose();
  }
  const status =
    snapshot.status === "saved"
      ? "All changes saved"
      : snapshot.status === "saving"
        ? "Saving…"
        : snapshot.status === "dirty"
          ? "Unsaved changes"
          : snapshot.status === "conflict"
            ? "Changes need your attention"
            : "Could not save";
  return (
    <>
      <Modal
        open
        wide
        onClose={requestClose}
        title={initial ? "Edit note" : "New note"}
        hideTitle
        className={`note-editor-modal ${fullscreen ? "fullscreen" : ""}`}
      >
        <div
          className="editor-heading"
          style={{
            ...notePalette(draft.backgroundColor),
            backgroundColor: draft.backgroundColor || undefined,
          }}
        >
          <div className="editor-identity">
            <Popover.Root open={emojiOpen} onOpenChange={setEmojiOpen}>
              <Popover.Trigger asChild>
                <button
                  type="button"
                  className="emoji-trigger"
                  aria-label="Choose note icon"
                >
                  {draft.iconEmoji || "📝"}
                </button>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content
                  className="note-icon-menu"
                  side="bottom"
                  align="start"
                  sideOffset={10}
                  collisionPadding={12}
                  aria-label="Note icons"
                >
                  <div className="note-icon-grid">
                    {EMOJIS.map((emoji) => (
                      <button
                        key={emoji || "none"}
                        type="button"
                        aria-label={emoji || "Remove icon"}
                        aria-pressed={draft.iconEmoji === emoji}
                        onClick={() => {
                          update({ iconEmoji: emoji });
                          setEmojiOpen(false);
                        }}
                      >
                        {emoji || "×"}
                      </button>
                    ))}
                  </div>
                  <input
                    aria-label="Custom note emoji"
                    placeholder="Or paste an emoji"
                    value={draft.iconEmoji}
                    maxLength={32}
                    onChange={(event) =>
                      update({ iconEmoji: event.target.value })
                    }
                  />
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
            <span
              className="sr-only"
              role="status"
              data-save-state={snapshot.status}
            >
              {status}
            </span>
          </div>
          <div className="editor-title-wrap">
            <input
              className="editor-title"
              aria-label="Note title"
              value={draft.title}
              maxLength={150}
              onChange={(e) => update({ title: e.target.value })}
            />
          </div>
          <div className="row-actions">
            <IconButton
              icon={draft.isPinned ? PinOff : Pin}
              label={draft.isPinned ? "Unpin note" : "Pin note"}
              className="editor-pin editor-heading-action"
              aria-pressed={draft.isPinned}
              onClick={() => update({ isPinned: !draft.isPinned })}
            />
            <IconButton
              className="editor-heading-action"
              icon={fullscreen ? Minimize2 : Maximize2}
              label={fullscreen ? "Exit full screen" : "Enter full screen"}
              aria-pressed={fullscreen}
              onClick={() => setFullscreen((current) => !current)}
            />
          </div>
        </div>
        <ErrorBanner error={otherError ?? snapshot.error} />
        {snapshot.status === "conflict" ? (
          <div className="conflict-panel">
            <strong>Your draft is safe here.</strong>
            <p>
              This note changed elsewhere. Copy your draft or save it as a
              separate note before loading the server version.
            </p>
            <div className="row-actions">
              <Button
                variant="secondary"
                onClick={() => {
                  void navigator.clipboard
                    .writeText(
                      `${draft.title}\n\n${editor.current?.plainText() ?? draft.documentJson}`,
                    )
                    .catch(() =>
                      toast.error(
                        "Clipboard is unavailable. Select and copy the text manually.",
                      ),
                    );
                }}
              >
                Copy draft
              </Button>
              <Button
                variant="secondary"
                busy={copyBusy}
                onClick={() => {
                  if (!fork.current)
                    fork.current = new AutosaveCoordinator(
                      notes,
                      draft,
                      undefined,
                      workspace.commit,
                    );
                  else fork.current.update(draft);
                  setCopyBusy(true);
                  void fork.current
                    .flush(true)
                    .then((note) => {
                      if (!note) return;
                      workspace.commit(note);
                      coordinator.dispose();
                      fork.current?.dispose();
                      onClose();
                    })
                    .catch(setOtherError)
                    .finally(() => setCopyBusy(false));
                }}
              >
                Save as new note
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setClosePrompt(true);
                }}
              >
                Discard and close
              </Button>
            </div>
          </div>
        ) : null}
        <div className="editor-scroll">
          <Suspense fallback={<Spinner label="Loading editor…" />}>
            <RichEditor
              initial={draft.documentJson}
              onCharacterCount={setCharacterCount}
              onChange={(documentJson) => update({ documentJson })}
              onReady={(commands) => {
                editor.current = commands;
                // Lazy editor startup must not steal focus from an optional title or another input.
                if (
                  !document.activeElement?.matches(
                    "input, textarea, select, [contenteditable='true'], [aria-expanded='true'], .note-color-menu *, .note-icon-menu *, [role='menuitem'], [role='menuitemradio']",
                  )
                )
                  commands.focus();
              }}
            />
          </Suspense>
        </div>
        <div className="editor-labels">
          {draft.tagIds.map((id) => {
            const label =
              allLabels.find((l) => l.id === id) ??
              initial?.tags.find((l) => l.id === id);
            return label ? (
              <button
                className="label-chip"
                key={id}
                onClick={() =>
                  update({ tagIds: draft.tagIds.filter((x) => x !== id) })
                }
              >
                <Tag size={11} />
                {label.name}
                <X size={11} />
              </button>
            ) : null;
          })}
        </div>
        {tagsOpen ? (
          <div className="label-chooser">
            <div className="section-heading">
              <strong>Organize with labels</strong>
              <IconButton
                icon={X}
                label="Close label chooser"
                onClick={() => setTagsOpen(false)}
              />
            </div>
            {labels.isError ? (
              <ErrorPanel
                error={labels.error}
                retry={() => void labels.refetch()}
              />
            ) : allLabels.length ? (
              allLabels.map((label) => (
                <label key={label.id} className="check-label">
                  <input
                    type="checkbox"
                    checked={draft.tagIds.includes(label.id)}
                    disabled={
                      !draft.tagIds.includes(label.id) &&
                      draft.tagIds.length >= 20
                    }
                    onChange={() =>
                      update({
                        tagIds: draft.tagIds.includes(label.id)
                          ? draft.tagIds.filter((x) => x !== label.id)
                          : [...draft.tagIds, label.id],
                      })
                    }
                  />
                  <span
                    className="color-dot"
                    style={{ background: label.color ?? "#a0a8b2" }}
                  />
                  {label.name}
                </label>
              ))
            ) : (
              <p className="muted">
                Create labels from the sidebar to organize your notes.
              </p>
            )}
            {labels.hasNextPage ? (
              <Button
                variant="ghost"
                onClick={() => void labels.fetchNextPage()}
              >
                Load more labels
              </Button>
            ) : null}
          </div>
        ) : null}
        <footer className="editor-footer">
          <div className="editor-tools">
            <NoteColorPicker
              color={draft.backgroundColor}
              onChange={(backgroundColor) => update({ backgroundColor })}
            />
            <span className="toolbar-divider" />
            <IconButton
              icon={Tag}
              label="Note labels"
              active={tagsOpen}
              onClick={() => setTagsOpen(!tagsOpen)}
            />
            <IconButton
              icon={Bell}
              label="Note reminders"
              onClick={() => {
                void save()
                  .then((note) => {
                    if (note) setReminderOpen(true);
                    else
                      toast.info("Write something first, then add a reminder.");
                  })
                  .catch(() => {});
              }}
            />
            <ActionMenu
              label="Note options"
              items={[
                {
                  label: "Import Markdown",
                  icon: Upload,
                  action: () => editor.current?.importMarkdown(),
                },
                {
                  label: "Export Markdown",
                  icon: Download,
                  action: () => editor.current?.exportMarkdown(),
                },
                {
                  label: "Copy text",
                  icon: Copy,
                  action: () => {
                    void navigator.clipboard
                      .writeText(editor.current?.plainText() ?? "")
                      .catch(() => toast.error("Clipboard is unavailable."));
                  },
                },
                {
                  label: "Move to trash",
                  icon: Trash2,
                  danger: true,
                  disabled: !snapshot.note,
                  separator: true,
                  action: () => setTrashPrompt(true),
                },
              ]}
            />
          </div>
          <div className="row-actions">
            <span className="editor-count" aria-label="Character count">
              {characterCount.toLocaleString("en-US")} / 100,000
            </span>
            {snapshot.status === "error" ? (
              <Button
                variant="secondary"
                disabled={state.status !== "authenticated"}
                onClick={() => {
                  void save().catch(() => {});
                }}
              >
                <RotateCcw size={15} />
                Retry save
              </Button>
            ) : null}
            <Button variant="ghost" busy={closing} onClick={requestClose}>
              Close
            </Button>
          </div>
        </footer>
      </Modal>
      {closePrompt || blocker.state === "blocked" ? (
        <Modal
          open
          onClose={() => {
            setClosePrompt(false);
            if (blocker.state === "blocked") blocker.reset();
          }}
          title="Keep your changes?"
          description="Your latest edits have not been saved yet."
        >
          <div className="modal-body">
            <ErrorBanner error={otherError} />
            <div className="stack-actions">
              <Button
                disabled={snapshot.status === "conflict"}
                busy={snapshot.status === "saving"}
                onClick={() => {
                  void closeSaved().catch(() => {});
                }}
              >
                Save and continue
              </Button>
              <Button variant="danger" onClick={discard}>
                Discard unsaved changes
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setClosePrompt(false);
                  if (blocker.state === "blocked") blocker.reset();
                }}
              >
                Keep editing
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}
      {trashPrompt && snapshot.note ? (
        <ConfirmDialog
          title="Move this note to trash?"
          description="You can restore it for seven days. Future reminders will stop."
          confirmLabel="Move to trash"
          onClose={() => setTrashPrompt(false)}
          onConfirm={async () => {
            const note = await save();
            if (note) {
              await workspace.trash(note);
              coordinator.dispose();
              onClose();
            }
          }}
        />
      ) : null}
      {reminderOpen && snapshot.note ? (
        <ReminderDialog
          noteId={snapshot.note.id}
          title={draft.title}
          zone={
            me.data?.account.timeZoneId ??
            state.session?.timeZoneId ??
            "Asia/Ho_Chi_Minh"
          }
          onClose={() => setReminderOpen(false)}
        />
      ) : null}
    </>
  );
}
