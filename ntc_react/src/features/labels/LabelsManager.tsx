import { t as tr, useLanguage } from "../../shared/i18n";
import { useRef, useState, useSyncExternalStore } from "react";
import { Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { labelMutations } from "../../app/runtime";
import { useLabels } from "../../shared/hooks";
import type { Label } from "../../domain/models";
import { errorMessage } from "../../shared/utils";
import {
  Button,
  EmptyState,
  ErrorBanner,
  ErrorPanel,
  Field,
  IconButton,
  Modal,
  Spinner,
} from "../../shared/ui";
import "./LabelsManager.css";
export default function LabelsManager({ onClose }: { onClose: () => void }) {
  useLanguage();
  const query = useLabels();
  const mutations = useSyncExternalStore(
    labelMutations.subscribe,
    labelMutations.getSnapshot,
  );
  const [editing, setEditing] = useState<Label | null>(null);
  const [deleting, setDeleting] = useState<Label>();
  const [error, setError] = useState<unknown>();
  const [formKey, setFormKey] = useState(0);
  const list = useRef<HTMLDivElement>(null);
  const items = [
    ...mutations.creating,
    ...(query.data?.pages.flatMap((p) => p.items) ?? []),
  ];
  return (
    <Modal
      open
      className="labels-manager"
      onClose={onClose}
      onEscapeKeyDown={(event) => {
        if (deleting) {
          event.preventDefault();
          setDeleting(undefined);
        }
      }}
      title={tr("Your labels")}
    >
      <div className="modal-body">
        <form
          key={formKey}
          className="label-form"
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            setError(undefined);
            const body = {
              name: String(data.get("name")).trim(),
              color: String(data.get("color")),
              icon: null,
            };
            if (!editing) {
              list.current?.scrollTo({ top: 0 });
              setFormKey((k) => k + 1);
              void labelMutations.create(body).catch(() => {});
              return;
            }
            const target = editing;
            setEditing(null);
            setFormKey((k) => k + 1);
            void labelMutations.patch(target, body).catch((failure) => {
              setError(failure);
              toast.error(errorMessage(failure));
            });
          }}
        >
          <Field label={editing ? tr("Edit label") : tr("New label")}>
            <input
              name="name"
              defaultValue={editing?.name ?? ""}
              maxLength={50}
              placeholder={tr("e.g. Ideas, Personal, Work")}
              required
            />
          </Field>
          <label className="color-input" title={tr("Label color")}>
            <span className="sr-only">{tr("Label color")}</span>
            <input
              type="color"
              name="color"
              defaultValue={editing?.color ?? "#8c9d90"}
            />
          </label>
          <Button type="submit">
            {editing ? (
              tr("Save")
            ) : (
              <>
                <Plus size={17} />
                {tr("Add")}
              </>
            )}
          </Button>
          {editing ? (
            <Button
              variant="ghost"
              type="button"
              onClick={() => {
                setEditing(null);
                setFormKey((k) => k + 1);
              }}
            >
              {tr("Cancel")}
            </Button>
          ) : null}
        </form>
        <ErrorBanner error={error} />
        <div className="labels-manager-scroll" ref={list}>
          {query.isPending && items.length === 0 ? (
            <Spinner />
          ) : query.isError && items.length === 0 ? (
            <ErrorPanel
              error={query.error}
              retry={() => void query.refetch()}
            />
          ) : items.length === 0 ? (
            <EmptyState
              icon={Tag}
              title={tr("Everything in its place")}
              description={tr("Create a label to start organizing your notes.")}
            />
          ) : (
            <div className="label-list">
              {items.map((label) => (
                <div
                  className={`label-row ${deleting?.id === label.id ? "label-row-confirming" : ""}`}
                  key={label.id}
                  aria-busy={
                    label.id.startsWith("pending:") ||
                    mutations.updating.includes(label.id)
                  }
                  role={deleting?.id === label.id ? "group" : undefined}
                  aria-label={
                    deleting?.id === label.id
                      ? tr("Delete label {0}", label.name)
                      : undefined
                  }
                >
                  <Tag size={17} style={{ color: label.color ?? undefined }} />
                  {deleting?.id === label.id ? (
                    <>
                      <div className="label-delete-copy">
                        <div className="label-delete-title">
                          <strong>{label.name}</strong>
                          <span>{tr("Delete this label?")}</span>
                        </div>
                        <small id={`label-delete-hint-${label.id}`}>
                          {tr("Remove from notes; Yours note will be kept.")}
                        </small>
                      </div>
                      <div className="label-delete-actions">
                        <Button
                          variant="ghost"
                          autoFocus
                          onClick={() => setDeleting(undefined)}
                        >
                          {tr("Cancel")}
                        </Button>
                        <Button
                          variant="danger"
                          aria-describedby={`label-delete-hint-${label.id}`}
                          onClick={() => {
                            setDeleting(undefined);
                            if (editing?.id === label.id) {
                              setEditing(null);
                              setFormKey((k) => k + 1);
                            }
                            void labelMutations.delete(label).catch(() => {});
                          }}
                        >
                          {tr("Delete label")}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span>{label.name}</span>
                      <IconButton
                        icon={Pencil}
                        disabled={
                          label.id.startsWith("pending:") ||
                          mutations.updating.includes(label.id)
                        }
                        label={tr("Edit label {0}", label.name)}
                        onClick={() => {
                          setDeleting(undefined);
                          setEditing(label);
                          setFormKey((k) => k + 1);
                        }}
                      />
                      <IconButton
                        icon={Trash2}
                        disabled={
                          label.id.startsWith("pending:") ||
                          mutations.updating.includes(label.id)
                        }
                        label={tr("Delete label {0}", label.name)}
                        onClick={() => setDeleting(label)}
                      />
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
          {query.hasNextPage ? (
            <Button
              variant="ghost"
              busy={query.isFetchingNextPage}
              onClick={() => void query.fetchNextPage()}
            >
              {tr("Load more labels")}
            </Button>
          ) : null}
        </div>
      </div>
      <div className="modal-footer">
        <Button variant="secondary" onClick={onClose}>
          {tr("Close")}
        </Button>
      </div>
    </Modal>
  );
}
