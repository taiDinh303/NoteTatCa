import { describe, it, expect, vi } from "vitest";
import { AuthService, SessionVault } from "./auth";
import { ApiClient } from "../infrastructure/http";
import type { Session } from "../domain/models";
const session = (
  token = "access-old",
  refreshToken = "refresh-old",
): Session => ({
  token,
  refreshToken,
  refreshExpiresAt: new Date(Date.now() + 86400000).toISOString(),
  expiredAt: new Date(Date.now() + 900000).toISOString(),
  userId: "owner-a",
  userName: "a@example.test",
  givenName: "A",
  fullName: "A",
  familyName: null,
  picture: null,
  roles: ["User"],
  timeZoneId: "UTC",
});
function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => {
      values.set(k, v);
    },
    removeItem: (k: string) => {
      values.delete(k);
    },
  };
}
const ok = (data: unknown) =>
  new Response(JSON.stringify({ data }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
describe("session security", () => {
  it("clears private caches and rejects in-flight responses when the same account changes area", async () => {
    let roles = ["User"];
    let release!: (response: Response) => void;
    const transport = vi.fn(async (url: string | URL | Request) => {
      if (String(url).endsWith("/notes"))
        return new Promise<Response>((resolve) => {
          release = resolve;
        });
      return ok({ ...session(), roles });
    });
    const clearPrivate = vi.fn();
    const api = new ApiClient("/api/v1", transport);
    const auth = new AuthService(
      api,
      new SessionVault(storage()),
      clearPrivate,
    );
    api.setAuth(auth);
    await auth.login("a@example.test", "synthetic");
    clearPrivate.mockClear();
    const pending = api.request("/notes");
    roles = ["Admin", "User"];
    await auth.refresh();
    expect(clearPrivate).toHaveBeenCalledOnce();
    release(ok({ content: "old personal response" }));
    await expect(pending).rejects.toMatchObject({ code: "SESSION_CHANGED" });
    clearPrivate.mockClear();
    await auth.refresh();
    expect(clearPrivate).not.toHaveBeenCalled();
    roles = ["User"];
    await auth.refresh();
    expect(clearPrivate).toHaveBeenCalledOnce();
  });
  it("stores only a versioned refresh session, never the access token or private cache", () => {
    const port = storage();
    const vault = new SessionVault(port);
    vault.write(session());
    const raw = port.getItem("ntc.session.v1")!;
    expect(raw).not.toContain("access-old");
    expect(Object.keys(JSON.parse(raw)).sort()).toEqual([
      "refreshExpiresAt",
      "refreshToken",
      "schema",
      "userId",
    ]);
    expect(vault.read()?.userId).toBe("owner-a");
    port.setItem("ntc.session.v1", "invalid json");
    expect(vault.read()).toBeNull();
    expect(port.getItem("ntc.session.v1")).toBeNull();
  });
  it("shares one token rotation across concurrent unauthorized requests", async () => {
    let release!: () => void;
    const wait = new Promise<void>((resolve) => {
      release = resolve;
    });
    let rotations = 0;
    const transport = vi.fn(
      async (url: string | URL | Request, init?: RequestInit) => {
        if (String(url).endsWith("/auth/login")) return ok(session());
        if (String(url).endsWith("/auth/refresh")) {
          rotations++;
          await wait;
          return ok(session("access-new", "refresh-new"));
        }
        return new Headers(init?.headers).get("Authorization") ===
          "Bearer access-new"
          ? ok("private result")
          : new Response(JSON.stringify({ message: "expired" }), {
              status: 401,
            });
      },
    );
    const api = new ApiClient("/api/v1", transport);
    const auth = new AuthService(api, new SessionVault(storage()), vi.fn());
    api.setAuth(auth);
    await auth.login("a@example.test", "synthetic");
    const requests = Promise.all([api.request("/notes"), api.request("/tags")]);
    await vi.waitFor(() => expect(rotations).toBe(1));
    release();
    expect(await requests).toEqual(["private result", "private result"]);
    expect(rotations).toBe(1);
  });
  it("discards an old account response after the active account changes", async () => {
    let resolve!: (response: Response) => void;
    let owner = "a";
    const expire = vi.fn();
    const api = new ApiClient(
      "/api/v1",
      () =>
        new Promise<Response>((r) => {
          resolve = r;
        }),
    );
    api.setAuth({
      accessToken: () => owner,
      identity: () => owner,
      refresh: async () => {},
      expire,
    });
    const pending = api.request("/notes");
    owner = "b";
    resolve(ok({ secret: "belongs to a" }));
    await expect(pending).rejects.toMatchObject({ code: "SESSION_CHANGED" });
    expect(expire).not.toHaveBeenCalled();
  });
});

it("uses the API origin for a legacy route with an absolute API base", async () => {
  const transport = vi.fn(
    async (_url: string | URL | Request, _options?: RequestInit) => ok(true),
  );
  const api = new ApiClient("https://api.example.test/api/v1", transport);
  await api.request("/api/auth/verify-password", { authenticated: false });
  expect(transport.mock.calls[0][0]).toBe(
    "https://api.example.test/api/auth/verify-password",
  );
});
