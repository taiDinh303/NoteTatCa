import { expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import type { Label, Page } from "../domain/models";
import { LabelMutations } from "./labelMutations";
const label = (id: string): Label => ({
  id,
  name: id,
  color: "#8c9d90",
  icon: null,
  version: "v1",
});
function gate<T>() {
  let resolve!: (value: T) => void, reject!: (error: unknown) => void;
  const promise = new Promise<T>((ok, fail) => {
    resolve = ok;
    reject = fail;
  });
  return { promise, resolve, reject };
}
function setup() {
  const cache = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  let owner = "a";
  const key = (resource: string) => ["private", owner, resource];
  const first = label("first");
  const data: InfiniteData<Page<Label>> = {
    pageParams: [1],
    pages: [
      {
        items: [first],
        totalItems: 1,
        pageSize: 100,
        currentPage: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    ],
  };
  cache.setQueryData(key("labels"), data);
  const repository = {
    create:
      vi.fn<(body: Pick<Label, "name" | "color" | "icon">) => Promise<Label>>(),
    patch:
      vi.fn<
        (
          label: Label,
          body: Pick<Label, "name" | "color" | "icon">,
        ) => Promise<Label>
      >(),
    delete: vi.fn<(id: string) => Promise<unknown>>(),
  };
  const report = vi.fn();
  const service = new LabelMutations(
    repository,
    cache,
    key,
    () => owner,
    report,
  );
  const items = () =>
    cache
      .getQueryData<InfiniteData<Page<Label>>>(key("labels"))!
      .pages.flatMap((p) => p.items);
  return {
    cache,
    key,
    first,
    repository,
    report,
    service,
    items,
    switchOwner: (value: string) => {
      owner = value;
      service.reset();
    },
  };
}
it("updates a label before the request finishes and restores it on failure", async () => {
  const f = setup(),
    pending = gate<Label>();
  f.repository.patch.mockReturnValue(pending.promise);
  const task = f.service.patch(f.first, {
    name: "Updated",
    color: "#112233",
    icon: null,
  });
  await vi.waitFor(() => expect(f.items()[0].name).toBe("Updated"));
  expect(f.service.getSnapshot().updating).toEqual([f.first.id]);
  pending.reject(new Error("Unavailable"));
  await expect(task).rejects.toThrow("Unavailable");
  expect(f.items()[0]).toEqual(f.first);
  expect(f.service.getSnapshot().updating).toEqual([]);
  f.cache.clear();
});
it("shows pending creates immediately without exposing temporary IDs to note-assignment cache", async () => {
  const f = setup(),
    pending = gate<Label>();
  f.repository.create.mockReturnValue(pending.promise);
  const task = f.service.create({ name: "New", color: null, icon: null });
  expect(f.service.getSnapshot().creating[0].name).toBe("New");
  expect(f.items().map((l) => l.id)).toEqual(["first"]);
  await vi.waitFor(() => expect(f.repository.create).toHaveBeenCalledTimes(1));
  pending.resolve(label("saved"));
  await task;
  expect(f.service.getSnapshot().creating).toEqual([]);
  expect(f.items().map((l) => l.id)).toEqual(["saved", "first"]);
});
it("rolls back only a failed create while preserving a concurrent success with the same name", async () => {
  const f = setup(),
    a = gate<Label>(),
    b = gate<Label>();
  f.repository.create
    .mockReturnValueOnce(a.promise)
    .mockReturnValueOnce(b.promise);
  const input = { name: "Duplicate allowed", color: null, icon: null };
  const one = f.service.create(input).catch((e) => e),
    two = f.service.create(input);
  expect(f.service.getSnapshot().creating).toHaveLength(2);
  await vi.waitFor(() => expect(f.repository.create).toHaveBeenCalledTimes(2));
  b.resolve(label("saved"));
  await two;
  a.reject(new Error("create failed"));
  await one;
  expect(f.service.getSnapshot().creating).toEqual([]);
  expect(f.items().map((l) => l.id)).toEqual(["saved", "first"]);
  expect(f.report).toHaveBeenCalledTimes(1);
});
it("hides deletes immediately, deduplicates them, and restores a failed delete without losing new labels", async () => {
  const f = setup(),
    pending = gate<void>();
  f.repository.delete.mockReturnValue(pending.promise);
  f.repository.create.mockResolvedValue(label("new"));
  const task = f.service.delete(f.first).catch((e) => e);
  await f.service.delete(f.first);
  expect(f.service.getSnapshot().deleting).toEqual(["first"]);
  await f.service.create({ name: "New", color: null, icon: null });
  pending.reject(new Error("delete failed"));
  await task;
  expect(f.service.getSnapshot().deleting).toEqual([]);
  expect(f.items().map((l) => l.id)).toEqual(["new", "first"]);
  expect(f.repository.delete).toHaveBeenCalledTimes(1);
});
it("keeps an acknowledged deletion when background reconciliation fails", async () => {
  const f = setup();
  f.repository.delete.mockResolvedValue(true);
  vi.spyOn(f.cache, "invalidateQueries").mockRejectedValue(
    new Error("read failed"),
  );
  await f.service.delete(f.first);
  expect(f.items()).toEqual([]);
  expect(f.service.getSnapshot().deleting).toEqual([]);
  expect(f.report).not.toHaveBeenCalled();
});
it("does not start a queued write after identity changes", async () => {
  const f = setup();
  const task = f.service.create({
    name: "Old account",
    color: null,
    icon: null,
  });
  f.switchOwner("b");
  await task;
  expect(f.repository.create).not.toHaveBeenCalled();
  expect(f.service.getSnapshot().creating).toEqual([]);
  expect(f.report).not.toHaveBeenCalled();
});
it("ignores old-account acknowledgements and failures after switching away and back", async () => {
  const f = setup(),
    pending = gate<Label>();
  f.repository.create.mockReturnValue(pending.promise);
  const task = f.service.create({
    name: "Old account",
    color: null,
    icon: null,
  });
  await vi.waitFor(() => expect(f.repository.create).toHaveBeenCalled());
  f.switchOwner("b");
  f.switchOwner("a");
  pending.resolve(label("late"));
  await task;
  expect(f.items().map((l) => l.id)).toEqual(["first"]);
  expect(f.service.getSnapshot().creating).toEqual([]);
  expect(f.report).not.toHaveBeenCalled();
});

it("reconciles partial pagination but avoids reloading a complete list after create", async () => {
  const f = setup();
  f.repository.create.mockResolvedValue(label("saved"));
  const invalidate = vi.spyOn(f.cache, "invalidateQueries");
  await f.service.create({ name: "Saved", color: null, icon: null });
  expect(invalidate).not.toHaveBeenCalled();
  f.cache.setQueryData<InfiniteData<Page<Label>>>(f.key("labels"), (data) => ({
    ...data!,
    pages: data!.pages.map((p) => ({ ...p, hasNextPage: true })),
  }));
  await f.service.create({ name: "Saved", color: null, icon: null });
  expect(invalidate).toHaveBeenCalledWith({ queryKey: f.key("labels") });
});
it("keeps the acknowledged create visible when the label cache was not loaded", async () => {
  const f = setup();
  f.cache.removeQueries({ queryKey: f.key("labels") });
  f.repository.create.mockResolvedValue(label("saved"));
  const invalidate = vi.spyOn(f.cache, "invalidateQueries");
  await f.service.create({ name: "Saved", color: null, icon: null });
  expect(f.items().map((item) => item.id)).toEqual(["saved"]);
  expect(invalidate).toHaveBeenCalledWith({ queryKey: f.key("labels") });
});

it("does not report an old-account failure in a new account", async () => {
  const f = setup(),
    pending = gate<void>();
  f.repository.delete.mockReturnValue(pending.promise);
  const task = f.service.delete(f.first).catch((error) => error);
  await vi.waitFor(() => expect(f.repository.delete).toHaveBeenCalledTimes(1));
  f.switchOwner("b");
  pending.reject(new Error("Old account failed"));
  await task;
  expect(f.report).not.toHaveBeenCalled();
  expect(f.service.getSnapshot().deleting).toEqual([]);
});
