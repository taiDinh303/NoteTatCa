import { memo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSortable } from "@dnd-kit/sortable";
import {
  Bell,
  LockKeyhole,
  Pin,
  PinOff,
  RotateCcw,
  Tag,
  Trash2,
} from "lucide-react";
import type { Note } from "../../domain/models";
import { notePalette } from "../../domain/color";
import { useAuth } from "../../shared/hooks";
import { t as tr, useLanguage } from "../../shared/i18n";
import { ActionMenu, IconButton } from "../../shared/ui";
import { CardLabels } from "./CardLabels";
import { NoteMascot } from "../mascot/NoteMascot";
import { warmNoteEditor } from "../editor/loadNoteEditor";
import type { NoteOpenAction } from "../editor/NoteEditor";
export const NoteCard = memo(function NoteCard({
  note,
  onOpen,
  trash,
  busy,
  onAction,
  draggable,
  onOrganize,
  hasMascot = false,
  hidden = false,
  onUnhide,
}: {
  note: Note;
  onOpen: (id: string) => void;
  trash: boolean;
  busy: boolean;
  onAction: (
    note: Note,
    action: "pin" | "trash" | "restore" | "delete",
  ) => void;
  draggable: boolean;
  onOrganize: (id: string, action: NoteOpenAction) => void;
  hasMascot?: boolean;
  hidden?: boolean;
  onUnhide?: (note: Note) => void;
}) {
  useLanguage();
  const guestMode = useAuth().status === "guest";
  const navigateTo = useNavigate();
  const {
    setNodeRef,
    transform,
    transition,
    isSorting,
    isDragging,
    attributes,
    listeners,
  } = useSortable({
    id: note.id,
    disabled: !draggable,
    // The release is animated once, from the actual painted positions below.
    animateLayoutChanges: () => false,
    transition: { duration: 220, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
  });
  // The title/preview buttons are also drag surfaces. Keep action controls
  // independent, and leave keyboard activation on the accessible handle.
  const canStartDrag = (target: EventTarget) =>
    target instanceof Element &&
    (!target.closest("button, a, input, [role='menuitem']") ||
      !!target.closest(".note-open, .note-card-identity, .drag-handle"));
  const [now] = useState(() => Date.now());
  const expiry = note.deletedTime
    ? Math.max(
        0,
        Math.ceil(
          (Date.parse(note.deletedTime) + 30 * 86400000 - now) / 86400000,
        ),
      )
    : null;
  const title = note.title?.trim() || tr("Untitled");
  return (
    <article
      ref={setNodeRef}
      style={{
        ...notePalette(note.backgroundColor),
        // Dnd-kit measures screen pixels; CSS transforms use pixels before the
        // notes layer's scale. Translate only, so unequal cards keep their shape.
        transform: transform
          ? `translate3d(calc(${transform.x}px / var(--notes-scale, 1)), calc(${transform.y}px / var(--notes-scale, 1)), 0)`
          : undefined,
        transition: !isDragging && isSorting ? transition : "none",
        backgroundColor: note.backgroundColor || undefined,
        opacity: isDragging ? 0.95 : 1,
      }}
      className={`note-card ${draggable ? "draggable" : ""} ${isDragging ? "dragging" : ""} ${note.backgroundColor ? "colored" : ""}`}
      data-testid={`note-${note.id}`}
      onPointerEnter={warmNoteEditor}
      onFocus={warmNoteEditor}
      onClick={(event) => {
        // Title/preview and action controls handle their own clicks. Let the
        // rest of the card open the note without nesting interactive elements.
        if (
          !event.defaultPrevented &&
          event.target instanceof Element &&
          !event.target.closest(
            "button, a, input, select, textarea, [role='menuitem']",
          )
        )
          onOpen(note.id);
      }}
      data-sort-animating={
        transition && !transition.startsWith("transform 0ms")
          ? "true"
          : undefined
      }
      onMouseDown={(event) => {
        if (canStartDrag(event.target)) listeners?.onMouseDown?.(event);
      }}
      onTouchStart={(event) => {
        warmNoteEditor();
        if (canStartDrag(event.target)) listeners?.onTouchStart?.(event);
      }}
    >
      <div className="note-card-top">
        {note.title?.trim() ? (
          <button
            type="button"
            className="note-card-identity"
            onClick={() => onOpen(note.id)}
            aria-label={tr("View {0}", title)}
          >
            {note.title?.trim() ? (
              <h3 title={note.title}>{note.title}</h3>
            ) : null}
          </button>
        ) : null}
        <div className="row-actions">
          {draggable ? (
            <button
              type="button"
              className="sr-only drag-handle"
              aria-label={tr("Move {0}", title)}
              title={tr("Drag to move. Keyboard: Space, arrow keys, Space.")}
              {...attributes}
              onKeyDown={(event) => listeners?.onKeyDown?.(event)}
            >
              {tr("Move {0}", title)}
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
              onClick={() => onAction(note, "pin")}
            />
          ) : null}
        </div>
      </div>
      <button
        type="button"
        className="note-open"
        onClick={() => onOpen(note.id)}
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
      <div className="note-card-footer">
        {note.tags.length ? <CardLabels labels={note.tags} /> : null}
        {trash ? (
          <span className="note-date">
            {expiry
              ? tr(expiry === 1 ? "{0} day left" : "{0} days left", expiry)
              : tr("Retention elapsed")}
          </span>
        ) : null}
        <div className="row-actions">
          {!trash && !hidden && note.reminders.some((r) => r.isActive) ? (
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
                onClick={() => onAction(note, "restore")}
              />
              <IconButton
                icon={Trash2}
                label={tr("Delete {0} permanently", title)}
                disabled={busy}
                onClick={() => onAction(note, "delete")}
              />
            </>
          ) : (
            <ActionMenu
              label={tr("Actions for {0}", title)}
              align="start"
              items={[
                ...(!guestMode
                  ? [
                      {
                        label: tr(hidden ? "Unhide note" : "Hide note"),
                        icon: LockKeyhole,
                        action: () =>
                          hidden
                            ? onUnhide?.(note)
                            : navigateTo("/hidden-notes", {
                                state: { hideNoteId: note.id },
                              }),
                        disabled: busy,
                      },
                    ]
                  : []),
                {
                  label: tr("Add label"),
                  icon: Tag,
                  action: () => onOrganize(note.id, "labels"),
                  disabled: busy,
                },
                {
                  label: tr("Add reminder"),
                  icon: Bell,
                  action: () => onOrganize(note.id, "reminder"),
                  disabled: busy || guestMode || hidden,
                },
                {
                  label: tr("Move to trash"),
                  icon: Trash2,
                  danger: true,
                  separator: true,
                  action: () => onAction(note, "trash"),
                  disabled: busy,
                },
              ]}
            />
          )}
        </div>
      </div>
      {/* The bunny sits on one card at a time and follows the last opened note. */}
      {hasMascot ? <NoteMascot size={80} /> : null}
    </article>
  );
});
