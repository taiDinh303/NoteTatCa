import { useSyncExternalStore, useState, useEffect } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { auth, workspace, notes, labels, account, cache } from "../app/runtime";
import type { NoteFilter } from "../domain/models";
export const useAuth = () =>
  useSyncExternalStore(auth.subscribe, auth.getSnapshot);
export function useDebounced<T>(value: T, delay = 250) {
  const [result, setResult] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setResult(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return result;
}
export function useNotes(filter: NoteFilter) {
  const state = useAuth();
  return useInfiniteQuery({
    networkMode: "always",
    queryKey: workspace.key("notes", filter),
    queryFn: ({ pageParam, signal }) => notes.list(filter, pageParam, signal),
    initialData: () => workspace.cachedNotes(filter),
    initialDataUpdatedAt: () =>
      cache.getQueryState(
        workspace.key("notes", filter.trash ? { trash: true } : {}),
      )?.dataUpdatedAt,
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.hasNextPage ? last.currentPage + 1 : undefined,
    enabled: state.status === "authenticated" || state.status === "offline",
  });
}
export function useLabels() {
  const state = useAuth();
  return useInfiniteQuery({
    networkMode: "always",
    queryKey: workspace.key("labels"),
    queryFn: ({ pageParam, signal }) => labels.list(pageParam, signal),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.hasNextPage ? last.currentPage + 1 : undefined,
    enabled: state.status === "authenticated" || state.status === "offline",
    staleTime: 120_000,
  });
}
export function useMe() {
  const state = useAuth();
  return useQuery({
    queryKey: workspace.key("me"),
    queryFn: () => account.me(),
    enabled: state.status === "authenticated",
  });
}
