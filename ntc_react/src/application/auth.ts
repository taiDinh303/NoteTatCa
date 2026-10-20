import type { Session } from "../domain/models";
import { ApiClient, ApiError } from "../infrastructure/http";
import { isAdministrator } from "./access";
export interface SessionStoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
interface StoredRefresh {
  schema: 1;
  refreshToken: string;
  refreshExpiresAt: string;
  userId: string;
}
export class SessionVault {
  private readonly key = "ntc.session.v1";
  private readonly storage: SessionStoragePort;
  constructor(storage: SessionStoragePort) {
    this.storage = storage;
  }
  read(): StoredRefresh | null {
    try {
      const raw = this.storage.getItem(this.key);
      if (!raw) return null;
      const value = JSON.parse(raw) as StoredRefresh;
      if (
        value.schema !== 1 ||
        typeof value.refreshToken !== "string" ||
        typeof value.userId !== "string" ||
        !Number.isFinite(Date.parse(value.refreshExpiresAt)) ||
        Date.parse(value.refreshExpiresAt) <= Date.now()
      ) {
        this.clear();
        return null;
      }
      return value;
    } catch {
      this.clear();
      return null;
    }
  }
  write(session: Session) {
    try {
      this.storage.setItem(
        this.key,
        JSON.stringify({
          schema: 1,
          refreshToken: session.refreshToken,
          refreshExpiresAt: session.refreshExpiresAt,
          userId: session.userId,
        }),
      );
    } catch {
      /* Memory-only session remains usable if browser storage is blocked. */
    }
  }
  clear() {
    try {
      this.storage.removeItem(this.key);
    } catch {
      /* Browser storage may be disabled. */
    }
  }
}
export interface AuthSnapshot {
  status: "loading" | "unavailable" | "anonymous" | "authenticated" | "expired";
  session?: Session;
}
export class AuthService {
  private snapshot: AuthSnapshot = { status: "loading" };
  private listeners = new Set<() => void>();
  private refreshInFlight?: Promise<void>;
  private boot?: Promise<void>;
  private generation = 0;
  private readonly api: ApiClient;
  private readonly vault: SessionVault;
  private readonly clearPrivate: () => void;
  constructor(
    api: ApiClient,
    vault: SessionVault,
    clearPrivate: () => void,
    private readonly beforeAuthentication: () => Promise<void> = async () => {},
  ) {
    this.api = api;
    this.vault = vault;
    this.clearPrivate = clearPrivate;
  }
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private emit(snapshot: AuthSnapshot) {
    this.snapshot = snapshot;
    this.listeners.forEach((f) => f());
  }
  accessToken() {
    return this.snapshot.status === "authenticated"
      ? this.snapshot.session?.token
      : undefined;
  }
  identity() {
    const session = this.snapshot.session;
    return session
      ? `${session.userId}:${isAdministrator(session) ? "admin" : "member"}`
      : undefined;
  }
  private accept(session: Session) {
    if (
      this.snapshot.session?.userId !== session.userId ||
      isAdministrator(this.snapshot.session) !== isAdministrator(session)
    )
      this.clearPrivate();
    this.vault.write(session);
    this.emit({ status: "authenticated", session });
  }
  bootstrap(retry = false) {
    if (retry && this.snapshot.status === "unavailable") {
      this.boot = undefined;
      this.emit({ status: "loading" });
    }
    return (this.boot ??= (async () => {
      if (!this.vault.read()) {
        this.emit({ status: "anonymous" });
        return;
      }
      const generation = this.generation;
      try {
        await this.refresh();
      } catch (error) {
        if (generation !== this.generation) return;
        if (!(
          error instanceof ApiError && [400, 401, 403].includes(error.status)
        )) {
          this.emit({ status: "unavailable" });
          return;
        }
        this.vault.clear();
        this.emit({ status: "anonymous" });
      }
    })());
  }
  refresh(): Promise<void> {
    if (this.refreshInFlight) return this.refreshInFlight;
    const generation = this.generation;
    this.refreshInFlight = (async () => {
      const saved = this.vault.read();
      if (!saved) throw new Error("No refresh session");
      await this.beforeAuthentication();
      if (generation !== this.generation)
        throw new Error("The session changed while connecting.");
      const value = await this.api.request<Session>("/auth/refresh", {
        method: "POST",
        body: { refreshToken: saved.refreshToken },
        authenticated: false,
      });
      if (generation !== this.generation)
        throw new Error("The session changed while refreshing.");
      this.accept(value);
    })().finally(() => {
      this.refreshInFlight = undefined;
    });
    return this.refreshInFlight;
  }
  expire() {
    this.generation++;
    this.vault.clear();
    const session = this.snapshot.session;
    this.emit({ status: session ? "expired" : "anonymous", session });
  }
  async login(email: string, password: string, rememberMe = false) {
    const generation = ++this.generation;
    await this.beforeAuthentication();
    if (generation !== this.generation) return;
    const session = await this.api.request<Session>("/auth/login", {
      method: "POST",
      body: { email, password, rememberMe },
      authenticated: false,
    });
    if (generation === this.generation) this.accept(session);
  }
  async google(idToken: string) {
    const generation = ++this.generation;
    await this.beforeAuthentication();
    if (generation !== this.generation) return;
    const session = await this.api.request<Session>("/auth/google", {
      method: "POST",
      body: { idToken },
      authenticated: false,
    });
    if (generation === this.generation) this.accept(session);
  }
  async logout() {
    const generation = ++this.generation;
    const saved = this.vault.read();
    try {
      if (saved && this.accessToken())
        await this.api.request("/auth/logout", {
          method: "POST",
          body: { refreshToken: saved.refreshToken },
        });
    } catch {
      // Local sign-out must also work after server-side revocation or an outage.
    } finally {
      if (generation === this.generation) {
        this.clearPrivate();
        this.vault.clear();
        this.emit({ status: "anonymous" });
      }
    }
  }
}
