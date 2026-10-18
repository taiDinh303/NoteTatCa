import { afterEach, describe, it, expect, vi } from "vitest";
import { AutosaveCoordinator } from "./autosave";
import { ApiError } from "../infrastructure/http";
import { draftFrom } from "../domain/models";
import type { Note, NoteDraft } from "../domain/models";
const makeNote = (draft: NoteDraft, version = "v1"): Note => ({
  id: "n1",
  userId: "a",
  ...draft,
  content: "text",
  documentSchemaVersion: 1,
  version,
  pinnedAt: null,
  sortOrder: 1000,
  tags: [],
  reminders: [],
  createdTime: new Date().toISOString(),
  lastUpdatedTime: new Date().toISOString(),
  deletedTime: null,
});
afterEach(() => {
  vi.useRealTimers();
});
describe("autosave serialization", () => {
  it("saves edits made in flight using the acknowledged version", async () => {
    const draft = draftFrom();
    const first = { ...draft, title: "First" };
    const second = { ...draft, title: "Second" };
    let acknowledge!: (note: Note) => void;
    const patch = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<Note>((resolve) => {
            acknowledge = resolve;
          }),
      )
      .mockImplementationOnce(async (_id: string, d: NoteDraft) =>
        makeNote(d, "v3"),
      );
    const writer = { create: vi.fn(), patch };
    const committed = vi.fn();
    const saver = new AutosaveCoordinator(
      writer,
      draft,
      makeNote(draft),
      committed,
      100000,
    );
    saver.update(first);
    const saving = saver.flush();
    saver.update(second);
    acknowledge(makeNote(first, "v2"));
    await saving;
    expect(patch.mock.calls[1]).toEqual(["n1", second, "v2"]);
    expect(saver.getSnapshot()).toMatchObject({
      status: "saved",
      dirty: false,
      note: { title: "Second", version: "v3" },
    });
    saver.dispose();
  });
  it("retries a lost create acknowledgement with its original payload and idempotency key before applying newer edits", async () => {
    const empty = draftFrom();
    const first = { ...empty, title: "Original" };
    const later = { ...empty, title: "Changed after network failure" };
    const create = vi
      .fn()
      .mockRejectedValueOnce(new ApiError(0))
      .mockImplementationOnce(async (d: NoteDraft) => makeNote(d));
    const patch = vi.fn(async (_id: string, d: NoteDraft) => makeNote(d, "v2"));
    const saver = new AutosaveCoordinator(
      { create, patch },
      empty,
      undefined,
      vi.fn(),
      100000,
    );
    saver.update(first);
    await expect(saver.flush()).rejects.toBeInstanceOf(ApiError);
    saver.update(later);
    await saver.flush();
    expect(create.mock.calls[0]).toEqual(create.mock.calls[1]);
    expect(create.mock.calls[1][0]).toEqual(first);
    expect(patch.mock.calls[0]).toEqual(["n1", later, "v1"]);
    expect(saver.getSnapshot().dirty).toBe(false);
    saver.dispose();
  });
  it("pauses on a version conflict without discarding the current draft or automatically overwriting it", async () => {
    vi.useFakeTimers();
    const initial = draftFrom();
    const patch = vi
      .fn()
      .mockRejectedValue(new ApiError(409, { message: "stale" }));
    const saver = new AutosaveCoordinator(
      { create: vi.fn(), patch },
      initial,
      makeNote(initial),
      vi.fn(),
      20,
    );
    saver.update({ ...initial, title: "local" });
    await expect(saver.flush()).rejects.toMatchObject({ status: 409 });
    saver.update({ ...initial, title: "still local" });
    await vi.advanceTimersByTimeAsync(1000);
    expect(patch).toHaveBeenCalledTimes(1);
    expect(saver.getSnapshot()).toMatchObject({
      status: "conflict",
      dirty: true,
    });
    saver.dispose();
  });
  it("can resume after a StrictMode lifecycle cleanup and explicitly create an empty untitled note", async () => {
    vi.useFakeTimers();
    const initial = draftFrom();
    const create = vi.fn(async (d: NoteDraft) => makeNote(d));
    const saver = new AutosaveCoordinator(
      { create, patch: vi.fn() },
      initial,
      undefined,
      vi.fn(),
      10,
    );
    saver.dispose();
    saver.resume();
    await saver.flush(true);
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0].title).toBe("");
    saver.dispose();
  });
});

it("retains an oversized draft and can save after it is corrected", async () => {
  const initial = draftFrom();
  const create = vi.fn(async (d: NoteDraft) => makeNote(d));
  const saver = new AutosaveCoordinator(
    { create, patch: vi.fn() },
    initial,
    undefined,
    vi.fn(),
    100000,
  );
  saver.update({
    ...initial,
    documentJson: JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "x".repeat(100001) }],
        },
      ],
    }),
  });
  await expect(saver.flush()).rejects.toThrow("100,000");
  expect(saver.getSnapshot()).toMatchObject({ status: "error", dirty: true });
  expect(create).not.toHaveBeenCalled();
  saver.update({ ...initial, title: "Corrected" });
  await saver.flush();
  expect(create.mock.calls[0][0].title).toBe("Corrected");
  expect(saver.getSnapshot().dirty).toBe(false);
  saver.dispose();
});
