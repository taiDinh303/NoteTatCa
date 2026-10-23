import { t as tr, useLanguage } from "../../shared/i18n";
import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Bell,
  CalendarDays,
  Clock3,
  Mail,
  Pause,
  Pencil,
  Play,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cache, reminders, workspace } from "../../app/runtime";
import type { Reminder } from "../../domain/models";
import { REPEAT_NAMES } from "../../domain/models";
import { useAuth, useMe } from "../../shared/hooks";
import {
  ActionMenu,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorPanel,
  Modal,
  Spinner,
} from "../../shared/ui";
import { dateTime, errorMessage } from "../../shared/utils";
import { ReminderForm } from "./ReminderDialog";
export default function RemindersPage() {
  useLanguage();
  const state = useAuth();
  const me = useMe();
  const query = useInfiniteQuery({
    queryKey: workspace.key("reminders"),
    queryFn: ({ pageParam, signal }) => reminders.list(pageParam, signal),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.hasNextPage ? last.currentPage + 1 : undefined,
    enabled: state.status === "authenticated",
    refetchOnMount: "always",
  });
  const [editing, setEditing] = useState<Reminder>();
  const [deleting, setDeleting] = useState<Reminder>();
  const [busy, setBusy] = useState<string>();
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  async function refresh() {
    await Promise.all([
      query.refetch(),
      cache.invalidateQueries({ queryKey: workspace.key("notes") }),
      cache.invalidateQueries({ queryKey: workspace.key("note-reminders") }),
    ]);
  }
  async function toggle(reminder: Reminder) {
    setBusy(reminder.id);
    try {
      await reminders.patch(reminder, { isActive: !reminder.isActive });
      await refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(undefined);
    }
  }
  return (
    <>
      <h1 className="sr-only">{tr("Reminders")}</h1>
      <div className="feature-banner">
        <div className="feature-icon">
          <CalendarDays size={27} />
        </div>
        <div>
          <strong>{tr("Let your notes find you.")}</strong>
          <p>
            {tr(
              "Open any note and tap the bell to set a reminder. Recurring reminders follow your chosen timezone.",
            )}
          </p>
        </div>
        <Link className="button secondary" to="/notes">
          {tr("Go to notes")}
        </Link>
      </div>
      {query.isPending ? (
        <Spinner label={tr("Finding your reminders…")} />
      ) : query.isError ? (
        <ErrorPanel error={query.error} retry={() => void query.refetch()} />
      ) : !items.length ? (
        <EmptyState
          icon={Bell}
          title={tr("Nothing to remember just yet")}
          description={tr(
            "Add a reminder to a note, and it will find its way here.",
          )}
        />
      ) : (
        <div className="reminders-board">
          {items.map((reminder) => (
            <article
              className={`reminder-card ${!reminder.isActive ? "paused" : ""}`}
              key={reminder.id}
            >
              <div className="reminder-card-icon">
                <Bell size={20} />
              </div>
              <div className="reminder-card-content">
                <Link to={`/notes?note=${reminder.noteId}`}>
                  <h2>{reminder.noteTitle || tr("Untitled")}</h2>
                </Link>
                <p>
                  <Clock3 size={14} />
                  {dateTime(
                    reminder.nextOccurrenceAt ?? reminder.reminderAt,
                    reminder.timeZoneId,
                  )}
                </p>
                <div className="reminder-meta">
                  <span>
                    {tr(REPEAT_NAMES[reminder.repeatType])}
                    {reminder.repeatInterval > 1
                      ? tr("· every {0}", reminder.repeatInterval)
                      : ""}
                  </span>
                  <span>{reminder.timeZoneId}</span>
                  {reminder.sendEmail ? (
                    <span>
                      <Mail size={11} />
                      {tr("Email")}
                    </span>
                  ) : null}
                </div>
              </div>
              <span
                className={`status-pill ${reminder.isActive ? "success" : ""}`}
              >
                {reminder.isActive ? tr("Active") : tr("Paused")}
              </span>
              <ActionMenu
                label={tr("Reminder actions")}
                items={[
                  {
                    label: tr("Edit reminder"),
                    icon: Pencil,
                    action: () => setEditing(reminder),
                    disabled: busy === reminder.id,
                  },
                  {
                    label: reminder.isActive
                      ? tr("Pause reminder")
                      : tr("Enable reminder"),
                    icon: reminder.isActive ? Pause : Play,
                    action: () => void toggle(reminder),
                    disabled: busy === reminder.id,
                  },
                  {
                    label: tr("Delete reminder"),
                    icon: Trash2,
                    danger: true,
                    separator: true,
                    action: () => setDeleting(reminder),
                    disabled: busy === reminder.id,
                  },
                ]}
              />
            </article>
          ))}
        </div>
      )}
      {query.hasNextPage ? (
        <Button
          variant="secondary"
          busy={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          {tr("Load more reminders")}
        </Button>
      ) : null}
      {editing ? (
        <Modal
          open
          onClose={() => setEditing(undefined)}
          title={tr("Edit reminder")}
        >
          <div className="modal-body">
            <ReminderForm
              noteId={editing.noteId}
              initial={editing}
              zone={
                me.data?.account.timeZoneId ??
                state.session?.timeZoneId ??
                "Asia/Ho_Chi_Minh"
              }
              onDone={async () => {
                await refresh();
                setEditing(undefined);
              }}
              onCancel={() => setEditing(undefined)}
            />
          </div>
        </Modal>
      ) : null}
      {deleting ? (
        <ConfirmDialog
          title={tr("Delete reminder?")}
          description={tr(
            "Future reminders will stop. Your note will be kept.",
          )}
          confirmLabel={tr("Delete reminder")}
          danger
          onClose={() => setDeleting(undefined)}
          onConfirm={async () => {
            await reminders.delete(deleting.id);
            await refresh();
          }}
        />
      ) : null}
    </>
  );
}
