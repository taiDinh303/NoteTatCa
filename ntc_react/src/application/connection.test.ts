import { afterEach, describe, expect, it, vi } from "vitest";
import { healthUrl, ServerConnection } from "./connection";
import { ApiClient } from "../infrastructure/http";
const live = () =>
  new Response(JSON.stringify({ status: "live" }), {
    headers: { "Content-Type": "application/json" },
  });
afterEach(() => vi.useRealTimers());
describe("server connection", () => {
  it("uses the API origin health endpoint and shares a bounded wake-up probe", async () => {
    vi.useFakeTimers();
    const transport = vi
      .fn()
      .mockResolvedValueOnce(new Response("Starting", { status: 503 }))
      .mockResolvedValueOnce(new Response("Starting", { status: 200 }))
      .mockImplementation(async () => live());
    const service = new ServerConnection(
      "https://api.example.test/health/live",
      transport,
      () => true,
    );
    const first = service.ensureReady();
    const second = service.ensureReady();
    expect(first).toBe(second);
    await vi.advanceTimersByTimeAsync(3500);
    await first;
    expect(transport).toHaveBeenCalledTimes(3);
    expect(
      transport.mock.calls.every(
        ([, options]) =>
          options.method === "GET" &&
          !options.body &&
          options.credentials === "omit",
      ),
    ).toBe(true);
    expect(service.getSnapshot()).toMatchObject({
      warming: false,
      problem: null,
      pending: 0,
    });
    await service.ensureReady();
    expect(transport).toHaveBeenCalledTimes(3);
    expect(healthUrl("https://api.example.test/api/v1")).toBe(
      "https://api.example.test/health/live",
    );
    expect(healthUrl("/api/v1")).toBe("/health/live");
  });
  it("stops after its deadline and does not keep the host awake while idle", async () => {
    vi.useFakeTimers();
    const transport = vi.fn(
      async () => new Response("Unavailable", { status: 503 }),
    );
    const service = new ServerConnection(
      "/health/live",
      transport,
      () => true,
      2500,
    );
    const pending = service.ensureReady().catch((error) => error);
    await vi.advanceTimersByTimeAsync(2600);
    expect(await pending).toMatchObject({ status: 0 });
    const count = transport.mock.calls.length;
    await vi.advanceTimersByTimeAsync(60_000);
    expect(transport).toHaveBeenCalledTimes(count);
    expect(service.getSnapshot()).toMatchObject({
      warming: false,
      problem: "unavailable",
    });
  });
  it("reports an outage but never automatically replays a failed write", async () => {
    const transport = vi.fn(async () => {
      throw new TypeError("offline");
    });
    const monitor = new ServerConnection(
      "/health/live",
      transport,
      () => false,
    );
    const api = new ApiClient("/api/v1", transport);
    api.setConnection(monitor);
    await expect(
      api.request("/notes", { method: "POST", body: { title: "kept" } }),
    ).rejects.toMatchObject({ status: 0 });
    expect(transport).toHaveBeenCalledOnce();
    expect(monitor.getSnapshot()).toMatchObject({
      problem: "offline",
      pending: 0,
    });
  });
});
