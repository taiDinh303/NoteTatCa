import { describe, it, expect, vi } from "vitest";
import { AuthService, SessionVault } from "./auth";
import { ApiClient, ApiError } from "../infrastructure/http";
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
  it("does not clear a newer sign-in when an older bootstrap finishes late", async () => {
    const port = storage();
    const vault = new SessionVault(port);
    vault.write(session());
    let release!: (response: Response) => void;
    const transport = vi.fn(async (url: string | URL | Request) => {
      if (String(url).endsWith("/auth/refresh"))
        return new Promise<Response>((resolve) => {
          release = resolve;
        });
      return ok({ ...session("b-access", "b-refresh"), userId: "owner-b" });
    });
    const auth = new AuthService(
      new ApiClient("/api/v1", transport),
      vault,
      vi.fn(),
    );
    const restoring = auth.bootstrap();
    await vi.waitFor(() => expect(transport).toHaveBeenCalledOnce());
    await auth.login("b@example.test", "synthetic");
    release(ok(session()));
    await restoring;
    expect(auth.getSnapshot()).toMatchObject({
      status: "authenticated",
      session: { userId: "owner-b" },
    });
    expect(vault.read()?.userId).toBe("owner-b");
  });
  it("keeps a refresh session during an outage and restores it on explicit retry", async () => {
    const port = storage();
    const vault = new SessionVault(port);
    vault.write(session());
    let offline = true;
    const transport = vi.fn(async () => ok(session("fresh", "rotated")));
    const auth = new AuthService(
      new ApiClient("/api/v1", transport),
      vault,
      vi.fn(),
      async () => {
        if (offline) throw new ApiError(0);
      },
    );
    await auth.bootstrap();
    expect(auth.getSnapshot().status).toBe("unavailable");
    expect(vault.read()?.refreshToken).toBe("refresh-old");
    expect(transport).not.toHaveBeenCalled();
    offline = false;
    await auth.bootstrap(true);
    expect(auth.getSnapshot().status).toBe("authenticated");
    expect(transport).toHaveBeenCalledOnce();
  });
  it("does not expire the account when a token refresh fails because of connectivity", async () => {
    const expire = vi.fn();
    const api = new ApiClient(
      "/api/v1",
      async () => new Response("{}", { status: 401 }),
    );
    api.setAuth({
      accessToken: () => "old",
      identity: () => "a",
      refresh: async () => {
        throw new ApiError(0);
      },
      expire,
    });
    await expect(api.request("/notes")).rejects.toMatchObject({ status: 0 });
    expect(expire).not.toHaveBeenCalled();
  });
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
