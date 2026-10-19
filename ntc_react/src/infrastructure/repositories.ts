import type {
  Account,
  AuditEvent,
  DeviceSession,
  InboxItem,
  Label,
  LinkedLogin,
  Me,
  Note,
  NoteDraft,
  NoteFilter,
  Page,
  Profile,
  Reminder,
  ReminderInput,
  Role,
  Statistics,
} from "../domain/models";
import { ApiClient, ApiError, query } from "./http";
import { validateDocument } from "../domain/document";
export class NotesRepository {
  constructor(readonly api: ApiClient) {}
  list(filter: NoteFilter, pageNumber = 1, signal?: AbortSignal) {
    return this.api.request<Page<Note>>(
      "/notes" + query({ ...filter, pageNumber, pageSize: 100 }),
      { signal },
    );
  }
  find(id: string) {
    return this.api.request<Note>(`/notes/${id}`);
  }
  async findTrashed(id: string, signal?: AbortSignal): Promise<Note> {
    let pageNumber = 1;
    while (true) {
      const page = await this.list({ trash: true }, pageNumber++, signal);
      const note = page.items.find((n) => n.id === id);
      if (note) return note;
      if (!page.hasNextPage)
        throw new ApiError(404, {
          message: "This note is no longer in the trash.",
        });
    }
  }
  create(draft: NoteDraft, key: string) {
    validateDocument(draft.documentJson);
    return this.api.request<Note>("/notes", {
      method: "POST",
      body: draft,
      headers: { "Idempotency-Key": key },
    });
  }
  patch(id: string, draft: NoteDraft, version: string) {
    validateDocument(draft.documentJson);
    return this.api.request<Note>(`/notes/${id}`, {
      method: "PATCH",
      body: { ...draft, version },
    });
  }
  pin(note: Note) {
    return this.api.request<Note>(`/notes/${note.id}/pin`, {
      method: "PATCH",
      body: { isPinned: !note.isPinned, version: note.version },
    });
  }
  trash(id: string) {
    return this.api.request<boolean>(`/notes/${id}/trash`, { method: "POST" });
  }
  restore(id: string) {
    return this.api.request<Note>(`/notes/${id}/restore`, { method: "POST" });
  }
  delete(id: string) {
    return this.api.request<boolean>(`/notes/${id}`, { method: "DELETE" });
  }
  reorder(
    draggedId: string,
    version: string,
    previousId: string | null,
    nextId: string | null,
  ) {
    return this.api.request<boolean>("/notes/reorder", {
      method: "POST",
      body: { draggedId, version, previousId, nextId },
    });
  }
}
export class LabelsRepository {
  constructor(readonly api: ApiClient) {}
  list(pageNumber = 1, signal?: AbortSignal) {
    return this.api.request<Page<Label>>(
      "/tags" + query({ pageNumber, pageSize: 100 }),
      { signal },
    );
  }
  create(body: { name: string; color: string | null; icon: string | null }) {
    return this.api.request<Label>("/tags", { method: "POST", body });
  }
  patch(
    label: Label,
    body: { name: string; color: string | null; icon: string | null },
  ) {
    return this.api.request<Label>(`/tags/${label.id}`, {
      method: "PATCH",
      body: { ...body, version: label.version },
    });
  }
  delete(id: string) {
    return this.api.request<boolean>(`/tags/${id}`, { method: "DELETE" });
  }
}
export class RemindersRepository {
  constructor(readonly api: ApiClient) {}
  list(pageNumber = 1, signal?: AbortSignal) {
    return this.api.request<Page<Reminder>>(
      "/reminders" + query({ pageNumber, pageSize: 100 }),
      { signal },
    );
  }
  forNote(noteId: string) {
    return this.api.request<Reminder[]>(`/notes/${noteId}/reminders`);
  }
  create(noteId: string, body: ReminderInput) {
    return this.api.request<Reminder>(`/notes/${noteId}/reminders`, {
      method: "POST",
      body,
    });
  }
  patch(
    reminder: Reminder,
    body: Partial<ReminderInput> & { isActive?: boolean },
  ) {
    return this.api.request<Reminder>(`/reminders/${reminder.id}`, {
      method: "PATCH",
      body: { ...body, version: reminder.version },
    });
  }
  delete(id: string) {
    return this.api.request<boolean>(`/reminders/${id}`, { method: "DELETE" });
  }
}
export class AccountRepository {
  constructor(readonly api: ApiClient) {}
  me() {
    return this.api.request<Me>("/me");
  }
  profile(body: object, exists: boolean) {
    return this.api.request<Profile>(exists ? "/me" : "/me/profile", {
      method: exists ? "PATCH" : "POST",
      body,
    });
  }
  phone(phoneNumber: string | null) {
    return this.api.request<Account>("/me/account", {
      method: "PATCH",
      body: { phoneNumber },
    });
  }
  sessions(pageNumber = 1) {
    return this.api.request<Page<DeviceSession>>(
      "/me/sessions" + query({ pageNumber, pageSize: 100 }),
    );
  }
  revoke(id: string) {
    return this.api.request<boolean>(`/me/sessions/${id}`, {
      method: "DELETE",
    });
  }
  logins() {
    return this.api.request<LinkedLogin[]>("/me/logins");
  }
  changePassword(currentPassword: string, newPassword: string) {
    return this.api.request<boolean>("/me/change-password", {
      method: "POST",
      body: { currentPassword, newPassword },
    });
  }
  changeEmail(email: string) {
    return this.api.request<boolean>("/me/change-email", {
      method: "POST",
      body: { email },
    });
  }
  passwordEmail() {
    return this.api.request<boolean>("/me/password-email", { method: "POST" });
  }
  link(idToken: string) {
    return this.api.request<boolean>("/me/google-link", {
      method: "POST",
      body: { idToken },
    });
  }
  unlink() {
    return this.api.request<boolean>("/me/google-link", { method: "DELETE" });
  }
  revokeAll() {
    return this.api.request<boolean>("/auth/revoke-all", { method: "POST" });
  }
}
export class InboxRepository {
  constructor(readonly api: ApiClient) {}
  list(pageNumber = 1, unreadOnly = false) {
    return this.api.request<Page<InboxItem>>(
      "/notifications" + query({ pageNumber, pageSize: 50, unreadOnly }),
    );
  }
  count() {
    return this.api.request<number>("/notifications/unread-count");
  }
  read(id: string) {
    return this.api.request<boolean>(`/notifications/${id}/read`, {
      method: "PATCH",
    });
  }
  readAll() {
    return this.api.request<number>("/notifications/read-all", {
      method: "PATCH",
    });
  }
}
export class AdminRepository {
  constructor(readonly api: ApiClient) {}
  user(id: string) {
    return this.api.request<Account>(`/admin/users/${id}`);
  }
  users(pageNumber = 1, q = "", includeDeactivated = false) {
    return this.api.request<Page<Account>>(
      "/admin/users" +
        query({ pageNumber, pageSize: 20, q, includeDeactivated }),
    );
  }
  createUser(body: object) {
    return this.api.request("/admin/users", { method: "POST", body });
  }
  userAction(
    id: string,
    action: "lock" | "deactivate" | "restore",
    isLocked?: boolean,
  ) {
    return this.api.request(`/admin/users/${id}/${action}`, {
      method: action === "lock" ? "PATCH" : "POST",
      ...(action === "lock" ? { body: { isLocked } } : {}),
    });
  }
  stats() {
    return this.api.request<Statistics>("/admin/statistics");
  }
  roles(pageNumber = 1) {
    return this.api.request<Page<Role>>(
      "/admin/roles" + query({ pageNumber, pageSize: 100 }),
    );
  }
  saveRole(body: object, id?: string) {
    return this.api.request<Role>(id ? `/admin/roles/${id}` : "/admin/roles", {
      method: id ? "PATCH" : "POST",
      body,
    });
  }
  deleteRole(id: string) {
    return this.api.request(`/admin/roles/${id}`, { method: "DELETE" });
  }
  memberships(id: string) {
    return this.api.request<Role[]>(`/admin/users/${id}/roles`);
  }
  membership(userId: string, roleId: string, add: boolean) {
    return this.api.request(`/admin/users/${userId}/roles/${roleId}`, {
      method: add ? "PUT" : "DELETE",
    });
  }
  audit(pageNumber = 1, targetUserId?: string, action?: number) {
    return this.api.request<Page<AuditEvent>>(
      "/admin/audit-events" +
        query({ pageNumber, pageSize: 30, targetUserId, action }),
    );
  }
}
