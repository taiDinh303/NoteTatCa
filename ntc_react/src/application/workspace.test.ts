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
describe("private workspace cache", () => {
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

it('publishes canonical reorder without invalidating the list and cancels stale reads', async () => {
  vi.useFakeTimers();
  try {
    const cache = new QueryClient();
    let items = ['a', 'b', 'c'].map((id, index) => ({ ...note, id, sortOrder: (index + 1) * 1000 }));
    const repository = new NotesRepository(new ApiClient('/api/v1'));
    vi.spyOn(repository, 'list').mockImplementation(async () => ({ ...page, items, hasNextPage: false, totalPages: 1, totalItems: 3 }));
    vi.spyOn(repository, 'find').mockImplementation(async id => items.find(n => n.id === id)!);
    vi.spyOn(repository, 'reorder').mockImplementation(async (id, _version, previous) => {
      const moved = items.find(n => n.id === id)!;
      items = items.filter(n => n.id !== id);
      items.splice(previous ? items.findIndex(n => n.id === previous) + 1 : 0, 0, moved);
      items = items.map((n, index) => ({ ...n, sortOrder: (index + 1) * 1000, version: 'v2' }));
      return true;
    });
    const service = new WorkspaceService(repository, cache, () => 'owner');
    const key = service.key('notes', {});
    cache.setQueryData(key, { pages: [{ ...page, items, hasNextPage: false, totalPages: 1, totalItems: 3 }], pageParams: [1] });
    const cancel = vi.spyOn(cache, 'cancelQueries');
    const invalidate = vi.spyOn(cache, 'invalidateQueries');
    service.reorder(items, 0, 2);
    await vi.advanceTimersByTimeAsync(400);
    expect(cancel).toHaveBeenCalledWith({ queryKey: service.key('notes') });
    expect(invalidate).not.toHaveBeenCalled();
    expect(service.order.getSnapshot().groups.size).toBe(0);
    expect(cache.getQueryData(key)).toMatchObject({ pages: [{ items: [{ id: 'b' }, { id: 'c' }, { id: 'a' }] }] });
    cache.clear();
  } finally { vi.useRealTimers(); }
});
