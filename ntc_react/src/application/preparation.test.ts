import { describe, expect, it, vi } from "vitest";
import { InfiniteQueryObserver, QueryClient } from "@tanstack/react-query";
import { WorkspacePreparation } from "./preparation";
import { WorkspaceService } from "./workspace";
import { NotesRepository } from "../infrastructure/repositories";
import { ApiClient } from "../infrastructure/http";
import type { Label, Note, Page, Session } from "../domain/models";
import { draftFrom } from "../domain/models";

const session = { userId: "a", roles: ["User"] } as Session;
function page<T>(items: T[], number = 1, next = false): Page<T> {
  return {
    items,
    currentPage: number,
    hasNextPage: next,
    totalPages: next ? number + 1 : number,
    totalItems: items.length,
    pageSize: 100,
    hasPreviousPage: number > 1,
  };
}
const note = (id: string): Note => ({
  ...draftFrom(),
  id,
  userId: "a",
  title: "A private note",
  content: "draft",
  version: "v1",
  documentSchemaVersion: 1,
  pinnedAt: null,
  sortOrder: 1,
  tags: [
    { id: "label-a", name: "Ideas", version: "v1", color: null, icon: null },
  ],
  reminders: [],
  createdTime: "",
  lastUpdatedTime: "",
  deletedTime: null,
});
function ports() {
  return {
    notes: {
      list: vi.fn(async (filter: { trash?: boolean }, number = 1) =>
        filter.trash
          ? page<Note>([])
          : page([note(String(number))], number, number < 3),
      ),
    },
    labels: { list: vi.fn(async () => page(note("1").tags)) },
    reminders: { list: vi.fn(async () => page([])) },
    inbox: { list: vi.fn(async () => page([])), count: vi.fn(async () => 0) },
    account: {
      me: vi.fn(async () => ({
        account: {
          id: "a",
          userName: "a",
          email: "a@example.test",
          phoneNumber: null,
          isLocked: false,
          deactivatedAt: null,
          timeZoneId: "UTC",
          emailConfirmed: true,
          hasPassword: true,
          createdTime: "",
        },
        profile: null,
      })),
    },
    admin: { stats: vi.fn(async () => ({ users: 2 })) },
  };
}
describe("workspace preparation", () => {
  it.each([false, true])("keeps trash pages flat during background refresh (empty: %s)", async (empty) => {
    const cache = new QueryClient();
    const source = ports();
    const deleted = { ...note("deleted"), deletedTime: "2026-10-25T00:00:00Z" };
    const trashed = empty ? [] : [deleted];
    source.notes.list.mockImplementation(async (filter, number = 1) =>
      filter.trash
        ? page(trashed, number)
        : page([note(String(number))], number, number < 3),
    );
    let background = false;
    const loader = new WorkspacePreparation(
      cache,
      source,
      () => "a:member",
      () => background,
    );
    await loader.prepare(session);
    const key = ["private", "a", "notes", { trash: true }];
    const observer = new InfiniteQueryObserver(cache, {
      queryKey: key,
      queryFn: ({ pageParam }) => source.notes.list({ trash: true }, pageParam),
      initialPageParam: 1,
      getNextPageParam: (last: Page<Note>) =>
        last.hasNextPage ? last.currentPage + 1 : undefined,
      staleTime: 300_000,
    });
    const stop = observer.subscribe(() => {});
    await vi.waitFor(() =>
      expect(observer.getCurrentResult().isSuccess).toBe(true),
    );
    await cache.invalidateQueries({ queryKey: key, refetchType: "none" });
    background = true;
    await loader.prepare(session);
    await vi.waitFor(() =>
      expect(loader.getSnapshot().tasks).toContainEqual({
        resource: "trash",
        status: "ready",
      }),
    );
    await cache.invalidateQueries({ queryKey: key });
    expect(observer.getCurrentResult().data?.pages).toEqual([page(trashed)]);
    const service = new WorkspaceService(
      new NotesRepository(new ApiClient("/api/v1")),
      cache,
      () => "a",
    );
    expect(() => service.commit({ ...note("1"), tags: [] })).not.toThrow();
    stop();
    observer.destroy();
    loader.reset();
    cache.clear();
  });
  it("opens notes while profile is blocked and keeps notes ready when profile fails", async () => {
    const cache = new QueryClient();
    const source = ports();
    let reject!: (error: Error) => void;
    source.account.me.mockImplementation(
      () =>
        new Promise((_resolve, fail) => {
          reject = fail;
        }),
    );
    const loader = new WorkspacePreparation(cache, source, () => "a:member");
    await loader.prepare(session);
    expect(loader.getSnapshot().status).toBe("ready");
    expect(cache.getQueryData(["private", "a", "note", "1"])).toBeDefined();
    reject(new Error("Profile unavailable"));
    await vi.waitFor(() =>
      expect(loader.getSnapshot().tasks).toContainEqual({
        resource: "me",
        status: "error",
      }),
    );
    expect(loader.getSnapshot().status).toBe("ready");
    cache.clear();
  });
  it("reports the collection actually waiting and loading, then marks it ready", async () => {
    const cache = new QueryClient();
    const source = ports();
    let release!: (value: Page<Label>) => void;
    source.labels.list.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    const loader = new WorkspacePreparation(cache, source, () => "a:member");
    const pending = loader.prepare(session);
    expect(loader.getSnapshot().tasks).toContainEqual({
      resource: "me",
      status: "waiting",
    });
    expect(source.account.me).not.toHaveBeenCalled();
    expect(source.reminders.list).not.toHaveBeenCalled();
    expect(loader.getSnapshot().tasks).toContainEqual({
      resource: "labels",
      status: "loading",
    });
    release(page(note("1").tags));
    await pending;
    await vi.waitFor(() => expect(loader.getSnapshot().completed).toBe(7));
    cache.clear();
  });
  it("marks a failed collection and resets task states when retrying it", async () => {
    const cache = new QueryClient();
    const source = ports();
    source.labels.list.mockRejectedValueOnce(
      new Error("Synthetic collection failure"),
    );
    const loader = new WorkspacePreparation(cache, source, () => "a:member");
    await expect(loader.prepare(session)).rejects.toThrow(
      "Synthetic collection failure",
    );
    expect(loader.getSnapshot().tasks).toContainEqual({
      resource: "labels",
      status: "error",
    });
    expect(
      loader.getSnapshot().tasks.some((task) => task.status === "loading"),
    ).toBe(false);
    await loader.prepare(session);
    await vi.waitFor(() => expect(loader.getSnapshot().completed).toBe(7));
    expect(loader.getSnapshot()).toMatchObject({
      status: "ready",
      completed: 7,
    });
    await vi.waitFor(() => expect(loader.getSnapshot().completed).toBe(7));
    loader.reset();
    expect(loader.getSnapshot().tasks).toEqual([]);
    cache.clear();
  });
  it("opens with only the first note page and leaves later pages for explicit loading", async () => {
    const cache = new QueryClient();
    const source = ports();
    const loader = new WorkspacePreparation(cache, source, () => "a:member");
    await Promise.all([loader.prepare(session), loader.prepare(session)]);
    await vi.waitFor(() => expect(loader.getSnapshot().completed).toBe(7));
    expect(loader.getSnapshot()).toMatchObject({
      status: "ready",
      completed: 7,
      total: 7,
    });
    expect(source.notes.list).toHaveBeenCalledTimes(2);
    expect(source.labels.list).toHaveBeenCalledOnce();
    const workspace = new WorkspaceService(
      new NotesRepository(new ApiClient("/api/v1")),
      cache,
      () => "a",
    );
    expect(
      workspace.cachedNotes({ tagId: "label-a" }),
    ).toBeUndefined();
    expect(
      workspace.cachedNotes({ pinned: true }),
    ).toBeUndefined();
    expect(cache.getQueryData(["private", "a", "note", "1"])).toMatchObject({ id: "1" });
    expect(cache.getQueryData(["private", "a", "note", "3"])).toBeUndefined();
    expect(source.admin.stats).not.toHaveBeenCalled();
    cache.clear();
  });
  it("loads administration without requesting any personal workspace resource", async () => {
    const cache = new QueryClient();
    const source = ports();
    const loader = new WorkspacePreparation(cache, source, () => "a:admin");
    await loader.prepare({ ...session, roles: ["Admin", "User"] });
    expect(loader.getSnapshot().tasks.map((task) => task.resource)).toEqual([
      "me",
      "admin-stats",
    ]);
    expect(source.admin.stats).toHaveBeenCalledOnce();
    expect(source.notes.list).not.toHaveBeenCalled();
    expect(source.labels.list).not.toHaveBeenCalled();
    expect(source.reminders.list).not.toHaveBeenCalled();
    expect(source.inbox.list).not.toHaveBeenCalled();
    cache.clear();
  });
  it("discards a late page when sign-out changes the identity", async () => {
    const cache = new QueryClient();
    const source = ports();
    const releases: Array<(value: Page<Note>) => void> = [];
    source.notes.list.mockImplementation(
      () =>
        new Promise((resolve) => {
          releases.push(resolve);
        }),
    );
    let identity: string | undefined = "a:member";
    const loader = new WorkspacePreparation(cache, source, () => identity);
    const pending = loader.prepare(session).catch(() => {});
    identity = undefined;
    loader.reset();
    await cache.cancelQueries();
    cache.clear();
    releases.forEach((release) => release(page([note("late")])));
    await pending;
    expect(loader.getSnapshot().status).toBe("idle");
    expect(cache.getQueryCache().getAll()).toHaveLength(0);
  });
  it("does not build filtered lists from incomplete or invalidated source pages", async () => {
    const cache = new QueryClient();
    const service = new WorkspaceService(
      new NotesRepository(new ApiClient("/api/v1")),
      cache,
      () => "a",
    );
    const key = service.key("notes", {});
    cache.setQueryData(key, {
      pages: [page([note("1")], 1, true)],
      pageParams: [1],
    });
    expect(service.cachedNotes({ tagId: "label-a" })).toBeUndefined();
    cache.setQueryData(key, { pages: [page([note("1")])], pageParams: [1] });
    await cache.invalidateQueries({ queryKey: key });
    expect(service.cachedNotes({ tagId: "label-a" })).toBeUndefined();
    cache.clear();
  });
});
