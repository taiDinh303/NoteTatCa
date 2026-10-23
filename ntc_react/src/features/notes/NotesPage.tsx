import { t as tr, useLanguage } from "../../shared/i18n";
import { lazy, Suspense, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowDown,
  ArrowUp,
  Bell,
  FileText,
  GripVertical,
  LayoutGrid,
  List,
  Pin,
  PinOff,
  Plus,
  RotateCcw,
  Search,
  Tag,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { Note, NoteFilter } from "../../domain/models";
import { sortNotes } from "../../domain/models";
import { labelTint, notePalette } from "../../domain/color";
import { workspace } from "../../app/runtime";
import { useDebounced, useLabels, useNotes } from "../../shared/hooks";
import {
  ActionMenu,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorPanel,
  IconButton,
  Select,
  SkeletonCards,
  Spinner,
} from "../../shared/ui";
import { errorMessage, shortDate } from "../../shared/utils";
const NoteEditor = lazy(() => import("../editor/NoteEditor"));
import type { NoteOpenAction } from "../editor/NoteEditor";
function NoteCard({
  note,
  onOpen,
  trash,
  busy,
  onAction,
  onMove,
  draggable,
  onOrganize,
}: {
  note: Note;
  onOpen: () => void;
  trash: boolean;
  busy: boolean;
  onAction: (action: "pin" | "trash" | "restore" | "delete") => void;
  onMove: (direction: number) => void;
  draggable: boolean;
  onOrganize: (action: NoteOpenAction) => void;
}) {
  useLanguage();
  const {
    setNodeRef,
    transform,
    transition,
    isDragging,
    attributes,
    listeners,
  } = useSortable({ id: note.id, disabled: !draggable });
  const [now] = useState(() => Date.now());
  const expiry = note.deletedTime
    ? Math.max(
        0,
        Math.ceil(
          (Date.parse(note.deletedTime) + 7 * 86400000 - now) / 86400000,
        ),
      )
    : null;
  const title = note.title?.trim() || tr("Untitled");
  return (
    <article
      ref={setNodeRef}
      style={{
        ...notePalette(note.backgroundColor),
        // Rect sorting also supplies scale factors for differently sized cards.
        // Move cards without stretching their text, icons or height.
        transform: CSS.Translate.toString(transform),
        transition: transition,
        backgroundColor: note.backgroundColor || undefined,
        opacity: isDragging ? 0.95 : 1,
      }}
      className={`note-card ${isDragging ? "dragging" : ""} ${note.backgroundColor ? "colored" : ""}`}
      data-testid={`note-${note.id}`}
    >
      <div className="note-card-top">
        {note.iconEmoji || note.title?.trim() ? (
          <button
            type="button"
            className="note-card-identity"
            onClick={onOpen}
            aria-label={tr("View {0}", title)}
          >
            {note.iconEmoji ? (
              <span className="note-emoji">{note.iconEmoji}</span>
            ) : null}
            {note.title?.trim() ? (
              <h3 title={note.title}>{note.title}</h3>
            ) : null}
          </button>
        ) : null}
        <div className="row-actions">
          {draggable ? (
            <button
              type="button"
              className="icon-button drag-handle"
              aria-label={tr("Move {0}", title)}
              title={tr("Drag to move. Keyboard: Space, arrow keys, Space.")}
              {...attributes}
              {...listeners}
            >
              <GripVertical size={16} />
            </button>
          ) : null}
          {!trash ? (
            <IconButton
              icon={note.isPinned ? PinOff : Pin}
              label={
                note.isPinned ? tr("Unpin {0}", title) : tr("Pin {0}", title)
              }
              active={note.isPinned}
              disabled={busy}
              onClick={() => onAction("pin")}
            />
          ) : null}
        </div>
      </div>
      <button
        type="button"
        className="note-open"
        onClick={onOpen}
        aria-label={tr("Open {0}", title)}
      >
        {note.content ? (
          <p
            className={`note-preview ${note.documentJson?.includes("taskList") ? "checklist-preview" : ""}`}
          >
            {note.content.slice(0, 600)}
          </p>
        ) : (
          <p className="note-preview empty-preview">
            {tr("A blank page, full of possibilities.")}
          </p>
        )}
      </button>
      {note.tags.length ? (
        <div className="note-tags">
          {note.tags.slice(0, 3).map((t) => (
            <span
              key={t.id}
              className="label-chip"
              style={t.color ? { background: labelTint(t.color) ?? undefined } : undefined}
            >
              <Tag size={10} style={t.color ? { color: t.color } : undefined} />
              {t.name}
            </span>
          ))}
          {note.tags.length > 3 ? (
            <span className="label-chip">+{note.tags.length - 3}</span>
          ) : null}
        </div>
      ) : null}
      <div className="note-card-footer">
        <span className="note-date">
          {trash
            ? expiry
              ? tr(expiry === 1 ? "{0} day left" : "{0} days left", expiry)
              : tr("Retention elapsed")
            : shortDate(note.lastUpdatedTime)}
        </span>
        <div className="row-actions">
          {!trash && note.reminders.some((r) => r.isActive) ? (
            <span
              className="reminder-indicator"
              title={tr("Has active reminders")}
            >
              <Bell size={13} />
            </span>
          ) : null}
          {trash ? (
            <>
              <IconButton
                icon={RotateCcw}
                label={tr("Restore {0}", title)}
                disabled={busy || expiry === 0}
                onClick={() => onAction("restore")}
              />
              <IconButton
                icon={Trash2}
                label={tr("Delete {0} permanently", title)}
                disabled={busy}
                onClick={() => onAction("delete")}
              />
            </>
          ) : (
            <ActionMenu
              label={tr("Actions for {0}", title)}
              items={[
                {
                  label: tr("Add label"),
                  icon: Tag,
                  action: () => onOrganize("labels"),
                  disabled: busy,
                },
                {
                  label: tr("Add reminder"),
                  icon: Bell,
                  action: () => onOrganize("reminder"),
                  disabled: busy,
                },
                {
                  label: tr("Move earlier"),
                  icon: ArrowUp,
                  action: () => onMove(-1),
                  disabled: !draggable || busy,
                },
                {
                  label: tr("Move later"),
                  icon: ArrowDown,
                  action: () => onMove(1),
                  disabled: !draggable || busy,
                },
                {
                  label: tr("Move to trash"),
                  icon: Trash2,
                  danger: true,
                  separator: true,
                  action: () => onAction("trash"),
                  disabled: busy,
                },
              ]}
            />
          )}
        </div>
      </div>
    </article>
  );
}
export default function NotesPage({
  trash = false,
  reminderView = false,
}: {
  trash?: boolean;
  reminderView?: boolean;
}) {
  useLanguage();
  const { tagId } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const q = useDebounced(params.get("q") ?? "");
  const [pinFilter, setPinFilter] = useState("all");
  const filter: NoteFilter = {
    ...(q ? { q } : {}),
    ...(tagId ? { tagId } : {}),
    ...(trash ? { trash: true } : {}),
    ...(reminderView ? { hasReminder: true } : {}),
    ...(pinFilter === "pinned"
      ? { pinned: true }
      : pinFilter === "unpinned"
        ? { pinned: false }
        : {}),
  };
  const query = useNotes(filter);
  const labels = useLabels();
  const [editor, setEditor] = useState<{
    id?: string;
    action?: NoteOpenAction;
  } | null>(null);
  const selected = params.get("note");
  const [view, setView] = useState(() => {
    try {
      return localStorage.getItem("ntc.view.v1") === "list" ? "list" : "grid";
    } catch {
      return "grid";
    }
  });
  const [confirm, setConfirm] = useState<{
    note: Note;
    action: "trash" | "delete";
  }>();
  const [pending, setPending] = useState<string>();
  const all = sortNotes(query.data?.pages.flatMap((p) => p.items) ?? []);
  const label = labels.data?.pages
    .flatMap((p) => p.items)
    .find((l) => l.id === tagId);
  const canDrag =
    !trash && !q && !tagId && !reminderView && !query.hasNextPage && !pending;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 7 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  async function act(
    note: Note,
    action: "pin" | "trash" | "restore" | "delete",
  ) {
    if (action === "trash" || action === "delete") {
      setConfirm({ note, action });
      return;
    }
    setPending(note.id);
    try {
      if (action === "pin") await workspace.pin(note);
      else await workspace.restore(note);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(undefined);
    }
  }
  async function reorder(group: Note[], from: number, to: number) {
    if (from === to || to < 0 || to >= group.length) return;
    setPending(group[from].id);
    try {
      await workspace.reorder(group, from, to);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(undefined);
    }
  }
  function dragEnd(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) return;
    const note = all.find((n) => n.id === event.active.id),
      over = all.find((n) => n.id === event.over!.id);
    if (!note || !over || note.isPinned !== over.isPinned) {
      toast.info(tr("Move notes within the same pinned group."));
      return;
    }
    const group = all.filter((n) => n.isPinned === note.isPinned);
    void reorder(
      group,
      group.findIndex((n) => n.id === note.id),
      group.findIndex((n) => n.id === over.id),
    );
  }
  function closeEditor() {
    setEditor(null);
    if (params.has("note")) {
      const next = new URLSearchParams(params);
      next.delete("note");
      setParams(next, { replace: true });
    }
  }
  const renderGroup = (group: Note[], title: string) =>
    group.length ? (
      <section className="notes-section">
        <div className="section-heading">
          <h2>
            {title}
            <span>{group.length}</span>
          </h2>
        </div>
        <SortableContext
          items={group.map((n) => n.id)}
          strategy={rectSortingStrategy}
        >
          <div className={`note-grid ${view === "list" ? "list-view" : ""}`}>
            {group.map((note, index) => (
              <NoteCard
                key={note.id}
                note={note}
                busy={pending === note.id}
                trash={trash}
                draggable={canDrag}
                onOrganize={(action) => setEditor({ id: note.id, action })}
                onOpen={() => {
                  if (trash) {
                    navigate(`/trash?note=${note.id}`);
                    setEditor({ id: note.id });
                  } else setEditor({ id: note.id });
                }}
                onAction={(action) => void act(note, action)}
                onMove={(direction) =>
                  void reorder(group, index, index + direction)
                }
              />
            ))}
          </div>
        </SortableContext>
      </section>
    ) : null;
  return (
    <>
      <h1
        className={
          !trash && !tagId && reminderView ? "notes-context-title" : "sr-only"
        }
      >
        {trash
          ? tr("Trash")
          : tagId
            ? (label?.name ?? tr("Label"))
            : reminderView
              ? tr("Notes with reminders")
              : q
                ? tr("Search results")
                : tr("Notes")}
      </h1>
      {trash ? (
        <div className="notice-strip">
          <Trash2 size={16} />
          {tr(
            "Deleted notes are permanently removed after the seven-day retention period.",
          )}
        </div>
      ) : null}
      <div className="workspace-toolbar">
        {!trash ? (
          <button
            className="quick-capture"
            aria-label={tr("Take a note")}
            onClick={() => setEditor({})}
          >
            <span className="quick-capture-icon">
              <Plus size={14} />
            </span>
            <span>{tr("New")}</span>
          </button>
        ) : null}
        <div className="row-actions">
          {!trash ? (
            <Select
              label={tr("Filter pinned notes")}
              value={pinFilter}
              onChange={setPinFilter}
            >
              <option value="all">{tr("All notes")}</option>
              <option value="pinned">{tr("Pinned only")}</option>
              <option value="unpinned">{tr("Unpinned only")}</option>
            </Select>
          ) : null}
          <div
            className="view-toggle"
            role="group"
            aria-label={tr("Notes view")}
          >
            {[
              ["grid", LayoutGrid],
              ["list", List],
            ].map(([name, Icon]) => {
              const Component = Icon as typeof LayoutGrid;
              return (
                <IconButton
                  key={String(name)}
                  icon={Component}
                  label={tr(
                    "{0} view",
                    tr(name === "grid" ? "Grid" : "List").toLocaleLowerCase(),
                  )}
                  active={view === name}
                  onClick={() => {
                    setView(String(name));
                    try {
                      localStorage.setItem("ntc.view.v1", String(name));
                    } catch {
                      /* Preference persistence is optional. */
                    }
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>
      {query.isPending ? (
        <SkeletonCards />
      ) : query.isError ? (
        <ErrorPanel error={query.error} retry={() => void query.refetch()} />
      ) : all.length === 0 ? (
        <EmptyState
          icon={trash ? Trash2 : q ? Search : FileText}
          title={
            trash
              ? tr("A clean slate")
              : q
                ? tr("No notes found")
                : tr("Your next idea starts here")
          }
          description={
            trash
              ? tr(
                  "Nothing in the trash. Your notes are right where they belong.",
                )
              : q
                ? tr("Try another phrase or remove a filter.")
                : tr(
                    "A thought, a list, a plan. Give it a home in your first note.",
                  )
          }
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={dragEnd}
        >
          {trash ? (
            renderGroup(all, tr("Deleted notes"))
          ) : (
            <>
              {renderGroup(
                all.filter((n) => n.isPinned),
                tr("Pinned"),
              )}
              {renderGroup(
                all.filter((n) => !n.isPinned),
                all.some((n) => n.isPinned)
                  ? tr("Everything else")
                  : tr("All notes"),
              )}
            </>
          )}
        </DndContext>
      )}
      {query.hasNextPage ? (
        <div className="load-more">
          <Button
            variant="secondary"
            busy={query.isFetchingNextPage}
            onClick={() => void query.fetchNextPage()}
          >
            {tr("Load more notes")}
          </Button>
          <span className="field-hint">
            {tr("Load all notes to enable reordering.")}
          </span>
        </div>
      ) : null}
      {editor || selected ? (
        <Suspense fallback={<Spinner label={tr("Opening editor…")} />}>
          {trash ? (
            <TrashViewer id={editor?.id ?? selected!} onClose={closeEditor} />
          ) : (
            <NoteEditor
              key={`${editor?.id ?? selected ?? "new"}:${editor?.action ?? "view"}`}
              initialAction={editor?.action}
              noteId={editor?.id ?? selected ?? undefined}
              onClose={closeEditor}
            />
          )}
        </Suspense>
      ) : null}
      {confirm ? (
        <ConfirmDialog
          title={
            confirm.action === "trash"
              ? tr("Move to trash?")
              : tr("Permanently delete note?")
          }
          description={
            confirm.action === "trash"
              ? tr(
                  "You can restore this note for seven days. Future reminders will stop.",
                )
              : tr(
                  "This removes the note and its related reminders permanently. This cannot be undone.",
                )
          }
          confirmLabel={
            confirm.action === "trash"
              ? tr("Move to trash")
              : tr("Delete permanently")
          }
          danger={confirm.action === "delete"}
          onClose={() => setConfirm(undefined)}
          onConfirm={async () => {
            setPending(confirm.note.id);
            try {
              if (confirm.action === "trash")
                await workspace.trash(confirm.note);
              else await workspace.delete(confirm.note);
            } finally {
              setPending(undefined);
            }
          }}
        />
      ) : null}
    </>
  );
}
import { useQuery } from "@tanstack/react-query";
import { notes } from "../../app/runtime";
import { Modal } from "../../shared/ui";
function TrashViewer({ id, onClose }: { id: string; onClose: () => void }) {
  useLanguage();
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState<unknown>();
  const query = useQuery({
    queryKey: workspace.key("trash-note", id),
    queryFn: ({ signal }) => notes.findTrashed(id, signal),
  });
  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={query.data?.title || tr("Untitled")}
      description={tr(
        "This note is in the trash. Restore it to continue editing.",
      )}
    >
      <div className="modal-body">
        {restoreError ? <ErrorPanel error={restoreError} /> : null}
        {query.isPending ? (
          <Spinner />
        ) : query.isError ? (
          <ErrorPanel error={query.error} retry={() => void query.refetch()} />
        ) : (
          <>
            <pre className="trash-content">{query.data.content}</pre>
            <Button
              busy={restoring}
              onClick={async () => {
                setRestoring(true);
                try {
                  await workspace.restore(query.data);
                  onClose();
                } catch (error) {
                  setRestoreError(error);
                } finally {
                  setRestoring(false);
                }
              }}
            >
              <RotateCcw size={16} />
              {tr("Restore note")}
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
}
