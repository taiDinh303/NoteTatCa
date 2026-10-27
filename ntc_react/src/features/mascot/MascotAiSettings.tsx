import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../../app/runtime";
import { ApiError } from "../../infrastructure/http";
import { t as tr, useLanguage } from "../../shared/i18n";
import { Button } from "../../shared/ui";
import { errorMessage } from "../../shared/utils";
import { MascotPage } from "./MascotPage";
import { alignMascotAtlases, prepareMascotReference } from "./mascotAtlas";
import {
  removeGeneratedMascot,
  saveGeneratedMascot,
  useAccountMascot,
} from "./generatedMascot";
import { setMascotPreference, useMascotPreference } from "./mascotPreference";

interface Job {
  id: string;
  state: "queued" | "running" | "ready" | "applied" | "failed" | "expired";
}
interface Status {
  available: boolean;
  canCreate: boolean;
  canEdit: boolean;
  dailyLimit: number;
  resetsAt: string;
  latest: Job | null;
  slot: Job | null;
}
interface Result {
  directionsPngBase64: string;
  reactionsPngBase64: string;
}
export function MascotAiSettings({ owner }: { owner: string }) {
  useLanguage();
  const client = useQueryClient();
  const { character } = useMascotPreference();
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState<string>();
  const [preparingReference, setPreparingReference] = useState(false);
  const [consent, setConsent] = useState(false);
  const [previewId, setPreviewId] = useState<string>();
  const [editId, setEditId] = useState<string>();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const statusKey = ["mascot-ai", owner];
  const status = useQuery({
    queryKey: statusKey,
    queryFn: async ({ signal }) => {
      try {
        return await api.request<Status>("/mascot-ai/status", { signal });
      } catch (error) {
        if (error instanceof ApiError && error.status === 404)
          return {
            available: false,
            canCreate: false,
            canEdit: false,
            dailyLimit: 1,
            resetsAt: "",
            latest: null,
            slot: null,
          } satisfies Status;
        throw error;
      }
    },
    staleTime: 0,
    retry: false,
    refetchInterval: (query) =>
      ["queued", "running"].includes(query.state.data?.latest?.state ?? "")
        ? 3000
        : 60_000,
  });
  const latest = status.data?.latest,
    slot = status.data?.slot;
  const { images: saved } = useAccountMascot(owner, slot?.state === "applied");
  const editing = !!slot && editId === slot.id;
  const inProgress = latest?.state === "queued" || latest?.state === "running";
  const preview = useQuery({
    queryKey: ["mascot-ai-preview", owner, previewId],
    queryFn: async ({ signal }) => {
      const result = await api.request<Result>(
        `/mascot-ai/generations/${previewId}/result`,
        { signal },
      );
      return alignMascotAtlases(
        result.directionsPngBase64,
        result.reactionsPngBase64,
      );
    },
    enabled:
      !!previewId && latest?.id === previewId && latest.state === "ready",
    retry: false,
    staleTime: Infinity,
    gcTime: 0,
  });
  const create = useMutation({
    mutationFn: () =>
      api.request<Job>("/mascot-ai/generations", {
        method: "POST",
        body: {
          requestId: crypto.randomUUID(),
          description,
          referencePngBase64: reference,
          consentToSendToOpenAi: consent,
          replacesId: editing ? slot?.id : undefined,
        },
      }),
    onSuccess: (job) => {
      client.setQueryData<Status>(statusKey, (current) =>
        current
          ? {
              ...current,
              latest: job,
              slot: current.slot ?? job,
              canCreate: false,
              canEdit: false,
            }
          : current,
      );
      setEditId(undefined);
      setPreviewId(undefined);
      void status.refetch();
    },
    onError: (error) => {
      toast.error(errorMessage(error));
      void status.refetch();
    },
    retry: false,
  });
  const apply = useMutation({
    mutationFn: async () => {
      if (!preview.data || !previewId)
        throw new Error("The mascot is not ready for preview.");
      const images = { ...preview.data, id: previewId };
      await api.request(`/mascot-ai/generations/${previewId}/apply`, {
        method: "POST",
        body: {
          directionsWebpBase64: images.directions.split(",")[1],
          reactionsWebpBase64: images.reactions.split(",")[1],
        },
      });
      return images;
    },
    onSuccess: (images) => {
      client.setQueryData(["mascot-slot", owner], images);
      try {
        saveGeneratedMascot(owner, images);
      } catch {
        setMascotPreference({ enabled: true, character: "generated" });
      }
      setPreviewId(undefined);
      void status.refetch();
      toast.success(tr("Mascot applied"));
    },
    onError: (error) => {
      toast.error(errorMessage(error));
      void status.refetch();
    },
    retry: false,
  });
  const remove = useMutation({
    mutationFn: () =>
      api.request(`/mascot-ai/slot/${slot?.id}`, { method: "DELETE" }),
    onSuccess: () => {
      try {
        removeGeneratedMascot(owner);
      } catch {
        /* Server deletion is authoritative. */
      }
      client.setQueryData(["mascot-slot", owner], null);
      if (character === "generated" || character === "custom")
        setMascotPreference({ character: "bunny" });
      setEditId(undefined);
      setPreviewId(undefined);
      setConfirmDelete(false);
      void status.refetch();
    },
    onError: (error) => {
      toast.error(errorMessage(error));
      void status.refetch();
    },
    retry: false,
  });
  const maySubmit = editing ? status.data?.canEdit : status.data?.canCreate;
  const blocked =
    !status.data?.available ||
    !maySubmit ||
    create.isPending ||
    preparingReference ||
    inProgress;
  return (
    <section
      className="mascot-ai-settings"
      aria-label={tr("Create a mascot with AI")}
    >
      <h2>{tr("Your custom mascot")}</h2>
      <p className="field-hint">
        {tr(
          "One free custom mascot per account. Edit it or delete it before creating a new one.",
        )}
      </p>
      <p className="field-hint">
        {tr(
          "Describe a character or choose a reference photo. OpenAI creates the matching head directions and expressions; you preview before applying.",
        )}
      </p>
      {slot ? (
        <div className="mascot-ai-owned">
          {slot.state === "applied" ? (
            <label className="mascot-choice mascot-owned-choice">
              <input
                type="radio"
                name="mascot-character"
                checked={character === "generated"}
                onChange={() => setMascotPreference({ character: "generated" })}
              />
              {saved ? (
                <span
                  className="mascot-choice-image"
                  aria-hidden
                  style={{
                    backgroundImage: `url(${saved.directions})`,
                    backgroundSize: "300% 300%",
                    backgroundPosition: "50% 50%",
                  }}
                />
              ) : null}
              <span>{tr("Your custom mascot")}</span>
            </label>
          ) : (
            <p>{tr("Your custom mascot is being prepared.")}</p>
          )}
          <div className="mascot-owned-actions">
            <Button
              variant="secondary"
              disabled={!status.data?.canEdit || inProgress || remove.isPending}
              onClick={() => {
                setEditId(slot.id);
                setDescription("");
                setReference(undefined);
                setConsent(false);
              }}
            >
              {tr("Edit mascot")}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setConfirmDelete(true)}
              disabled={remove.isPending}
            >
              {tr("Delete mascot")}
            </Button>
          </div>
          {confirmDelete ? (
            <div className="mascot-delete-confirm">
              <p>
                {tr(
                  "Delete your custom mascot? Your daily AI limit will not reset.",
                )}
              </p>
              <Button
                variant="danger"
                busy={remove.isPending}
                onClick={() => remove.mutate()}
              >
                {tr("Confirm deletion")}
              </Button>
              <Button
                variant="ghost"
                disabled={remove.isPending}
                onClick={() => setConfirmDelete(false)}
              >
                {tr("Cancel")}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
      {status.isPending ? (
        <p role="status">{tr("Checking AI availability…")}</p>
      ) : null}
      {status.isError ? (
        <div role="alert">
          <p>{errorMessage(status.error)}</p>
          <Button variant="secondary" onClick={() => void status.refetch()}>
            {tr("Retry")}
          </Button>
        </div>
      ) : null}
      {status.data && !status.data.available ? (
        <p role="status">
          {tr(
            "AI creation is not enabled yet. You can still choose a ready-made mascot.",
          )}
        </p>
      ) : null}
      {status.data?.available ? (
        <p className="field-hint">
          {tr(
            "One creation per day. A started attempt uses the daily limit, even if generation fails. Resets at {0}.",
            new Date(status.data.resetsAt).toLocaleString(
              document.documentElement.lang,
            ),
          )}
        </p>
      ) : null}
      {!slot || editing ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!blocked && consent && (description.trim() || reference))
              create.mutate();
          }}
        >
          <label className="field">
            <span>
              {tr(editing ? "Describe your changes" : "Describe your mascot")}
            </span>
            <textarea
              maxLength={1000}
              rows={3}
              value={description}
              disabled={create.isPending || inProgress}
              placeholder={tr(
                "For example: a small orange fox wearing round glasses",
              )}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          <label className="field">
            <span>{tr("Reference photo (optional)")}</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={create.isPending || inProgress || preparingReference}
              onChange={async (event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = "";
                if (!file) return;
                setPreparingReference(true);
                try {
                  setReference(await prepareMascotReference(file));
                } catch (error) {
                  toast.error(errorMessage(error));
                } finally {
                  setPreparingReference(false);
                }
              }}
            />
          </label>
          {reference ? (
            <div className="mascot-reference">
              <img
                src={`data:image/png;base64,${reference}`}
                alt={tr("Reference photo")}
                width={80}
                height={80}
              />
              <Button
                variant="ghost"
                onClick={() => setReference(undefined)}
                disabled={create.isPending || inProgress}
              >
                {tr("Remove reference photo")}
              </Button>
            </div>
          ) : null}
          {editing ? (
            <p className="field-hint">
              {tr(
                "Your current mascot stays until you apply the edited preview. Without a new photo, its current artwork is used as the reference.",
              )}
            </p>
          ) : null}
          <label className="check-label">
            <input
              type="checkbox"
              checked={consent}
              disabled={create.isPending || inProgress}
              onChange={(event) => setConsent(event.target.checked)}
            />
            {tr(
              "Send this description and selected photo to OpenAI to create my mascot. My notes are not included.",
            )}
          </label>
          <div className="mascot-owned-actions">
            <Button
              type="submit"
              busy={create.isPending}
              disabled={
                blocked || !consent || (!description.trim() && !reference)
              }
            >
              {tr(editing ? "Generate changes" : "Generate mascot")}
            </Button>
            {editing ? (
              <Button
                variant="ghost"
                onClick={() => setEditId(undefined)}
                disabled={create.isPending}
              >
                {tr("Cancel")}
              </Button>
            ) : null}
          </div>
        </form>
      ) : null}
      {inProgress ? (
        <p role="status">
          {tr(
            "Creating your mascot in the background. You can leave this page and return later.",
          )}
        </p>
      ) : null}
      {latest?.state === "failed" ? (
        <p role="alert">
          {tr(
            "This creation did not finish. Your current mascot is unchanged. Please try after the next daily reset.",
          )}
        </p>
      ) : null}
      {latest?.state === "ready" ? (
        <div className="mascot-ai-result">
          <p className="field-hint">
            {tr(
              "Unapplied previews are available for 7 days. Your applied custom mascot is kept until you edit or delete it.",
            )}
          </p>
          <Button
            variant="secondary"
            busy={preview.isFetching}
            onClick={() => {
              setPreviewId(latest.id);
              if (previewId === latest.id) void preview.refetch();
            }}
          >
            {tr("Preview AI mascot")}
          </Button>
          {preview.isError ? (
            <p role="alert">{errorMessage(preview.error)}</p>
          ) : null}
          {preview.data && previewId === latest.id ? (
            <div className="mascot-ai-preview">
              <MascotPage
                directions={preview.data.directions}
                reactions={preview.data.reactions}
                size={120}
                disableSquash
              />
              <p className="field-hint">
                {tr(
                  "Move your pointer to check the head movement, then apply if you like it.",
                )}
              </p>
              <Button
                busy={apply.isPending}
                disabled={remove.isPending}
                onClick={() => apply.mutate()}
              >
                {tr("Apply mascot")}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
