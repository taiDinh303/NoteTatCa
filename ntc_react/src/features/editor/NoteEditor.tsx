import { t as tr, useLanguage, currentLanguage } from "../../shared/i18n";
import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import * as Popover from "@radix-ui/react-popover";
import { useBlocker } from "react-router-dom";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  Bell,
  Check,
  Copy,
  Download,
  Eye,
  History,
  Maximize2,
  Minimize2,
  Pencil,
  Pin,
  PinOff,
  Plus,
  RotateCcw,
  Tag,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AutosaveCoordinator } from "../../application/autosave";
import { api, notes, workspace, offline } from "../../app/runtime";
import type { Note, NoteDraft } from "../../domain/models";
import { draftFrom, EMOJIS } from "../../domain/models";
import { labelTint, notePalette } from "../../domain/color";
import { useAuth, useLabels, useMe } from "../../shared/hooks";
import { dateTime } from "../../shared/utils";
import {
  ActionMenu,
  Button,
  ErrorBanner,
  ErrorPanel,
  IconButton,
  Modal,
  Spinner,
} from "../../shared/ui";
import NoteColorPicker from "./NoteColorPicker";
import "./NoteLabelsDialog.css";
import ReminderDialog from "../reminders/ReminderDialog";
import type { EditorCommands } from "./RichEditor";
import { ContentZoomSession } from "./contentZoomSession";
import ContentZoomOutlet from "./ContentZoomOutlet";
import RichEditor, { ReadOnlyContent } from "./RichEditor";
export type NoteOpenAction = "labels" | "reminder";
type NoteEditorProps = {
  noteId?: string;
  onClose: () => void;
  initialAction?: NoteOpenAction;
};
export default function NoteEditor(props: NoteEditorProps) {
  return (
    <ZoomSession key={props.noteId ?? "new"}>
      <NoteEditorSession {...props} />
    </ZoomSession>
  );
}
function ZoomSession({ children }: { children: React.ReactNode }) {
  const percent = useRef(100);
  const [target, setTarget] = useState<HTMLDivElement | null>(null);
  const [handTarget, setHandTarget] = useState<HTMLDivElement | null>(null);
  const zoom = useMemo(() => ({ percent, target, setTarget, handTarget, setHandTarget }), [target, handTarget]);
  return (
    <ContentZoomSession.Provider value={zoom}>
      {children}
    </ContentZoomSession.Provider>
  );
}
function NoteEditorSession({
  noteId,
  onClose,
  initialAction,
}: NoteEditorProps) {
  useLanguage();
  const [editing, setEditing] = useState(!noteId);
  const [createdId, setCreatedId] = useState<string>();
  const [fullscreen, setFullscreen] = useState(false);
  const resolvedId = noteId ?? createdId;
  const query = useQuery({
    networkMode: "always",
    queryKey: workspace.key("note", resolvedId),
    queryFn: () => notes.find(resolvedId!),
    enabled: !!resolvedId,
    staleTime: 0,
  });
  if (resolvedId && !query.data)
    return (
      <Modal
        open
        wide
        hideTitle
        className="note-editor-modal"
        onClose={onClose}
        title={tr("Open note")}
      >
        {query.isError ? (
          <ErrorPanel error={query.error} retry={() => void query.refetch()} />
        ) : (
          <Spinner label={tr("Opening your note…")} />
        )}
        <footer className="editor-footer">
          <Button variant="ghost" onClick={onClose}>
            {tr("Close")}
          </Button>
        </footer>
      </Modal>
    );
  if (query.data && !editing && initialAction === "labels")
    return <NoteLabelsDialog note={query.data} onClose={onClose} />;
  if (query.data && !editing)
    return (
      <NoteViewer
        note={query.data}
        onClose={onClose}
        onEdit={() => setEditing(true)}
        onRestored={() => { void query.refetch(); void workspace.cache.invalidateQueries({ queryKey: workspace.key("notes") }); }}
        initialAction={initialAction}
        fullscreen={fullscreen}
        onFullscreenChange={setFullscreen}
      />
    );
  return (
    <EditorSession
      key={resolvedId ?? "new"}
      initial={query.data}
      onClose={onClose}
      onView={(note) => {
        setCreatedId(note.id);
        setEditing(false);
      }}
      fullscreen={fullscreen}
      onFullscreenChange={setFullscreen}
    />
  );
}
function NoteLabelsDialog({
  note,
  onClose,
}: {
  note: Note;
  onClose: () => void;
}) {
  useLanguage();
  const labels = useLabels();
  const [original] = useState(note);
  const [tagIds, setTagIds] = useState(() =>
    note.tags.map((label) => label.id),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const allLabels = labels.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <Modal
      open
      onClose={() => {
        if (!busy) onClose();
      }}
      title={tr("Note labels")}
      hideTitle
      hideCloseButton
      className="note-labels-dialog"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setBusy(true);
          setError(undefined);
          void notes
            .setLabels(original, tagIds)
            .then((updated) => {
              workspace.commit(updated);
              onClose();
            })
            .catch(setError)
            .finally(() => setBusy(false));
        }}
      >
        <div className="modal-body">
          <ErrorBanner error={error} />
          {labels.isError ? (
            <ErrorPanel
              error={labels.error}
              retry={() => void labels.refetch()}
            />
          ) : labels.isPending ? (
            <Spinner />
          ) : allLabels.length ? (
            <div className="note-label-options">
              {allLabels.map((label) => (
                <button
                  key={label.id}
                  type="button"
                  className="note-label-option"
                  aria-pressed={tagIds.includes(label.id)}
                  disabled={
                    busy || (!tagIds.includes(label.id) && tagIds.length >= 20)
                  }
                  onClick={() =>
                    setTagIds((current) =>
                      current.includes(label.id)
                        ? current.filter((id) => id !== label.id)
                        : [...current, label.id],
                    )
                  }
                >
                  <Tag
                    size={14}
                    aria-hidden="true"
                    style={{ color: label.color ?? undefined }}
                  />
                  <span>{label.name}</span>
                  {tagIds.includes(label.id) ? (
                    <Check size={14} aria-hidden="true" />
                  ) : null}
                </button>
              ))}
            </div>
          ) : (
            <p className="muted">
              {tr("Create labels from the sidebar to organize your notes.")}
            </p>
          )}
          {labels.hasNextPage ? (
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => void labels.fetchNextPage()}
            >
              {tr("Load more labels")}
            </Button>
          ) : null}
        </div>
        <footer className="modal-footer">
          <Button variant="ghost" disabled={busy} onClick={onClose}>
            {tr("Cancel")}
          </Button>
          <Button
            type="submit"
            busy={busy}
            disabled={labels.isPending || labels.isError}
          >
            {tr("Save")}
          </Button>
        </footer>
      </form>
    </Modal>
  );
}
function NoteViewer({
  note,
  onClose,
  onEdit,
  onRestored,
  initialAction,
  fullscreen,
  onFullscreenChange,
}: {
  note: Note;
  onClose: () => void;
  onEdit: () => void;
  onRestored: () => void;
  initialAction?: NoteOpenAction;
  fullscreen: boolean;
  onFullscreenChange: (value: boolean) => void;
}) {
  useLanguage();
  const me = useMe();
  const auth = useAuth();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(
    initialAction === "reminder",
  );
  const zone = me.data?.account.timeZoneId ?? auth.session?.timeZoneId;
  const modified = new Intl.DateTimeFormat(currentLanguage(), {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: zone,
  }).format(new Date(note.lastUpdatedTime));
  if (reminderOpen && auth.status !== "guest")
    return (
      <ReminderDialog
        noteId={note.id}
        title={note.title ?? ""}
        zone={
          me.data?.account.timeZoneId ??
          auth.session?.timeZoneId ??
          "Asia/Ho_Chi_Minh"
        }
        onClose={() => setReminderOpen(false)}
      />
    );
  if (historyOpen)
    return <NoteHistory note={note} onClose={() => setHistoryOpen(false)} onRestored={onRestored} />;
  return (
    <Modal
      open
      wide
      hideTitle
      title={tr("View note")}
      onClose={onClose}
      className={`note-editor-modal note-viewer ${fullscreen ? "fullscreen" : ""}`}
      style={{
        ...notePalette(note.backgroundColor),
        backgroundColor: note.backgroundColor || undefined,
        ...(note.backgroundColor ? { "--surface": note.backgroundColor } : {}),
      }}
    >
      <div className="editor-heading note-view-heading">
        <div className="editor-identity note-view-identity">
          {note.iconEmoji ? (
            <span className="note-heading-icon" aria-hidden="true">{note.iconEmoji}</span>
          ) : null}
          {note.title ? <h2 className="note-heading-title">{note.title}</h2> : null}
        </div>
        <IconButton
          className="editor-size-toggle"
          icon={fullscreen ? Minimize2 : Maximize2}
          label={fullscreen ? tr("Exit full screen") : tr("Enter full screen")}
          aria-pressed={fullscreen}
          onClick={() => onFullscreenChange(!fullscreen)}
        />
      </div>
      <div className="editor-scroll">
        <Suspense fallback={<Spinner label={tr("Loading note…")} />}>
          <ReadOnlyContent
            key={note.version}
            documentJson={draftFrom(note).documentJson}
          />
        </Suspense>
      </div>
      <footer className="editor-footer note-view-footer">
        <Popover.Root>
          <Popover.Trigger asChild>
            <button
              type="button"
              className="note-view-timestamp"
              aria-label={tr("Note information")}
            >
              {tr("Edited")} ·{" "}
              <time dateTime={note.lastUpdatedTime}>{modified}</time>
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              className="note-information"
              side="top"
              align="start"
              sideOffset={8}
              collisionPadding={12}
            >
              <h3>{tr("Note information")}</h3>
              <dl>
                <div>
                  <dt>{tr("Created")}</dt>
                  <dd>
                    <time dateTime={note.createdTime}>
                      {dateTime(note.createdTime, zone)}
                    </time>
                  </dd>
                </div>
                <div>
                  <dt>{tr("Last edited")}</dt>
                  <dd>
                    <time dateTime={note.lastUpdatedTime}>
                      {dateTime(note.lastUpdatedTime, zone)}
                    </time>
                  </dd>
                </div>
              </dl>
              {auth.status === "authenticated" ? <Button variant="secondary" onClick={() => setHistoryOpen(true)}><History size={15} />{tr("Version history")}</Button> : null}
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
        <div className="note-view-actions">
          <ContentZoomOutlet popup color={note.backgroundColor ?? undefined} />
          <Button variant="ghost" onClick={onEdit}>
            <Pencil size={15} />
            {tr("Edit")}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            {tr("Close")}
          </Button>
        </div>
      </footer>
    </Modal>
  );
}
type NoteRevision = {
  id: string;
  savedAt: string;
  title: string;
  content: string;
};
function NoteHistory({ note, onClose, onRestored }: { note: Note; onClose: () => void; onRestored: () => void }) {
  useLanguage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const history = useInfiniteQuery({
    queryKey: workspace.key("note-revisions", note.id),
    queryFn: ({ pageParam }) => api.request<{ items: NoteRevision[]; hasNextPage: boolean }>(`/notes/${note.id}/revisions?pageNumber=${pageParam}&pageSize=20`),
    initialPageParam: 1,
    getNextPageParam: (last, _pages, lastPage) => last.hasNextPage ? lastPage + 1 : undefined,
  });
  const items = history.data?.pages.flatMap(page => page.items) ?? [];
  const restore = async (revision: NoteRevision) => {
    setBusy(true); setError(undefined);
    try {
      await api.request(`/notes/${note.id}/revisions/${revision.id}/restore`, { method: "POST", body: { version: note.version } });
      onRestored(); onClose();
    } catch (caught) { setError(caught); }
    finally { setBusy(false); }
  };
  return <Modal open wide title={tr("Version history")} onClose={onClose} className="note-history-modal">
    <div className="modal-body">
      <p>{tr("Current note is saved in history before restoration.")}</p>
      <ErrorBanner error={error ?? history.error} />
      {items.length === 0 && !history.isPending ? <p>{tr("No earlier versions yet.")}</p> : null}
      <div className="note-history-list">
        {items.map(item => <article key={item.id} className="note-history-item">
          <div><strong>{item.title || tr("Untitled")}</strong> · <time dateTime={item.savedAt}>{dateTime(item.savedAt)}</time></div>
          <p>{item.content.slice(0, 500)}</p>
          <Button variant="secondary" disabled={busy} onClick={() => void restore(item)}>{tr("Restore this version")}</Button>
        </article>)}
      </div>
      {history.hasNextPage ? <Button variant="secondary" disabled={busy || history.isFetchingNextPage} onClick={() => void history.fetchNextPage()}>{tr("Load older versions")}</Button> : null}
    </div>
    <div className="modal-footer"><Button variant="secondary" onClick={onClose}>{tr("Close")}</Button></div>
  </Modal>;
}
function EditorSession({
  initial,
  onClose,
  onView,
  fullscreen,
  onFullscreenChange,
}: {
  initial?: Note;
  onClose: () => void;
  onView: (note: Note) => void;
  fullscreen: boolean;
  onFullscreenChange: (value: boolean) => void;
}) {
  useLanguage();
  const state = useAuth();
  const syncState = useSyncExternalStore(offline.subscribe, offline.getSnapshot);
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
  const [characterCount, setCharacterCount] = useState(
    initial?.content.length ?? 0,
  );
  const [closing, setClosing] = useState(false);
  const [viewing, setViewing] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [closePrompt, setClosePrompt] = useState(false);
  const [trashBusy, setTrashBusy] = useState(false);
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
    if (closing || viewing) return;
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
      ? state.status === "guest" ? tr("Saved on this device") : syncState.pending ? tr("Saved on this device; waiting to sync") : tr("All changes saved")
      : snapshot.status === "saving"
        ? tr("Saving…")
        : snapshot.status === "dirty"
          ? tr("Unsaved changes")
          : snapshot.status === "conflict"
            ? tr("Changes need your attention")
            : tr("Could not save");
  return (
    <>
      <Modal
        open
        wide
        onClose={requestClose}
        title={initial ? tr("Edit note") : tr("New note")}
        hideTitle
        className={`note-editor-modal ${fullscreen ? "fullscreen" : ""}`}
        style={{
          ...notePalette(draft.backgroundColor),
          backgroundColor: draft.backgroundColor || undefined,
          ...(draft.backgroundColor
            ? { "--surface": draft.backgroundColor }
            : {}),
        }}
      >
        <div
          className={`editor-heading ${draft.iconEmoji ? "" : "editor-heading-no-icon"}`}
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
                  className={`emoji-trigger ${draft.iconEmoji ? "" : "empty"}`}
                  aria-label={tr("Choose note icon")}
                  title={tr(draft.iconEmoji ? "Choose note icon" : "Add icon")}
                >
                  {draft.iconEmoji || <Plus size={18} aria-hidden="true" />}
                </button>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content
                  className="note-icon-menu"
                  side="bottom"
                  align="start"
                  sideOffset={10}
                  collisionPadding={12}
                  aria-label={tr("Note icons")}
                >
                  <div className="note-icon-grid">
                    {EMOJIS.map((emoji) => (
                      <button
                        key={emoji || "none"}
                        type="button"
                        aria-label={emoji || tr("Remove icon")}
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
                    aria-label={tr("Custom note emoji")}
                    placeholder={tr("Or paste an emoji")}
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
              aria-label={tr("Note title")}
              value={draft.title}
              maxLength={150}
              onChange={(e) => update({ title: e.target.value })}
            />
          </div>
          <div className="row-actions">
            <IconButton
              icon={draft.isPinned ? PinOff : Pin}
              label={draft.isPinned ? tr("Unpin note") : tr("Pin note")}
              className="editor-pin editor-heading-action"
              aria-pressed={draft.isPinned}
              onClick={() => update({ isPinned: !draft.isPinned })}
            />
            <IconButton
              className="editor-heading-action editor-size-toggle"
              icon={fullscreen ? Minimize2 : Maximize2}
              label={
                fullscreen ? tr("Exit full screen") : tr("Enter full screen")
              }
              aria-pressed={fullscreen}
              onClick={() => onFullscreenChange(!fullscreen)}
            />
          </div>
        </div>
        <ErrorBanner error={otherError ?? snapshot.error} />
        {snapshot.status === "conflict" ? (
          <div className="conflict-panel">
            <strong>{tr("Your draft is safe here.")}</strong>
            <p>
              {tr(
                "This note changed elsewhere. Copy your draft or save it as a separate note before loading the server version.",
              )}
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
                        tr(
                          "Clipboard is unavailable. Select and copy the text manually.",
                        ),
                      ),
                    );
                }}
              >
                {tr("Copy draft")}
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
                {tr("Save as new note")}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setClosePrompt(true);
                }}
              >
                {tr("Discard and close")}
              </Button>
            </div>
          </div>
        ) : null}
        <div className="editor-scroll">
          <Suspense fallback={<Spinner label={tr("Loading editor…")} />}>
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
                style={
                  label.color
                    ? { background: labelTint(label.color) ?? undefined }
                    : undefined
                }
                onClick={() =>
                  update({ tagIds: draft.tagIds.filter((x) => x !== id) })
                }
              >
                <Tag
                  size={11}
                  style={label.color ? { color: label.color } : undefined}
                />
                {label.name}
              </button>
            ) : null;
          })}
        </div>
        {tagsOpen ? (
          <div className="label-chooser">
            <div className="section-heading">
              <strong>{tr("Organize with labels")}</strong>
              <IconButton
                icon={X}
                label={tr("Close label chooser")}
                onClick={() => setTagsOpen(false)}
              />
            </div>
            {labels.isError ? (
              <ErrorPanel
                error={labels.error}
                retry={() => void labels.refetch()}
              />
            ) : allLabels.length ? (
              <div className="note-label-options label-chooser-options">
                {allLabels.map((label) => (
                  <button
                    key={label.id}
                    type="button"
                    className="note-label-option"
                    aria-pressed={draft.tagIds.includes(label.id)}
                    disabled={
                      !draft.tagIds.includes(label.id) &&
                      draft.tagIds.length >= 20
                    }
                    onClick={() =>
                      update({
                        tagIds: draft.tagIds.includes(label.id)
                          ? draft.tagIds.filter((x) => x !== label.id)
                          : [...draft.tagIds, label.id],
                      })
                    }
                  >
                    <Tag
                      size={14}
                      aria-hidden="true"
                      style={{ color: label.color ?? undefined }}
                    />
                    <span>{label.name}</span>
                    {draft.tagIds.includes(label.id) ? (
                      <Check size={14} aria-hidden="true" />
                    ) : null}
                  </button>
                ))}
              </div>
            ) : (
              <p className="muted">
                {tr("Create labels from the sidebar to organize your notes.")}
              </p>
            )}
            {labels.hasNextPage ? (
              <Button
                variant="ghost"
                onClick={() => void labels.fetchNextPage()}
              >
                {tr("Load more labels")}
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
              label={tr("Note labels")}
              active={tagsOpen}
              onClick={() => setTagsOpen(!tagsOpen)}
            />
            <IconButton
              icon={Bell}
              label={tr("Note reminders")}
              disabled={state.status === "guest"}
              onClick={() => {
                void save()
                  .then((note) => {
                    if (note) setReminderOpen(true);
                    else
                      toast.info(
                        tr("Write something first, then add a reminder."),
                      );
                  })
                  .catch(() => {});
              }}
            />
            <ActionMenu
              label={tr("Note options")}
              items={[
                {
                  label: tr("Import Markdown"),
                  icon: Upload,
                  action: () => editor.current?.importMarkdown(),
                },
                {
                  label: tr("Export Markdown"),
                  icon: Download,
                  action: () => editor.current?.exportMarkdown(),
                },
                {
                  label: tr("Copy text"),
                  icon: Copy,
                  action: () => {
                    void navigator.clipboard
                      .writeText(editor.current?.plainText() ?? "")
                      .catch(() =>
                        toast.error(tr("Clipboard is unavailable.")),
                      );
                  },
                },
                {
                  label: tr("Move to trash"),
                  icon: Trash2,
                  danger: true,
                  disabled: !snapshot.note || trashBusy,
                  separator: true,
                  action: () => {
                    setTrashBusy(true);
                    void (async () => {
                      const note = await save();
                      if (note) {
                        await workspace.trash(note);
                        coordinator.dispose();
                        onClose();
                      }
                    })()
                      .catch((error) => setOtherError(error))
                      .finally(() => setTrashBusy(false));
                  },
                },
              ]}
            />
          </div>
          <div className="row-actions">
            <span className="editor-count" aria-label={tr("Character count")}>
              {characterCount.toLocaleString(currentLanguage())} /{" "}
              {(100000).toLocaleString(currentLanguage())}
            </span>
            {snapshot.status === "error" ? (
              <Button
                variant="secondary"
                disabled={state.status !== "authenticated" && state.status !== "guest"}
                onClick={() => {
                  void save().catch(() => {});
                }}
              >
                <RotateCcw size={15} />
                {tr("Retry save")}
              </Button>
            ) : null}
            <Button
              variant="ghost"
              busy={viewing}
              disabled={closing}
              onClick={() => {
                if (viewing || closing) return;
                setViewing(true);
                void save()
                  .then((note) => {
                    if (note) onView(note);
                  })
                  .catch(() => {})
                  .finally(() => setViewing(false));
              }}
            >
              <Eye size={15} />
              {tr("View")}
            </Button>
            <Button
              variant="ghost"
              busy={closing}
              disabled={viewing}
              onClick={requestClose}
            >
              {tr("Close")}
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
          title={tr("Keep your changes?")}
          description={tr("Your latest edits have not been saved yet.")}
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
                {tr("Save and continue")}
              </Button>
              <Button variant="danger" onClick={discard}>
                {tr("Discard unsaved changes")}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setClosePrompt(false);
                  if (blocker.state === "blocked") blocker.reset();
                }}
              >
                {tr("Keep editing")}
              </Button>
            </div>
          </div>
        </Modal>
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
