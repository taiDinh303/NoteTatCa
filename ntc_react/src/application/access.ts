import type { Session } from "../domain/models";

type Identity = Pick<Session, "roles"> | undefined;

/** Admin takes precedence for historical accounts that also have the User role. */
export function isAdministrator(session: Identity): boolean {
  return session?.roles.includes("Admin") ?? false;
}

export function homePath(session: Identity): string {
  return isAdministrator(session) ? "/admin/overview" : "/notes";
}

export function settingsPath(session: Identity): string {
  return isAdministrator(session) ? "/admin/settings" : "/settings";
}
