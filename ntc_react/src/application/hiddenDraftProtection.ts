/** Only pending IDs are tracked here; hidden note content stays in the vault's volatile memory. */
class HiddenDraftProtection {
  private pending = new Map<string, Set<string>>();
  set(owner: string, id: string, value: boolean) {
    const ids = this.pending.get(owner) ?? new Set<string>();
    if (value) ids.add(id);
    else ids.delete(id);
    if (ids.size) this.pending.set(owner, ids);
    else this.pending.delete(owner);
  }
  has(owner: string) {
    return !!this.pending.get(owner)?.size;
  }
  clear(owner: string) {
    this.pending.delete(owner);
  }
  any() {
    return this.pending.size > 0;
  }
}
export const hiddenDraftProtection = new HiddenDraftProtection();
if (typeof window !== "undefined")
  window.addEventListener("beforeunload", (event) => {
    if (hiddenDraftProtection.any()) {
      event.preventDefault();
      event.returnValue = "";
    }
  });
