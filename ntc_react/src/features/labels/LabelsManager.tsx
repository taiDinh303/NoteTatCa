import { useState } from "react";
import { Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
      title="Your labels"
      description="A little order for your ideas. Names can repeat; each label stays separate."
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
                toast.success(editing ? "Label updated" : "Label created");
                setEditing(null);
                setFormKey((k) => k + 1);
                await refresh();
              })
              .catch(setError)
              .finally(() => setBusy(false));
          }}
        >
          <Field label={editing ? "Edit label" : "New label"}>
            <input
              name="name"
              defaultValue={editing?.name ?? ""}
              maxLength={50}
              placeholder="e.g. Ideas, Personal, Work"
              required
            />
          </Field>
          <label className="color-input" title="Label color">
            <span className="sr-only">Label color</span>
            <input
              type="color"
              name="color"
              defaultValue={editing?.color ?? "#8c9d90"}
            />
          </label>
          <Button busy={busy} type="submit">
            {editing ? (
              "Save"
            ) : (
              <>
                <Plus size={17} />
                Add
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
              Cancel
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
            title="Everything in its place"
            description="Create a label to start organizing your notes."
          />
        ) : (
          <div className="label-list">
            {items.map((label) => (
              <div className="label-row" key={label.id}>
                <Tag size={17} style={{ color: label.color ?? undefined }} />
                <span>{label.name}</span>
                <IconButton
                  icon={Pencil}
                  label={`Edit label ${label.name}`}
                  onClick={() => {
                    setEditing(label);
                    setFormKey((k) => k + 1);
                  }}
                />
                <IconButton
                  icon={Trash2}
                  label={`Delete label ${label.name}`}
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
            Load more labels
          </Button>
        ) : null}
      </div>
      <div className="modal-footer">
        <Button variant="secondary" onClick={onClose}>
          Done
        </Button>
      </div>
      {deleting ? (
        <ConfirmDialog
          title="Delete this label?"
          description={`“${deleting.name}” will be removed from all notes. Your notes will be kept.`}
          confirmLabel="Delete label"
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
