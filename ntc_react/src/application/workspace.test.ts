import { describe, it, expect, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { WorkspaceService } from "./workspace";
import { NotesRepository } from "../infrastructure/repositories";
import { ApiClient } from "../infrastructure/http";
import { draftFrom } from "../domain/models";
import type { Note, Page } from "../domain/models";
const note: Note = {
  ...draftFrom(),
  id: "a",
  userId: "owner",
  content: "safe",
  documentSchemaVersion: 1,
  version: "v1",
  pinnedAt: null,
  sortOrder: 1,
  tags: [],
  reminders: [],
  createdTime: "",
  lastUpdatedTime: "",
  deletedTime: null,
};
const page: Page<Note> = {
  items: [note],
  totalItems: 101,
  currentPage: 1,
  totalPages: 2,
  pageSize: 100,
  hasNextPage: true,
  hasPreviousPage: false,
};
it("pins and unpins at the destination head before a delayed save and rolls back failures", async () => {
  const cache = new QueryClient();
  const repository = new NotesRepository(new ApiClient("/api/v1"));
  const source = { ...note, id: "moving", sortOrder: 9000 };
  const pinned = { ...note, id: "pinned", isPinned: true, sortOrder: -2000 };
  const service = new WorkspaceService(repository, cache, () => "owner");
  const key = service.key("notes", {});
  cache.setQueryData(key, {
    pages: [{ ...page, items: [pinned, source], hasNextPage: false }],
    pageParams: [1],
  });
  vi.spyOn(repository, "find").mockResolvedValue(source);
  let release!: (value: Note) => void;
  vi.spyOn(repository, "pin").mockImplementation(
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  const invalidation = vi.spyOn(cache, "invalidateQueries");
  const saving = service.pin(source);
  expect(cache.getQueryData(key)).toMatchObject({
    pages: [
      {
        items: [
          { id: "moving", isPinned: true, sortOrder: -3000 },
          { id: "pinned" },
        ],
      },
    ],
  });
  await vi.waitFor(() => expect(repository.pin).toHaveBeenCalled());
  release({ ...source, isPinned: true, sortOrder: -3000, version: "v2" });
  await saving;
  expect(invalidation).not.toHaveBeenCalled();
  vi.mocked(repository.find).mockResolvedValue({ ...source, isPinned: true });
  vi.mocked(repository.pin).mockRejectedValueOnce(new Error("Unavailable"));
  const unpinning = service.pin({
    ...source,
    isPinned: true,
    sortOrder: -3000,
  });
  expect(cache.getQueryData(key)).toMatchObject({
    pages: [{ items: [{ id: "pinned" }, { id: "moving", isPinned: false }] }],
  });
  await expect(unpinning).rejects.toThrow("Unavailable");
  expect(cache.getQueryData(key)).toMatchObject({
    pages: [{ items: [{ id: "moving", isPinned: true }, { id: "pinned" }] }],
  });
  cache.clear();
});
describe("private workspace cache", () => {
  it("opens a note from a later cached page without using another owner's or trashed content", () => {
    const cache = new QueryClient();
    const service = new WorkspaceService(new NotesRepository(new ApiClient("/api/v1")), cache, () => "owner");
    cache.setQueryData(service.key("notes", {}), { pages: [{ ...page, items: [] }, page], pageParams: [1, 2] });
    expect(service.cachedNote(note.id)?.note).toEqual(note);
    cache.setQueryData(service.key("notes", {}), { pages: [{ ...page, items: [{ ...note, userId: "other" }] }], pageParams: [1] });
    expect(service.cachedNote(note.id)).toBeUndefined();
    cache.setQueryData(service.key("notes", { trash: true }), { pages: [{ ...page, items: [{ ...note, deletedTime: "2026-10-30" }] }], pageParams: [1] });
    expect(service.cachedNote(note.id)).toBeUndefined();
    cache.clear();
  });
  it("moves a note to Trash immediately and restores it if saving fails", async () => {
    const cache = new QueryClient();
    const repository = new NotesRepository(new ApiClient("/api/v1"));
    let rejectSave!: (reason: Error) => void;
    vi.spyOn(repository, "trash").mockImplementation(
      () =>
        new Promise((_, reject) => {
          rejectSave = reject;
        }),
    );
    const service = new WorkspaceService(repository, cache, () => "owner");
    service.commit(note);
    const pending = service.trash(note);
    await vi.waitFor(() =>
      expect(
        cache.getQueryData(service.key("trash-note", note.id)),
      ).toBeDefined(),
    );
    expect(cache.getQueryData(service.key("note", note.id))).toBeUndefined();
    rejectSave(new Error("Unavailable"));
    await expect(pending).rejects.toThrow("Unavailable");
    expect(cache.getQueryData(service.key("note", note.id))).toBeDefined();
    expect(
      cache.getQueryData(service.key("trash-note", note.id)),
    ).toBeUndefined();
    cache.clear();
  });
  it("keeps a partially loaded list stable when a new note is committed", () => {
    const cache = new QueryClient();
    const service = new WorkspaceService(
      new NotesRepository(new ApiClient("/api/v1")),
      cache,
      () => "owner",
    );
    const key = service.key("notes", {});
    cache.setQueryData(key, { pages: [page], pageParams: [1] });
    const invalidate = vi.spyOn(cache, "invalidateQueries");
    service.commit({ ...note, id: "new" });
    expect(cache.getQueryData(key)).toMatchObject({
      pages: [{ items: [note] }],
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: key, exact: true });
    cache.clear();
  });
  it("evicts editable detail after trash and rejects another owner response", () => {
    const cache = new QueryClient();
    const service = new WorkspaceService(
      new NotesRepository(new ApiClient("/api/v1")),
      cache,
      () => "owner",
    );
    service.commit(note);
    service.commit({ ...note, deletedTime: new Date().toISOString() });
    expect(cache.getQueryData(service.key("note", note.id))).toBeUndefined();
    expect(
      cache.getQueryData(service.key("trash-note", note.id)),
    ).toBeDefined();
    service.commit({ ...note, id: "foreign", userId: "other" });
    expect(cache.getQueryData(service.key("note", "foreign"))).toBeUndefined();
    cache.clear();
  });
});

it("publishes canonical reorder without invalidating the list and cancels stale reads", async () => {
  vi.useFakeTimers();
  try {
    const cache = new QueryClient();
    let items = ["a", "b", "c"].map((id, index) => ({
      ...note,
      id,
      sortOrder: (index + 1) * 1000,
    }));
    const repository = new NotesRepository(new ApiClient("/api/v1"));
    vi.spyOn(repository, "list").mockImplementation(async () => ({
      ...page,
      items,
      hasNextPage: false,
      totalPages: 1,
      totalItems: 3,
    }));
    vi.spyOn(repository, "find").mockImplementation(async (id) =>
      items.find((n) => n.id === id)!,
    );
    vi.spyOn(repository, "reorder").mockImplementation(
      async (id, _version, previous) => {
        const moved = items.find((n) => n.id === id)!;
        items = items.filter((n) => n.id !== id);
        items.splice(
          previous ? items.findIndex((n) => n.id === previous) + 1 : 0,
          0,
          moved,
        );
        items = items.map((n, index) => ({
          ...n,
          sortOrder: (index + 1) * 1000,
          version: "v2",
        }));
        return true;
      },
    );
    const service = new WorkspaceService(repository, cache, () => "owner");
    const key = service.key("notes", {});
    cache.setQueryData(key, {
      pages: [
        { ...page, items, hasNextPage: false, totalPages: 1, totalItems: 3 },
      ],
      pageParams: [1],
    });
    const cancel = vi.spyOn(cache, "cancelQueries");
    const invalidate = vi.spyOn(cache, "invalidateQueries");
    service.reorder(items, 0, 2);
    await vi.advanceTimersByTimeAsync(400);
    expect(cancel).toHaveBeenCalledWith({ queryKey: service.key("notes") });
    expect(invalidate).not.toHaveBeenCalled();
    expect(service.order.getSnapshot().groups.size).toBe(0);
    expect(cache.getQueryData(key)).toMatchObject({
      pages: [{ items: [{ id: "b" }, { id: "c" }, { id: "a" }] }],
    });
    cache.clear();
  } finally {
    vi.useRealTimers();
  }
});
