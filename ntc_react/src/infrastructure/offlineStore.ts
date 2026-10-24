import type { Label, Note, NoteDraft, Session } from "../domain/models";

export type OfflineIdentity = Pick<
  Session,
  | "userId"
  | "userName"
  | "givenName"
  | "familyName"
  | "fullName"
  | "picture"
  | "roles"
  | "timeZoneId"
>;
export interface PendingNote {
  key: string;
  id: string;
  kind: "create" | "patch";
  draft: NoteDraft;
  version: string;
  blocked?: string;
  serverId?: string;
  attempted?: boolean;
}
export interface OfflineData {
  identity?: OfflineIdentity;
  notes: Note[];
  labels: Label[];
  complete: boolean;
  pending: PendingNote[];
  aliases: Record<string, string>;
  versions: Record<string, string>;
}
export const emptyOfflineData = (): OfflineData => ({
  notes: [],
  labels: [],
  complete: false,
  pending: [],
  aliases: {},
  versions: {},
});
export interface OfflineStore {
  read(owner: string): Promise<OfflineData>;
  change<T>(owner: string, update: (data: OfflineData) => T): Promise<T>;
  clear(owner: string): Promise<void>;
}

/** One read/write transaction per change: other tabs cannot overwrite queued edits. */
export class IndexedOfflineStore implements OfflineStore {
  private database?: Promise<IDBDatabase>;
  private open() {
    return (this.database ??= new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("ntc.offline.v1", 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("accounts");
      request.onsuccess = () => {
        request.result.onversionchange = () => {
          request.result.close();
          this.database = undefined;
        };
        resolve(request.result);
      };
      request.onerror = () => {
        this.database = undefined;
        reject(request.error);
      };
      request.onblocked = () =>
        reject(
          new Error("Close other NoteTatCa tabs to enable offline storage."),
        );
    }));
  }
  async read(owner: string): Promise<OfflineData> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const request = db
        .transaction("accounts")
        .objectStore("accounts")
        .get(owner);
      request.onsuccess = () => resolve(request.result ?? emptyOfflineData());
      request.onerror = () => reject(request.error);
    });
  }
  async change<T>(owner: string, update: (data: OfflineData) => T): Promise<T> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("accounts", "readwrite");
      const table = transaction.objectStore("accounts");
      const request = table.get(owner);
      let result: T;
      request.onsuccess = () => {
        try {
          const data: OfflineData = request.result ?? emptyOfflineData();
          result = update(data);
          table.put(data, owner);
        } catch (error) {
          transaction.abort();
          reject(error);
        }
      };
      transaction.oncomplete = () => resolve(result);
      transaction.onabort = transaction.onerror = () =>
        reject(
          transaction.error ??
            new Error("Could not save on this device. Keep your note open."),
        );
    });
  }
  async clear(owner: string) {
    const db = await this.open();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("accounts", "readwrite");
      transaction.objectStore("accounts").delete(owner);
      transaction.oncomplete = () => resolve();
      transaction.onabort = transaction.onerror = () =>
        reject(transaction.error);
    });
  }
}
