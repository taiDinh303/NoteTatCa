import { isConnectionError } from "../application/connection";
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly traceId?: string;
  readonly fields: Record<string, string[]>;
  constructor(
    status: number,
    body: {
      message?: string;
      code?: string;
      traceId?: string;
      errors?: Record<string, string[]>;
    } = {},
  ) {
    super(
      body.message ??
        (status === 0
          ? "Unable to reach the server. Check your connection and try again."
          : `Request failed (${status}).`),
    );
    this.name = "ApiError";
    this.status = status;
    this.code = body.code ?? "REQUEST_FAILED";
    this.traceId = body.traceId;
    this.fields = body.errors ?? {};
  }
}
export interface AccessProvider {
  accessToken(): string | undefined;
  identity(): string | undefined;
  refresh(): Promise<void>;
  expire(): void;
}
export interface RequestOptions {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
  headers?: Record<string, string>;
  authenticated?: boolean;
}
export class ApiClient {
  private auth?: AccessProvider;
  private connection?: { begin(): (error?: unknown) => void };
  readonly baseUrl: string;
  constructor(
    baseUrl: string,
    private readonly transport: typeof fetch = globalThis.fetch.bind(
      globalThis,
    ),
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }
  setAuth(auth: AccessProvider) {
    this.auth = auth;
  }
  setConnection(connection: { begin(): (error?: unknown) => void }) {
    this.connection = connection;
  }
  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const finish = this.connection?.begin();
    try {
      const value = await this.perform<T>(path, options);
      finish?.();
      return value;
    } catch (error) {
      finish?.(error);
      throw error;
    }
  }
  private async perform<T>(path: string, options: RequestOptions): Promise<T> {
    const authenticated = options.authenticated !== false;
    const owner = authenticated ? this.auth?.identity() : undefined;
    let lastSentToken: string | undefined;
    const send = async () => {
      const token = authenticated ? this.auth?.accessToken() : undefined;
      lastSentToken = token;
      let response: Response;
      try {
        response = await this.transport(
          path.startsWith("/api/")
            ? /^https?:\/\//i.test(this.baseUrl)
              ? new URL(path, this.baseUrl).toString()
              : path
            : this.baseUrl + path,
          {
            method: options.method ?? "GET",
            signal: options.signal
              ? AbortSignal.any([options.signal, AbortSignal.timeout(30000)])
              : AbortSignal.timeout(30000),
            credentials: "omit",
            cache: "no-store",
            headers: {
              Accept: "application/json",
              ...(options.body !== undefined
                ? { "Content-Type": "application/json" }
                : {}),
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
              ...options.headers,
            },
            ...(options.body !== undefined
              ? { body: JSON.stringify(options.body) }
              : {}),
          },
        );
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError")
          throw error;
        throw new ApiError(0);
      }
      return response;
    };
    let response = await send();
    if (authenticated && owner !== this.auth?.identity())
      throw new ApiError(401, {
        code: "SESSION_CHANGED",
        message: "The signed-in account changed. This request was discarded.",
      });
    if (response.status === 401 && authenticated && this.auth) {
      try {
        if (
          !this.auth.accessToken() ||
          this.auth.accessToken() === lastSentToken
        )
          await this.auth.refresh();
        response = await send();
      } catch (error) {
        if (owner !== this.auth.identity())
          throw new ApiError(401, {
            code: "SESSION_CHANGED",
            message:
              "The signed-in account changed. This request was discarded.",
          });
        if (isConnectionError(error)) throw error;
        this.auth.expire();
        throw new ApiError(401, {
          message: "Your session expired. Sign in again to continue.",
          code: "SESSION_EXPIRED",
        });
      }
    }
    let body: {
      data?: T;
      message?: string;
      code?: string;
      traceId?: string;
      errors?: Record<string, string[]>;
    };
    try {
      body = await response.json();
    } catch {
      throw new ApiError(response.status, {
        message: response.ok
          ? "The server returned an unexpected response."
          : "The server is unavailable. Try again shortly.",
      });
    }
    if (authenticated && owner !== this.auth?.identity())
      throw new ApiError(401, {
        code: "SESSION_CHANGED",
        message: "The signed-in account changed. This request was discarded.",
      });
    if (!response.ok) {
      if (authenticated && response.status === 401) this.auth?.expire();
      throw new ApiError(response.status, body);
    }
    return body.data as T;
  }
}
export function query(params: object): string {
  const values = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") values.set(k, String(v));
  });
  return values.size ? "?" + values.toString() : "";
}
