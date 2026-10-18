import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, Clock3, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cache, reminders, workspace } from "../../app/runtime";
import type { Reminder, ReminderInput } from "../../domain/models";
import { REPEAT_NAMES, WEEKDAYS } from "../../domain/models";
import {
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorBanner,
  ErrorPanel,
  Field,
  IconButton,
  Modal,
  Spinner,
} from "../../shared/ui";
import { dateTime } from "../../shared/utils";
export function ReminderForm({
  noteId,
  initial,
  zone,
  onDone,
  onCancel,
}: {
  noteId: string;
  initial?: Reminder;
  zone: string;
  onDone: () => Promise<void> | void;
  onCancel: () => void;
}) {
  const [repeat, setRepeat] = useState(initial?.repeatType ?? 0);
  const [days, setDays] = useState(initial?.repeatDays ?? 0);
  const [ending, setEnding] = useState(
    initial?.repeatCount ? "count" : initial?.repeatUntil ? "until" : "never",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [date] = useState(
    () => new Date(initial?.reminderAt ?? Date.now() + 60 * 60 * 1000),
  );
  const localInput = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
  return (
    <form
      className="reminder-form"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        setBusy(true);
        setError(undefined);
        const body: ReminderInput = {
          reminderAt: new Date(String(data.get("at"))).toISOString(),
          timeZoneId: String(data.get("zone")),
          repeatType: repeat,
          repeatInterval: repeat ? Number(data.get("interval")) : 1,
          repeatDays: repeat === 2 ? days : null,
          repeatCount:
            repeat && ending === "count" ? Number(data.get("count")) : null,
          repeatUntil:
            repeat && ending === "until"
              ? new Date(String(data.get("until"))).toISOString()
              : null,
          sendEmail: data.get("email") === "on",
        };
        void (
          initial
            ? reminders.patch(initial, body)
            : reminders.create(noteId, body)
        )
          .then(async () => {
            toast.success(initial ? "Reminder updated" : "Reminder set");
            await onDone();
          })
          .catch(setError)
          .finally(() => setBusy(false));
      }}
    >
      <ErrorBanner error={error} />
      <Field
        label="Date & time"
        hint={`Time input uses your browser’s timezone (${Intl.DateTimeFormat().resolvedOptions().timeZone}). Recurrence uses the timezone below.`}
      >
        <input
          type="datetime-local"
          name="at"
          defaultValue={localInput}
          required
        />
      </Field>
      <Field label="Recurrence timezone">
        <input
          name="zone"
          defaultValue={initial?.timeZoneId ?? zone}
          list="timezones"
          required
          maxLength={100}
        />
        <datalist id="timezones">
          {[
            "Asia/Ho_Chi_Minh",
            "UTC",
            "Asia/Bangkok",
            "Europe/London",
            "America/New_York",
            "Asia/Tokyo",
          ].map((z) => (
            <option key={z}>{z}</option>
          ))}
        </datalist>
      </Field>
      <div className="form-grid">
        <Field label="Repeat">
          <select
            value={repeat}
            onChange={(e) => setRepeat(Number(e.target.value))}
          >
            {REPEAT_NAMES.map((n, i) => (
              <option key={n} value={i}>
                {n}
              </option>
            ))}
          </select>
        </Field>
        {repeat ? (
          <Field label="Every">
            <input
              type="number"
              name="interval"
              min={1}
              max={365}
              defaultValue={initial?.repeatInterval ?? 1}
              required
            />
          </Field>
        ) : null}
      </div>
      {repeat === 2 ? (
        <fieldset className="weekday-picker">
          <legend>On these days</legend>
          {WEEKDAYS.map(([day, mask]) => (
            <label key={day} className={days & mask ? "selected" : ""}>
              <input
                type="checkbox"
                checked={Boolean(days & mask)}
                onChange={() => setDays((value) => value ^ mask)}
              />
              {day}
            </label>
          ))}
        </fieldset>
      ) : null}
      {repeat ? (
        <div className="form-grid">
          <Field label="Ends">
            <select value={ending} onChange={(e) => setEnding(e.target.value)}>
              <option value="never">Never</option>
              <option value="count">After occurrences</option>
              <option value="until">On date</option>
            </select>
          </Field>
          {ending === "count" ? (
            <Field label="Occurrences (including first)">
              <input
                type="number"
                name="count"
                min={1}
                max={100000}
                required
                defaultValue={initial?.repeatCount ?? 10}
              />
            </Field>
          ) : ending === "until" ? (
            <Field label="Last date & time">
              <input
                type="datetime-local"
                name="until"
                defaultValue={
                  initial?.repeatUntil
                    ? new Date(
                        new Date(initial.repeatUntil).getTime() -
                          new Date(initial.repeatUntil).getTimezoneOffset() *
                            60000,
                      )
                        .toISOString()
                        .slice(0, 16)
                    : undefined
                }
                required
              />
            </Field>
          ) : null}
        </div>
      ) : null}
      <label className="check-label">
        <input
          type="checkbox"
          name="email"
          defaultChecked={initial?.sendEmail ?? true}
        />{" "}
        Also send an email reminder
      </label>
      <p className="field-hint">
        Reminders always appear in your inbox. Changing this schedule keeps past
        inbox notifications.
      </p>
      <div className="form-actions">
        <Button variant="secondary" onClick={onCancel} type="button">
          Cancel
        </Button>
        <Button busy={busy} type="submit">
          {initial ? "Save reminder" : "Set reminder"}
        </Button>
      </div>
    </form>
  );
}
export default function ReminderDialog({
  noteId,
  title,
  zone,
  onClose,
}: {
  noteId: string;
  title: string;
  zone: string;
  onClose: () => void;
}) {
  const query = useQuery({
    queryKey: workspace.key("note-reminders", noteId),
    queryFn: () => reminders.forNote(noteId),
  });
  const [editing, setEditing] = useState<Reminder | null | undefined>();
  const [deleting, setDeleting] = useState<Reminder>();
  const [error, setError] = useState<unknown>();
  async function refresh() {
    await Promise.all([
      query.refetch(),
      cache.invalidateQueries({ queryKey: workspace.key("reminders") }),
      cache.invalidateQueries({ queryKey: workspace.key("notes") }),
    ]);
    setEditing(undefined);
  }
  return (
    <Modal
      open
      onClose={onClose}
      title="Reminders"
      description={title || "Untitled note"}
    >
      <div className="modal-body">
        <ErrorBanner error={error} />
        {editing !== undefined ? (
          <ReminderForm
            key={editing?.id ?? "new"}
            noteId={noteId}
            initial={editing ?? undefined}
            zone={zone}
            onDone={refresh}
            onCancel={() => setEditing(undefined)}
          />
        ) : (
          <>
            {query.isPending ? (
              <Spinner />
            ) : query.isError ? (
              <ErrorPanel
                error={query.error}
                retry={() => void query.refetch()}
              />
            ) : !query.data.length ? (
              <EmptyState
                icon={Bell}
                title="Give it a little nudge"
                description="Choose when this note should find you again."
              />
            ) : (
              <div className="reminder-list">
                {query.data.map((reminder) => (
                  <div className="reminder-row" key={reminder.id}>
                    <Clock3 size={19} />
                    <div>
                      <strong>
                        {dateTime(
                          reminder.nextOccurrenceAt ?? reminder.reminderAt,
                          reminder.timeZoneId,
                        )}
                      </strong>
                      <span>
                        {REPEAT_NAMES[reminder.repeatType]} ·{" "}
                        {reminder.isActive ? "Active" : "Paused"} ·{" "}
                        {reminder.timeZoneId}
                      </span>
                    </div>
                    <IconButton
                      icon={Pencil}
                      label="Edit reminder"
                      onClick={() => setEditing(reminder)}
                    />
                    <IconButton
                      icon={Trash2}
                      label="Delete reminder"
                      onClick={() => setDeleting(reminder)}
                    />
                  </div>
                ))}
              </div>
            )}
            <Button
              variant="secondary"
              disabled={
                (query.data?.filter((r) => r.isActive).length ?? 0) >= 5
              }
              onClick={() => {
                setError(undefined);
                setEditing(null);
              }}
            >
              <Plus size={16} />
              Add reminder
            </Button>
            <p className="field-hint">Up to five active reminders per note.</p>
          </>
        )}
      </div>
      {deleting ? (
        <ConfirmDialog
          title="Delete reminder?"
          description="Future reminders will stop. This note will be kept."
          confirmLabel="Delete reminder"
          danger
          onClose={() => setDeleting(undefined)}
          onConfirm={async () => {
            try {
              await reminders.delete(deleting.id);
              await refresh();
            } catch (error) {
              setError(error);
              throw error;
            }
          }}
        />
      ) : null}
    </Modal>
  );
}
