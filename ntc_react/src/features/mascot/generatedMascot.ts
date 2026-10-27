import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { MascotAtlasPair } from "./mascotAtlas";
import { setMascotPreference } from "./mascotPreference";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../app/runtime";
import { ApiError } from "../../infrastructure/http";
export interface AccountMascot extends MascotAtlasPair {
  id: string;
}
const eventName = "ntc:generated-mascot";
const key = (owner: string) => `ntc.mascot.generated.v1.${owner}`;
function subscribe(listener: () => void) {
  window.addEventListener(eventName, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(eventName, listener);
    window.removeEventListener("storage", listener);
  };
}
export function saveGeneratedMascot(
  owner: string,
  images: MascotAtlasPair & { id?: string },
) {
  const raw = JSON.stringify(images);
  if (raw.length > 1_200_000)
    throw new Error(
      "The generated mascot is too large to save on this browser.",
    );
  localStorage.setItem(key(owner), raw);
  setMascotPreference({ enabled: true, character: "generated" });
  window.dispatchEvent(new Event(eventName));
}
export function useAccountMascot(owner?: string, enabled = true) {
  const local = useGeneratedMascot(owner);
  const query = useQuery({
    queryKey: ["mascot-slot", owner],
    queryFn: async ({ signal }) => {
      try {
        const result = await api.request<{
          id: string;
          directionsWebpBase64: string;
          reactionsWebpBase64: string;
        }>("/mascot-ai/slot/result", { signal });
        return {
          id: result.id,
          directions: `data:image/webp;base64,${result.directionsWebpBase64}`,
          reactions: `data:image/webp;base64,${result.reactionsWebpBase64}`,
        } satisfies AccountMascot;
      } catch (error) {
        if (
          error instanceof ApiError &&
          (error.status === 404 || error.status === 409)
        )
          return null;
        throw error;
      }
    },
    enabled: !!owner && enabled,
    retry: false,
    staleTime: 60_000,
  });
  return { images: query.data === null ? null : (query.data ?? local), query };
}
export function removeGeneratedMascot(owner: string) {
  localStorage.removeItem(key(owner));
  window.dispatchEvent(new Event(eventName));
}
export function useGeneratedMascot(owner?: string) {
  const read = useCallback(() => {
    try {
      return owner ? localStorage.getItem(key(owner)) : null;
    } catch {
      return null;
    }
  }, [owner]);
  const raw = useSyncExternalStore(subscribe, read);
  return useMemo(() => {
    if (!raw) return null;
    try {
      const value = JSON.parse(raw) as MascotAtlasPair;
      return [value.directions, value.reactions].every(
        (image) =>
          typeof image === "string" &&
          /^data:image\/(webp|png);base64,/.test(image),
      )
        ? value
        : null;
    } catch {
      return null;
    }
  }, [raw]);
}
