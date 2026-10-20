import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import type { InboxItem, Page, Session } from "../domain/models";
import type {
  AccountRepository,
  AdminRepository,
  InboxRepository,
  LabelsRepository,
  NotesRepository,
  RemindersRepository,
} from "../infrastructure/repositories";
import { isAdministrator } from "./access";

interface PreparationPorts {
  notes: Pick<NotesRepository, "list">;
  labels: Pick<LabelsRepository, "list">;
  reminders: Pick<RemindersRepository, "list">;
  inbox: Pick<InboxRepository, "list" | "count">;
  account: Pick<AccountRepository, "me">;
  admin: Pick<AdminRepository, "stats">;
}
export interface PreparationSnapshot {
  identity?: string;
  status: "idle" | "loading" | "ready" | "error";
  completed: number;
  total: number;
  pages: number;
  error?: unknown;
}
export const WORKSPACE_STALE_TIME = 5 * 60_000;

export class WorkspacePreparation {
  private snapshot: PreparationSnapshot = {
    status: "idle",
    completed: 0,
    total: 0,
    pages: 0,
  };
  private listeners = new Set<() => void>();
  private controller?: AbortController;
  private flight?: Promise<void>;
  private generation = 0;
  constructor(
    private readonly cache: QueryClient,
    private readonly ports: PreparationPorts,
    private readonly identity: () => string | undefined,
  ) {}
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private emit(patch: Partial<PreparationSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach((listener) => listener());
  }
  reset() {
    this.generation++;
    this.controller?.abort();
    this.flight = undefined;
    this.snapshot = { status: "idle", completed: 0, total: 0, pages: 0 };
    this.listeners.forEach((listener) => listener());
  }
  prepare(session: Session): Promise<void> {
    const identity = this.identity();
    if (this.snapshot.identity === identity && this.snapshot.status === "ready")
      return Promise.resolve();
    if (this.snapshot.identity === identity && this.flight) return this.flight;
    this.controller?.abort();
    const generation = ++this.generation;
    const controller = (this.controller = new AbortController());
    const key = (resource: string, ...parts: unknown[]) => [
      "private",
      session.userId,
      resource,
      ...parts,
    ];
    const guard = () => {
      controller.signal.throwIfAborted();
      if (generation !== this.generation || identity !== this.identity())
        throw new DOMException("Session changed", "AbortError");
    };
    const complete = () => {
      guard();
      this.emit({ completed: this.snapshot.completed + 1 });
    };
    const paged = async <T>(
      resource: string,
      parts: unknown[],
      load: (page: number, signal: AbortSignal) => Promise<Page<T>>,
    ) => {
      const result = await this.cache.fetchQuery({
        queryKey: key(resource, ...parts),
        staleTime: WORKSPACE_STALE_TIME,
        retry: false,
        queryFn: async ({ signal }) => {
          const combined = AbortSignal.any([signal, controller.signal]);
          const pages: Page<T>[] = [];
          for (let number = 1; ; number++) {
            guard();
            const page = await load(number, combined);
            guard();
            if (page.currentPage !== number)
              throw new Error(
                "The server returned an unexpected page. Please retry loading.",
              );
            pages.push(page);
            this.emit({ pages: this.snapshot.pages + 1 });
            if (!page.hasNextPage) break;
          }
          return {
            pages,
            pageParams: pages.map((page) => page.currentPage),
          } satisfies InfiniteData<Page<T>>;
        },
      });
      complete();
      return result;
    };
    const single = async <T>(resource: string, load: () => Promise<T>) => {
      const result = await this.cache.fetchQuery({
        queryKey: key(resource),
        staleTime: WORKSPACE_STALE_TIME,
        retry: false,
        queryFn: async () => {
          const value = await load();
          guard();
          return value;
        },
      });
      complete();
      return result;
    };
    this.emit({
      identity,
      status: "loading",
      completed: 0,
      total: isAdministrator(session) ? 2 : 7,
      pages: 0,
      error: undefined,
    });
    this.flight = (async () => {
      if (isAdministrator(session)) {
        await Promise.all([
          single("me", () => this.ports.account.me()),
          single("admin-stats", () => this.ports.admin.stats()),
        ]);
      } else {
        // Four bounded streams, with sequential pages per stream; no request per label.
        const [active, trash] = await Promise.all([
          paged("notes", [{}], (page, signal) =>
            this.ports.notes.list({}, page, signal),
          ),
          paged("notes", [{ trash: true }], (page, signal) =>
            this.ports.notes.list({ trash: true }, page, signal),
          ),
          paged("labels", [], (page, signal) =>
            this.ports.labels.list(page, signal),
          ),
          (async () => {
            await paged("reminders", [], (page, signal) =>
              this.ports.reminders.list(page, signal),
            );
            await paged("inbox", [false], (page, signal) =>
              this.ports.inbox.list(page, false, signal),
            );
            await single("unread", () => this.ports.inbox.count());
            await single("me", () => this.ports.account.me());
          })(),
        ]);
        guard();
        for (const note of [...active.pages, ...trash.pages].flatMap(
          (page) => page.items,
        )) {
          if (note.userId !== session.userId)
            throw new Error(
              "The server returned an unexpected account. Please sign in again.",
            );
          this.cache.setQueryData(
            key(note.deletedTime ? "trash-note" : "note", note.id),
            note,
          );
          this.cache.setQueryData(
            key("note-reminders", note.id),
            note.reminders,
          );
        }
        const allInbox = this.cache.getQueryData<InfiniteData<Page<InboxItem>>>(
          key("inbox", false),
        );
        if (allInbox) {
          const items = allInbox.pages
            .flatMap((page) => page.items)
            .filter((item) => !item.readAt);
          const count = Math.max(1, Math.ceil(items.length / 50));
          this.cache.setQueryData(key("inbox", true), {
            pages: Array.from({ length: count }, (_, index) => ({
              items: items.slice(index * 50, (index + 1) * 50),
              currentPage: index + 1,
              totalPages: count,
              totalItems: items.length,
              pageSize: 50,
              hasNextPage: index + 1 < count,
              hasPreviousPage: index > 0,
            })),
            pageParams: Array.from({ length: count }, (_, index) => index + 1),
          });
        }
      }
      guard();
      this.emit({ status: "ready" });
    })()
      .catch(async (error) => {
        if (generation === this.generation) {
          controller.abort();
          await this.cache.cancelQueries({
            queryKey: ["private", session.userId],
          });
          if (generation === this.generation)
            this.emit({ status: "error", error });
        }
        throw error;
      })
      .finally(() => {
        if (generation === this.generation) this.flight = undefined;
      });
    return this.flight;
  }
}
