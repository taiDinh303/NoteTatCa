import { createContext, useContext } from "react";
import { api, notes, workspace, offline } from "../../app/runtime";
import type { NotesRepository } from "../../infrastructure/repositories";
import type { ApiClient } from "../../infrastructure/http";
import type { WorkspaceService } from "../../application/workspace";
import type { Note, NoteDraft } from "../../domain/models";
export interface EditorScope {
  hidden?: boolean;
  forgetDraft?: (note: Note | undefined) => void;
  draftFor?: (note: Note) => NoteDraft | undefined;
  rememberDraft?: (note: Note | undefined, draft: NoteDraft) => void;
  api: ApiClient;
  notes: Pick<NotesRepository, "find" | "readyForRemote" | "create" | "patch">;
  workspace: WorkspaceService;
  offline: typeof offline;
}
export const EditorScopeContext = createContext<EditorScope>({
  api,
  notes,
  workspace,
  offline,
});
export const useEditorScope = () => useContext(EditorScopeContext);
