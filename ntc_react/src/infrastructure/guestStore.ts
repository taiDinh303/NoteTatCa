import type { Label, Note, NoteDraft } from "../domain/models";

export const GUEST_OWNER = "guest-local";
export interface GuestCopy {
  key: string;
  draft?: NoteDraft;
  serverId?: string;
  complete?: boolean;
}
export interface GuestTransfer {
  labels: Record<string, string>;
  notes: Record<string, GuestCopy>;
}
export interface GuestData {
  initialized: boolean;
  revision: number;
  notes: Note[];
  labels: Label[];
  creates: Record<string, { id: string; payload: string }>;
  transfers: Record<string, GuestTransfer>;
}
export const emptyGuest = (): GuestData => ({
  initialized: false,
  revision: 0,
  notes: [],
  labels: [],
  creates: {},
  transfers: {},
});
export interface GuestStore {
  read(): Promise<GuestData>;
  change<T>(update: (data: GuestData) => T): Promise<T>;
}
/** Guest data has its own database: clearing an account cache never clears the demo. */
export class IndexedGuestStore implements GuestStore {
  private database?: Promise<IDBDatabase>;
  private open() {
    return (this.database ??= new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("ntc.guest.v1", 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("workspace");
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          this.database = undefined;
        };
        resolve(db);
      };
      request.onerror = () => {
        this.database = undefined;
        reject(request.error);
      };
      request.onblocked = () =>
        reject(new Error("Close other NoteTatCa tabs and retry guest mode."));
    }));
  }
  async read(): Promise<GuestData> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const request = db
        .transaction("workspace")
        .objectStore("workspace")
        .get("guest");
      request.onsuccess = () => resolve(request.result ?? emptyGuest());
      request.onerror = () => reject(request.error);
    });
  }
  async change<T>(update: (data: GuestData) => T): Promise<T> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("workspace", "readwrite");
      const table = transaction.objectStore("workspace");
      const request = table.get("guest");
      let result: T;
      request.onsuccess = () => {
        try {
          const data: GuestData = request.result ?? emptyGuest();
          result = update(data);
          table.put(data, "guest");
        } catch (error) {
          transaction.abort();
          reject(error);
        }
      };
      transaction.oncomplete = () => resolve(result);
      transaction.onerror = transaction.onabort = () =>
        reject(
          transaction.error ??
            new Error("Could not save on this device. Keep your note open."),
        );
    });
  }
}
