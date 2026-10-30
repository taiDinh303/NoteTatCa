import { t as tr, useLanguage } from "../../shared/i18n";
import { lazy, Suspense, useState } from "react";
import { useInfiniteQuery, type InfiniteData } from "@tanstack/react-query";
import { ArrowUpRight, Bell, CheckCheck, Inbox } from "lucide-react";
import { toast } from "sonner";
import { cache, inbox, workspace } from "../../app/runtime";
import type { InboxItem, Page } from "../../domain/models";
import { useAuth } from "../../shared/hooks";
import { Button, EmptyState, ErrorPanel, Spinner } from "../../shared/ui";
import { dateTime, errorMessage } from "../../shared/utils";
import { loadNoteEditor, warmNoteEditor } from "../editor/loadNoteEditor";
const NoteEditor = lazy(loadNoteEditor);
export default function InboxPage() {
  useLanguage();
  const state = useAuth();
  const [openedNote, setOpenedNote] = useState<string>();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [busy, setBusy] = useState(false);
  const query = useInfiniteQuery({
    queryKey: workspace.key("inbox", unreadOnly),
    queryFn: ({ pageParam }) => inbox.list(pageParam, unreadOnly),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.hasNextPage ? last.currentPage + 1 : undefined,
    enabled: state.status === "authenticated",
    refetchOnMount: "always",
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  function refresh() {
    void Promise.all([
      cache.invalidateQueries({ queryKey: workspace.key("inbox") }),
      cache.invalidateQueries({ queryKey: workspace.key("unread") }),
    ]).catch(() => {});
  }
  async function markAllRead() {
    if (busy) return;
    setBusy(true);
    const owner = String(workspace.key("inbox")[1]);
    await Promise.all([
      cache.cancelQueries({ queryKey: workspace.key("inbox") }),
      cache.cancelQueries({ queryKey: workspace.key("unread") }),
    ]);
    const previous = cache.getQueriesData<
      InfiniteData<Page<InboxItem>, number>
    >({
      queryKey: workspace.key("inbox"),
    });
    const countKey = workspace.key("unread");
    const previousCount = cache.getQueryData<number>(countKey);
    const now = new Date().toISOString();
    for (const [key, data] of previous) {
      if (!data) continue;
      const unreadOnly = key[3] === true;
      cache.setQueryData(key, {
        ...data,
        pages: data.pages.map((page) => ({
          ...page,
          items: unreadOnly
            ? []
            : page.items.map((item) => ({
                ...item,
                readAt: item.readAt ?? now,
              })),
          totalItems: unreadOnly ? 0 : page.totalItems,
          hasNextPage: unreadOnly ? false : page.hasNextPage,
        })),
      });
    }
    cache.setQueryData(countKey, 0);
    try {
      const count = await inbox.readAll();
      toast.success(
        count
          ? tr("{0} notifications marked as read", count)
          : tr("You’re all caught up"),
      );
      refresh();
    } catch (error) {
      if (workspace.key("inbox")[1] === owner) {
        for (const [key, data] of previous) cache.setQueryData(key, data);
        cache.setQueryData(countKey, previousCount);
        refresh();
      }
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <h1 className="sr-only">{tr("Your inbox")}</h1>
      <div className="inbox-header">
        <div className="inbox-tabs">
          <button
            className={!unreadOnly ? "active" : ""}
            onClick={() => setUnreadOnly(false)}
          >
            {tr("All notifications")}
          </button>
          <button
            className={unreadOnly ? "active" : ""}
            onClick={() => setUnreadOnly(true)}
          >
            {tr("Unread")}
          </button>
        </div>
        <button
          type="button"
          className="inbox-mark-read"
          title={tr("Mark all as read")}
          disabled={busy}
          onClick={() => void markAllRead()}
        >
          <CheckCheck size={16} aria-hidden />
          <span>{tr("Mark all as read")}</span>
        </button>
      </div>
      <div className="inbox-scroll" role="region" aria-label={tr("All notifications")} tabIndex={0}>
      {query.isPending ? (
        <Spinner />
      ) : query.isError ? (
        <ErrorPanel error={query.error} retry={() => void query.refetch()} />
      ) : !items.length ? (
        <EmptyState
          icon={Inbox}
          title={tr("You’re all caught up")}
          description={tr(
            "When a reminder is due, it will appear here. Take a little breath.",
          )}
        />
      ) : (
        <div className="inbox-list">
          {items.map((item) => (
            <article
              key={item.id}
              className={`inbox-row ${!item.readAt ? "unread" : ""}`}
            >
              <div className="inbox-symbol">
                <Bell size={19} />
              </div>
              <button
                className="inbox-item-open"
                onPointerEnter={warmNoteEditor}
                onFocus={warmNoteEditor}
                onTouchStart={warmNoteEditor}
                onClick={() => {
                  setOpenedNote(item.noteId);
                  if (!item.readAt) {
                    void inbox
                      .read(item.id)
                      .then(refresh)
                      .catch((error) => toast.error(errorMessage(error)));
                  }
                }}
              >
                <strong>{tr("A note is waiting for you")}</strong>
                <span>
                  {dateTime(item.occurrenceAt)}
                  {tr("· Open your note")}
                </span>
              </button>
              {!item.readAt ? (
                <span className="unread-dot" aria-label={tr("Unread")} />
              ) : null}
              <ArrowUpRight size={16} />
            </article>
          ))}
        </div>
      )}
      {query.hasNextPage ? (
        <div className="load-more">
          <Button
            variant="secondary"
            busy={query.isFetchingNextPage}
            onClick={() => void query.fetchNextPage()}
          >
            {tr("Load more notifications")}
          </Button>
        </div>
      ) : null}
      </div>
      {openedNote ? (
        <Suspense fallback={<div className="note-open-loading"><Spinner label={tr("Opening editor…")} /></div>}>
          <NoteEditor noteId={openedNote} onClose={() => setOpenedNote(undefined)} />
        </Suspense>
      ) : null}
    </>
  );
}
