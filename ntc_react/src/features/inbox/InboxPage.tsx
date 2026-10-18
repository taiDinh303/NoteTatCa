import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, Bell, CheckCheck, Inbox } from "lucide-react";
import { toast } from "sonner";
import { cache, inbox, workspace } from "../../app/runtime";
import { useAuth } from "../../shared/hooks";
import {
  Button,
  EmptyState,
  ErrorPanel,
  PageHeading,
  Spinner,
} from "../../shared/ui";
import { dateTime, errorMessage } from "../../shared/utils";
export default function InboxPage() {
  const state = useAuth();
  const navigate = useNavigate();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [busy, setBusy] = useState(false);
  const query = useInfiniteQuery({
    queryKey: workspace.key("inbox", unreadOnly),
    queryFn: ({ pageParam }) => inbox.list(pageParam, unreadOnly),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.hasNextPage ? last.currentPage + 1 : undefined,
    enabled: state.status === "authenticated",
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  async function refresh() {
    await Promise.all([
      cache.invalidateQueries({ queryKey: workspace.key("inbox") }),
      cache.invalidateQueries({ queryKey: workspace.key("unread") }),
    ]);
  }
  return (
    <>
      <PageHeading
        eyebrow="A GENTLE NUDGE"
        title="Your inbox"
        description="Small reminders for the things that matter."
      >
        <Button
          variant="secondary"
          busy={busy}
          onClick={() => {
            setBusy(true);
            void inbox
              .readAll()
              .then(async (count) => {
                toast.success(
                  count
                    ? `${count} notifications marked as read`
                    : "You’re all caught up",
                );
                await refresh();
              })
              .catch((error) => toast.error(errorMessage(error)))
              .finally(() => setBusy(false));
          }}
        >
          <CheckCheck size={17} />
          Mark all as read
        </Button>
      </PageHeading>
      <div className="inbox-tabs">
        <button
          className={!unreadOnly ? "active" : ""}
          onClick={() => setUnreadOnly(false)}
        >
          All notifications
        </button>
        <button
          className={unreadOnly ? "active" : ""}
          onClick={() => setUnreadOnly(true)}
        >
          Unread
        </button>
      </div>
      {query.isPending ? (
        <Spinner />
      ) : query.isError ? (
        <ErrorPanel error={query.error} retry={() => void query.refetch()} />
      ) : !items.length ? (
        <EmptyState
          icon={Inbox}
          title="You’re all caught up"
          description="When a reminder is due, it will appear here. Take a little breath."
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
                onClick={() => {
                  void (item.readAt ? Promise.resolve() : inbox.read(item.id))
                    .then(async () => {
                      await refresh();
                      navigate(`/notes?note=${item.noteId}`);
                    })
                    .catch((error) => toast.error(errorMessage(error)));
                }}
              >
                <strong>A note is waiting for you</strong>
                <span>{dateTime(item.occurrenceAt)} · Open your note</span>
              </button>
              {!item.readAt ? (
                <span className="unread-dot" aria-label="Unread" />
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
            Load more notifications
          </Button>
        </div>
      ) : null}
    </>
  );
}
