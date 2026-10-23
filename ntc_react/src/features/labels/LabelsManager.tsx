import { t as tr, useLanguage } from "../../shared/i18n";
import { useState } from "react";
import { Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { labels, cache, workspace } from "../../app/runtime";
import { useLabels } from "../../shared/hooks";
import type { Label } from "../../domain/models";
import {
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorBanner,
  ErrorPanel,
  Field,
  IconButton,
  Modal,
  Spinner,
} from "../../shared/ui";
export default function LabelsManager({ onClose }: { onClose: () => void }) {
  useLanguage();
  const query = useLabels();
  const [editing, setEditing] = useState<Label | null>(null);
  const [deleting, setDeleting] = useState<Label>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [formKey, setFormKey] = useState(0);
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  async function refresh() {
    await cache.invalidateQueries({ queryKey: workspace.key("labels") });
    await cache.invalidateQueries({ queryKey: workspace.key("notes") });
  }
  return (
    <Modal
      open
      onClose={onClose}
      title={tr("Your labels")}
      description={tr(
        "A little order for your ideas. Names can repeat; each label stays separate.",
      )}
    >
      <div className="modal-body">
        <form
          key={formKey}
          className="label-form"
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            setBusy(true);
            setError(undefined);
            const body = {
              name: String(data.get("name")).trim(),
              color: String(data.get("color")),
              icon: null,
            };
            void (editing ? labels.patch(editing, body) : labels.create(body))
              .then(async () => {
                setEditing(null);
                setFormKey((k) => k + 1);
                await refresh();
              })
              .catch(setError)
              .finally(() => setBusy(false));
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
          <Button busy={busy} type="submit">
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
        {query.isPending ? (
          <Spinner />
        ) : query.isError ? (
          <ErrorPanel error={query.error} retry={() => void query.refetch()} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Tag}
            title={tr("Everything in its place")}
            description={tr("Create a label to start organizing your notes.")}
          />
        ) : (
          <div className="label-list">
            {items.map((label) => (
              <div className="label-row" key={label.id}>
                <Tag size={17} style={{ color: label.color ?? undefined }} />
                <span>{label.name}</span>
                <IconButton
                  icon={Pencil}
                  label={tr("Edit label {0}", label.name)}
                  onClick={() => {
                    setEditing(label);
                    setFormKey((k) => k + 1);
                  }}
                />
                <IconButton
                  icon={Trash2}
                  label={tr("Delete label {0}", label.name)}
                  onClick={() => setDeleting(label)}
                />
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
      <div className="modal-footer">
        <Button variant="secondary" onClick={onClose}>
          {tr("Done")}
        </Button>
      </div>
      {deleting ? (
        <ConfirmDialog
          title={tr("Delete this label?")}
          description={tr(
            "“{0}” will be removed from all notes. Your notes will be kept.",
            deleting.name,
          )}
          confirmLabel={tr("Delete label")}
          danger
          onClose={() => setDeleting(undefined)}
          onConfirm={async () => {
            await labels.delete(deleting.id);
            await refresh();
            if (editing?.id === deleting.id) {
              setEditing(null);
              setFormKey((k) => k + 1);
            }
          }}
        />
      ) : null}
    </Modal>
  );
}
