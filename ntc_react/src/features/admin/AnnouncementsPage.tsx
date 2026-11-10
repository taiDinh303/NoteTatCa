import { useEffect, useState } from "react";
import { useBlocker } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bell, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { admin, auth, cache, workspace } from "../../app/runtime";
import type {
  AnnouncementDetail,
  AnnouncementDraft,
  AnnouncementPreview,
} from "../../domain/models";
import { useDebounced } from "../../shared/hooks";
import { t as tr, useLanguage } from "../../shared/i18n";
import {
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorBanner,
  ErrorPanel,
  Field,
  Modal,
  PageHeading,
  Spinner,
} from "../../shared/ui";
import { dateTime } from "../../shared/utils";
import "./AnnouncementsPage.css";

const empty = (): AnnouncementDraft => ({
  title: "",
  body: "",
  allActiveUsers: true,
  userIds: [],
});
function formFrom(detail: AnnouncementDetail): AnnouncementDraft {
  return {
    title: detail.announcement.title,
    body: detail.announcement.body,
    allActiveUsers: detail.announcement.allActiveUsers,
    userIds: detail.userIds,
    expectedVersion: detail.announcement.version,
  };
}
export default function AnnouncementsPage() {
  useLanguage();
  const [page, setPage] = useState(1);
  const [createRequestId, setCreateRequestId] = useState(() =>
    crypto.randomUUID(),
  );
  const [detail, setDetail] = useState<AnnouncementDetail>();
  const [form, setForm] = useState<AnnouncementDraft>(empty);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [preview, setPreview] = useState<
    AnnouncementPreview & { requestId: string }
  >();
  const [revoke, setRevoke] = useState(false);
  const dirty =
    editing &&
    JSON.stringify(form) !==
      JSON.stringify(detail ? formFrom(detail) : empty());
  const blocker = useBlocker(dirty || busy);
  useEffect(() => {
    if (!dirty && !busy) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, busy]);
  const query = useQuery({
    queryKey: workspace.key("admin-announcements", page),
    queryFn: () => admin.announcements(page),
  });
  const current = detail?.announcement;
  const published = !!current?.publishedAt;
  function apply(next: AnnouncementDetail) {
    setDetail(next);
    setForm(formFrom(next));
    setEditing(true);
  }
  async function perform(action: () => Promise<void>) {
    if (busy) return;
    const identity = auth.identity();
    setBusy(true);
    setError(undefined);
    try {
      await action();
    } catch (e) {
      if (auth.identity() === identity) setError(e);
    } finally {
      if (auth.identity() === identity) setBusy(false);
    }
  }
  async function refresh() {
    await cache.invalidateQueries({
      queryKey: workspace.key("admin-announcements"),
    });
  }
  return (
    <>
      <PageHeading
        title={tr("System announcements")}
        description={tr("Send in-app messages to active customers.")}
      >
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => void query.refetch()}
        >
          <RefreshCw size={16} />
          {tr("Refresh")}
        </Button>
        <Button
          disabled={busy || dirty}
          onClick={() => {
            setDetail(undefined);
            setCreateRequestId(crypto.randomUUID());
            setForm(empty());
            setEditing(true);
            setError(undefined);
          }}
        >
          <Plus size={16} />
          {tr("New announcement")}
        </Button>
      </PageHeading>
      <ErrorBanner error={error} />
      <div className="announcement-layout">
        <section aria-label={tr("Announcement history")}>
          {query.isPending ? (
            <Spinner />
          ) : query.isError ? (
            <ErrorPanel
              error={query.error}
              retry={() => void query.refetch()}
            />
          ) : (
            <>
              <div className="announcement-history">
                {query.data.items.map((a) => (
                  <button
                    className="announcement-history-item"
                    key={a.id}
                    disabled={busy || dirty}
                    aria-pressed={current?.id === a.id}
                    onClick={() =>
                      void perform(async () => {
                        apply(await admin.announcement(a.id));
                        setPreview(undefined);
                      })
                    }
                  >
                    <strong>{a.title}</strong>
                    <span>
                      {tr(
                        a.revokedAt
                          ? "Revoked"
                          : a.publishedAt
                            ? "Published"
                            : "Draft",
                      )}{" "}
                      · {dateTime(a.createdAt)}
                    </span>
                  </button>
                ))}
              </div>
              {!query.data.items.length ? (
                <EmptyState
                  icon={Bell}
                  title={tr("No announcements yet")}
                  description={tr("Create a draft to get started.")}
                />
              ) : null}
              <div className="pager">
                <Button
                  variant="secondary"
                  disabled={page === 1 || busy || dirty}
                  onClick={() => setPage(page - 1)}
                >
                  {tr("Previous")}
                </Button>
                <span>
                  {tr("Page")} {page}
                </span>
                <Button
                  variant="secondary"
                  disabled={!query.data.hasNextPage || busy || dirty}
                  onClick={() => setPage(page + 1)}
                >
                  {tr("Next")}
                </Button>
              </div>
            </>
          )}
        </section>
        {editing ? (
          <section
            className="announcement-editor"
            aria-label={tr("Announcement editor")}
          >
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void perform(async () => {
                  const next = await admin.saveAnnouncement(
                    { ...form, requestId: createRequestId },
                    current?.id,
                  );
                  apply(next);
                  await refresh();
                  toast.success(tr("Draft saved"));
                });
              }}
            >
              <fieldset disabled={busy || published}>
                <Field label={tr("Announcement title")}>
                  <input
                    required
                    maxLength={150}
                    value={form.title}
                    onChange={(e) =>
                      setForm({ ...form, title: e.target.value })
                    }
                  />
                </Field>
                <Field label={tr("Announcement message")}>
                  <textarea
                    required
                    maxLength={10000}
                    rows={9}
                    value={form.body}
                    onChange={(e) => setForm({ ...form, body: e.target.value })}
                  />
                </Field>
                <Field label={tr("Recipients")}>
                  <select
                    value={form.allActiveUsers ? "all" : "selected"}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        allActiveUsers: e.target.value === "all",
                        userIds: [],
                      })
                    }
                  >
                    <option value="all">{tr("All active customers")}</option>
                    <option value="selected">{tr("Selected customers")}</option>
                  </select>
                </Field>
                {!form.allActiveUsers && !published ? (
                  <RecipientPicker
                    selected={form.userIds}
                    onChange={(userIds) => setForm({ ...form, userIds })}
                  />
                ) : null}
                {!published ? (
                  <Button type="submit" busy={busy} disabled={!dirty}>
                    {tr("Save draft")}
                  </Button>
                ) : null}
              </fieldset>
            </form>
            {!published && dirty ? (
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => setForm(detail ? formFrom(detail) : empty())}
              >
                {tr("Discard changes")}
              </Button>
            ) : null}
            {current && !published ? (
              <Button
                disabled={busy || dirty}
                onClick={() =>
                  void perform(async () => {
                    const result = await admin.previewAnnouncement(
                      current.id,
                      current.version,
                    );
                    setPreview({ ...result, requestId: crypto.randomUUID() });
                  })
                }
              >
                {tr("Preview and send")}
              </Button>
            ) : null}
            {published ? (
              <p>
                {tr(current?.revokedAt ? "Revoked" : "Published")} ·{" "}
                {tr("Recipients: {0}", current?.recipientCount ?? 0)}
              </p>
            ) : null}
            {current?.publishedAt && !current.revokedAt ? (
              <Button
                variant="danger"
                disabled={busy}
                onClick={() => setRevoke(true)}
              >
                {tr("Revoke announcement")}
              </Button>
            ) : null}
            {published && detail ? <details className="announcement-recipients"><summary>{tr("Selected account IDs")}</summary>{detail.recipientIds.map(id => <p key={id}><code>{id}</code></p>)}</details> : null}
            {detail?.events.length ? (
              <div className="announcement-events">
                <h2>{tr("Announcement history")}</h2>
                <ul>
                  {detail.events.map((e) => (
                    <li key={e.id}>
                      <strong>{tr(e.action)}</strong> · {dateTime(e.occurredAt)}
                      <br />
                      <code>{e.actorId}</code>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
      {preview ? (
        <Modal
          open
          title={tr("Send announcement?")}
          onClose={() => {
            if (!busy) setPreview(undefined);
          }}
        >
          <div className="modal-body announcement-preview">
            <ErrorBanner error={error} />
            <h2>{preview.announcement.title}</h2>
            <p>{preview.announcement.body}</p>
            <strong>{tr("Recipients: {0}", preview.recipientCount)}</strong>
            <p>
              {tr(
                "Recipients are checked again when sending. New accounts will not receive older messages.",
              )}
            </p>
          </div>
          <div className="modal-footer">
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => setPreview(undefined)}
            >
              {tr("Cancel")}
            </Button>
            <Button
              busy={busy}
              disabled={preview.recipientCount === 0}
              onClick={() =>
                void perform(async () => {
                  const result = await admin.publishAnnouncement(
                    preview.announcement.id,
                    preview.announcement.version,
                    preview.requestId,
                  );
                  apply(result);
                  setPreview(undefined);
                  await refresh();
                  toast.success(tr("Announcement sent"));
                })
              }
            >
              {tr("Send announcement")}
            </Button>
          </div>
        </Modal>
      ) : null}
      {revoke && current ? (
        <ConfirmDialog
          title={tr("Revoke announcement?")}
          description={tr(
            "This hides the message from customers and keeps the administration history.",
          )}
          confirmLabel={tr("Revoke announcement")}
          danger
          onClose={() => setRevoke(false)}
          onConfirm={async () => {
            apply(await admin.revokeAnnouncement(current.id, current.version));
            setRevoke(false);
            await refresh();
          }}
        />
      ) : null}
      {blocker.state === "blocked" ? (
        <Modal
          open
          title={tr("Keep your changes?")}
          onClose={() => blocker.reset()}
        >
          <div className="modal-body">
            {tr("Save or discard your draft before leaving.")}
          </div>
          <div className="modal-footer">
            <Button onClick={() => blocker.reset()}>
              {tr("Keep editing")}
            </Button>
            <Button
              variant="danger"
              disabled={busy}
              onClick={() => blocker.proceed()}
            >
              {tr("Discard and leave")}
            </Button>
          </div>
        </Modal>
      ) : null}
    </>
  );
}

function RecipientPicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebounced(search, 250);
  const result = useQuery({
    queryKey: workspace.key("announcement-recipients", page, q),
    queryFn: () => admin.announcementRecipients(page, q),
  });
  return (
    <div className="announcement-recipients">
      <Field label={tr("Find recipients")}>
        <input
          type="search"
          maxLength={150}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </Field>
      <p>{tr("Selected: {0}", selected.length)}</p>
      {result.isPending ? (
        <Spinner />
      ) : result.isError ? (
        <ErrorPanel error={result.error} retry={() => void result.refetch()} />
      ) : (
        <>
          {result.data.items.map((u) => (
            <label className="announcement-recipient" key={u.id}>
              <input
                type="checkbox"
                checked={selected.includes(u.id)}
                disabled={!selected.includes(u.id) && selected.length >= 1000}
                onChange={(e) =>
                  onChange(
                    e.target.checked
                      ? [...selected, u.id]
                      : selected.filter((id) => id !== u.id),
                  )
                }
              />
              {u.email}
            </label>
          ))}
          {!result.data.items.length ? (
            <p>{tr("No matching accounts")}</p>
          ) : null}
          <div className="pager">
            <Button
              variant="secondary"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              {tr("Previous")}
            </Button>
            <Button
              variant="secondary"
              disabled={!result.data.hasNextPage}
              onClick={() => setPage(page + 1)}
            >
              {tr("Next")}
            </Button>
          </div>
        </>
      )}
      {selected.length ? (
        <details>
          <summary>{tr("Selected account IDs")}</summary>
          {selected.map((id) => (
            <div key={id}>
              <code>{id}</code>
              <Button
                variant="ghost"
                onClick={() => onChange(selected.filter((x) => x !== id))}
              >
                {tr("Remove")}
              </Button>
            </div>
          ))}
        </details>
      ) : null}
    </div>
  );
}
