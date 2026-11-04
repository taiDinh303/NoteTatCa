type RichEditorModule = typeof import("./RichEditor");
let loading: Promise<RichEditorModule> | undefined;
let loaded: RichEditorModule | undefined;
export const loadedRichEditor = () => loaded?.default;
export function loadRichEditor() {
  return (loading ??= import("./RichEditor")
    .then((module) => {
      loaded = module;
      return module;
    })
    .catch((error: unknown) => {
      loading = undefined;
      throw error;
    }));
}
export function warmRichEditor() {
  void loadRichEditor().catch(() => {});
}
