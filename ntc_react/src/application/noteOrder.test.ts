import { afterEach, expect, it, vi } from "vitest";
import { NoteOrderCoordinator } from "./noteOrder";
import { draftFrom } from "../domain/models";
import type { Note } from "../domain/models";
afterEach(() => vi.useRealTimers());
const note = (id: string, i: number): Note => ({
  ...draftFrom(),
  id,
  userId: "owner",
  version: "v1",
  content: "",
  documentSchemaVersion: 1,
  sortOrder: i * 1000,
  pinnedAt: null,
  tags: [],
  reminders: [],
  createdTime: "",
  lastUpdatedTime: "",
  deletedTime: null,
});
function setup() {
  let owner = "owner";
  let server = ["a", "b", "c"].map(note);
  const load = vi.fn(async () => server.map((n) => ({ ...n })));
  const move = vi.fn(
    async (id: string, previous: string | null, next: string | null) => {
      const n = server.find((n) => n.id === id)!;
      server = server.filter((n) => n.id !== id);
      const at = previous ? server.findIndex((n) => n.id === previous) + 1 : 0;
      expect(server[at]?.id ?? null).toBe(next);
      server.splice(at, 0, n);
    },
  );
  const publish = vi.fn();
  const queue = new NoteOrderCoordinator(() => owner, load, move, publish);
  return {
    queue,
    load,
    move,
    publish,
    get server() {
      return server;
    },
    changeOwner() {
      owner = "other";
    },
  };
}
it("coalesces rapid changes and publishes only after debounce", async () => {
  vi.useFakeTimers();
  const f = setup();
  f.queue.reorder(f.server, 0, 2);
  expect(f.queue.getSnapshot().groups.get(false)?.ids).toEqual(["b", "c", "a"]);
  f.queue.reorder([f.server[1], f.server[2], f.server[0]], 2, 0);
  await vi.advanceTimersByTimeAsync(399);
  expect(f.load).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  expect(f.move).not.toHaveBeenCalled();
  expect(f.publish).toHaveBeenCalledTimes(1);
});
it("holds reorder persistence during a pin while accepting immediate new positions", async () => {
  vi.useFakeTimers();
  const f = setup();
  const hold = f.queue.hold();
  await hold.ready;
  f.queue.reorder(f.server, 0, 2);
  await vi.advanceTimersByTimeAsync(1000);
  expect(f.load).not.toHaveBeenCalled();
  expect(f.queue.getSnapshot().groups.get(false)?.ids).toEqual(["b", "c", "a"]);
  f.queue.membership("b", true);
  expect(f.queue.getSnapshot().groups.get(false)?.ids).toEqual(["c", "a"]);
  hold.release();
  await vi.advanceTimersByTimeAsync(0);
  expect(f.load).toHaveBeenCalled();
});
it("keeps accepting moves in flight, serializes writes and converges to newest order", async () => {
  vi.useFakeTimers();
  const f = setup();
  let release!: () => void;
  const block = new Promise<void>((resolve) => {
    release = resolve;
  });
  const original = f.move.getMockImplementation()!;
  f.move.mockImplementationOnce(async (...args) => {
    await block;
    await original(...args);
  });
  f.queue.reorder(f.server, 0, 2);
  await vi.advanceTimersByTimeAsync(400);
  expect(f.move).toHaveBeenCalledTimes(1);
  f.queue.reorder([f.server[1], f.server[2], f.server[0]], 2, 0);
  expect(f.queue.getSnapshot().groups.get(false)?.ids).toEqual(["a", "b", "c"]);
  release();
  await vi.advanceTimersByTimeAsync(400);
  expect(f.server.map((n) => n.id)).toEqual(["a", "b", "c"]);
  expect(f.queue.getSnapshot().groups.size).toBe(0);
  expect(f.move).toHaveBeenCalledTimes(2);
});
it("preserves failed order and retries by reading canonical state", async () => {
  vi.useFakeTimers();
  const f = setup();
  f.move.mockRejectedValueOnce(new Error("offline"));
  f.queue.reorder(f.server, 0, 2);
  await vi.advanceTimersByTimeAsync(400);
  expect(f.queue.getSnapshot().groups.get(false)).toMatchObject({
    ids: ["b", "c", "a"],
    error: true,
  });
  f.queue.retry();
  await vi.advanceTimersByTimeAsync(0);
  expect(f.server.map((n) => n.id)).toEqual(["b", "c", "a"]);
  expect(f.queue.getSnapshot().groups.size).toBe(0);
});
it("does not send or expose another account pending order", async () => {
  vi.useFakeTimers();
  const f = setup();
  f.queue.reorder(f.server, 0, 2);
  f.changeOwner();
  expect(f.queue.getSnapshot().groups.size).toBe(0);
  await vi.advanceTimersByTimeAsync(400);
  expect(f.load).not.toHaveBeenCalled();
});
it("retry handles a lost response without sending the same move twice", async () => {
  vi.useFakeTimers();
  const f = setup();
  const original = f.move.getMockImplementation()!;
  f.move.mockImplementationOnce(async (...args) => {
    await original(...args);
    throw new Error("lost acknowledgement");
  });
  f.queue.reorder(f.server, 0, 2);
  await vi.advanceTimersByTimeAsync(400);
  expect(f.queue.getSnapshot().groups.get(false)?.error).toBe(true);
  f.queue.retry();
  await vi.advanceTimersByTimeAsync(0);
  expect(f.move).toHaveBeenCalledTimes(1);
  expect(f.queue.getSnapshot().groups.size).toBe(0);
});
it("converges for every three-card permutation", async () => {
  vi.useFakeTimers();
  for (const ids of [
    ["a", "b", "c"],
    ["a", "c", "b"],
    ["b", "a", "c"],
    ["b", "c", "a"],
    ["c", "a", "b"],
    ["c", "b", "a"],
  ]) {
    const f = setup();
    const desired = [...f.server];
    ids.forEach((id, to) => {
      const from = desired.findIndex((n) => n.id === id);
      f.queue.reorder(desired, from, to);
      const [item] = desired.splice(from, 1);
      desired.splice(to, 0, item);
    });
    await vi.advanceTimersByTimeAsync(400);
    expect(f.server.map((n) => n.id)).toEqual(ids);
    expect(f.move.mock.calls.length).toBeLessThanOrEqual(3);
  }
});
it("ignores an in-flight response after the account changes", async () => {
  vi.useFakeTimers();
  const f = setup();
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => {
    release = resolve;
  });
  f.load.mockImplementationOnce(async () => {
    await blocked;
    return f.server;
  });
  f.queue.reorder(f.server, 0, 2);
  await vi.advanceTimersByTimeAsync(400);
  f.changeOwner();
  release();
  await vi.advanceTimersByTimeAsync(0);
  expect(f.move).not.toHaveBeenCalled();
  expect(f.publish).not.toHaveBeenCalled();
  expect(f.queue.getSnapshot().groups.size).toBe(0);
});
it("reset clears pending order and allows a fresh batch for the same owner", async () => {
  vi.useFakeTimers();
  const f = setup();
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => {
    release = resolve;
  });
  f.load.mockImplementationOnce(async () => {
    await blocked;
    return f.server;
  });
  f.queue.reorder(f.server, 0, 2);
  await vi.advanceTimersByTimeAsync(400);
  f.queue.reset();
  release();
  await vi.advanceTimersByTimeAsync(0);
  expect(f.queue.getSnapshot().groups.size).toBe(0);
  expect(f.move).not.toHaveBeenCalled();
  f.queue.reorder(f.server, 0, 2);
  await vi.advanceTimersByTimeAsync(400);
  expect(f.server.map((n) => n.id)).toEqual(["b", "c", "a"]);
});
