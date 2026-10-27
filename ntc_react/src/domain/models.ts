export interface Page<T> {
  items: T[];
  totalItems: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
export interface Label {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  version: string;
}
export interface Reminder {
  id: string;
  noteId: string;
  noteTitle: string | null;
  notePreview: string | null;
  noteColor: string | null;
  reminderAt: string;
  timeZoneId: string;
  repeatType: number;
  repeatInterval: number;
  repeatDays: number | null;
  repeatUntil: string | null;
  repeatCount: number | null;
  nextOccurrenceAt: string | null;
  isActive: boolean;
  sendEmail: boolean;
  version: string;
}
export interface Note {
  id: string;
  userId: string;
  title: string | null;
  content: string;
  documentJson: string | null;
  documentSchemaVersion: number;
  iconEmoji: string | null;
  version: string;
  isPinned: boolean;
  pinnedAt: string | null;
  backgroundColor: string | null;
  sortOrder: number;
  tags: Label[];
  reminders: Reminder[];
  createdTime: string;
  lastUpdatedTime: string;
  deletedTime: string | null;
}
export interface NoteDraft {
  title: string;
  documentJson: string;
  iconEmoji: string;
  backgroundColor: string;
  isPinned: boolean;
  tagIds: string[];
}
export interface NoteFilter {
  q?: string;
  tagId?: string;
  trash?: boolean;
  pinned?: boolean;
  hasReminder?: boolean;
}
export interface Session {
  token: string;
  expiredAt: string;
  refreshToken: string;
  refreshExpiresAt: string;
  userId: string;
  userName: string;
  givenName: string;
  familyName: string | null;
  picture: string | null;
  fullName: string;
  roles: string[];
  timeZoneId: string;
}
export interface Profile {
  userId: string;
  version: string;
  givenName: string;
  familyName: string | null;
  picture: string | null;
  email: string;
  locale: string | null;
  address: string | null;
  timeZoneId: string;
  birthDate: string | null;
  gender: number;
  fullName: string;
}
export interface Account {
  id: string;
  userName: string;
  email: string;
  phoneNumber: string | null;
  isLocked: boolean;
  deactivatedAt: string | null;
  timeZoneId: string;
  emailConfirmed: boolean;
  hasPassword: boolean;
  createdTime: string;
}
export interface Me {
  account: Account;
  profile: Profile | null;
}
export interface DeviceSession {
  id: string;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}
export interface LinkedLogin {
  provider: string;
  displayName: string | null;
}
export interface InboxItem {
  id: string;
  noteId: string;
  reminderId: string;
  occurrenceAt: string;
  readAt: string | null;
}
export interface Role {
  id: string;
  name: string;
  description: string;
  normalizedName: string;
}
export interface AuditEvent {
  id: string;
  actorUserId: string | null;
  targetUserId: string | null;
  roleId: string | null;
  action: number;
  occurredAt: string;
}
export interface Statistics {
  [key: string]: number;
}
export type ReminderInput = Pick<
  Reminder,
  | "reminderAt"
  | "timeZoneId"
  | "repeatType"
  | "repeatInterval"
  | "repeatDays"
  | "repeatUntil"
  | "repeatCount"
  | "sendEmail"
>;
export interface RichNode {
  type: string;
  text?: string;
  content?: RichNode[];
  attrs?: Record<string, unknown>;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
}
export const NOTE_COLORS = [
  "",
  "#fff4d4",
  "#fce4e5",
  "#e8e4fc",
  "#deedf8",
  "#dff0e6",
  "#f8e8d7",
];
export const EMOJIS = [
  "",
  "📝",
  "💡",
  "🌿",
  "🎯",
  "📚",
  "✨",
  "☕",
  "🎨",
  "✈️",
  "💻",
  "🧠",
  "❤️",
  "🏡",
  "✅",
  "📌",
];
export const REPEAT_NAMES = [
  "Does not repeat",
  "Daily",
  "Weekly",
  "Monthly",
  "Yearly",
];
export const WEEKDAYS = [
  ["Mon", 1],
  ["Tue", 2],
  ["Wed", 4],
  ["Thu", 8],
  ["Fri", 16],
  ["Sat", 32],
  ["Sun", 64],
] as const;
export function plainDocument(text: string): RichNode {
  return {
    type: "doc",
    content: text.split(/\r?\n/).map((line) => ({
      type: "paragraph",
      ...(line ? { content: [{ type: "text", text: line }] } : {}),
    })),
  };
}
export function draftFrom(note?: Note): NoteDraft {
  return {
    title: note?.title ?? "",
    documentJson:
      note?.documentJson ?? JSON.stringify(plainDocument(note?.content ?? "")),
    iconEmoji: note?.iconEmoji ?? "",
    backgroundColor: note?.backgroundColor ?? "",
    isPinned: note?.isPinned ?? false,
    tagIds: note?.tags.map((x) => x.id) ?? [],
  };
}
export function sortNotes(notes: Note[]): Note[] {
  return [...notes].sort(
    (a, b) =>
      Number(b.isPinned) - Number(a.isPinned) ||
      a.sortOrder - b.sortOrder ||
      a.id.localeCompare(b.id),
  );
}
export function matchesNote(note: Note, filter: NoteFilter): boolean {
  const q = filter.q?.trim().toLocaleLowerCase();
  return (
    Boolean(note.deletedTime) === Boolean(filter.trash) &&
    (!filter.tagId || note.tags.some((t) => t.id === filter.tagId)) &&
    (filter.pinned === undefined || note.isPinned === filter.pinned) &&
    (!filter.hasReminder || note.reminders.some((r) => r.isActive)) &&
    (!q || `${note.title} ${note.content}`.toLocaleLowerCase().includes(q))
  );
}
