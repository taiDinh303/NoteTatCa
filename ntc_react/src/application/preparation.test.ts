import { describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
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
    await vi.waitFor(() =>
      expect(loader.getSnapshot().tasks).toContainEqual({
        resource: "me",
        status: "ready",
      }),
    );
    expect(loader.getSnapshot().tasks).toContainEqual({
      resource: "labels",
      status: "loading",
    });
    expect(loader.getSnapshot().completed).toBe(6);
    release(page(note("1").tags));
    await pending;
    expect(
      loader.getSnapshot().tasks.every((task) => task.status === "ready"),
    ).toBe(true);
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
    expect(loader.getSnapshot()).toMatchObject({
      status: "ready",
      completed: 7,
    });
    expect(
      loader.getSnapshot().tasks.every((task) => task.status === "ready"),
    ).toBe(true);
    loader.reset();
    expect(loader.getSnapshot().tasks).toEqual([]);
    cache.clear();
  });
  it("loads every page once and derives label/pin lists without per-label requests", async () => {
    const cache = new QueryClient();
    const source = ports();
    const loader = new WorkspacePreparation(cache, source, () => "a:member");
    await Promise.all([loader.prepare(session), loader.prepare(session)]);
    expect(loader.getSnapshot()).toMatchObject({
      status: "ready",
      completed: 7,
      total: 7,
    });
    expect(source.notes.list).toHaveBeenCalledTimes(4);
    expect(source.labels.list).toHaveBeenCalledOnce();
    const workspace = new WorkspaceService(
      new NotesRepository(new ApiClient("/api/v1")),
      cache,
      () => "a",
    );
    expect(
      workspace.cachedNotes({ tagId: "label-a" })?.pages[0].items,
    ).toHaveLength(3);
    expect(
      workspace.cachedNotes({ pinned: true })?.pages[0].items,
    ).toHaveLength(0);
    expect(cache.getQueryData(["private", "a", "note", "3"])).toMatchObject({
      id: "3",
    });
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
