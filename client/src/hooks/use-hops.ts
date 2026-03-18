import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type RequestHopRequest, type CompleteHopRequest } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { showFlash } from "@/components/FlashNotification";

export function useHops() {
  return useQuery({
    queryKey: [api.hops.list.path],
    queryFn: async () => {
      const res = await fetch(api.hops.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch hops");
      return api.hops.list.responses[200].parse(await res.json());
    },
  });
}

export function useRequestHop() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { startLocation: string; endLocation: string; hopType: "walk" | "short_hop" | "flex_hop" | "full_ride"; microHop?: boolean }) => {
      const res = await fetch(api.hops.requestMovement.path, {
        method: api.hops.requestMovement.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to request hop");
      return api.hops.requestMovement.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.hops.list.path] });
      toast({ title: "Hop requested! We're looking for a match." });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to request hop", description: err.message, variant: "destructive" });
    },
  });
}

export function useAcceptHop() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.hops.accept.path, { id });
      const res = await fetch(url, {
        method: api.hops.accept.method,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to accept hop");
      }
      return api.hops.accept.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.hops.list.path] });
      toast({ title: "Hop accepted! Thanks for assisting." });
    },
  });
}

export function useCancelHop() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/hops/${id}/cancel`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to cancel hop");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.hops.list.path] });
      showFlash("🔄", "Hop cancelled", "info");
    },
    onError: () => {
      showFlash("❌", "Failed to cancel", "error");
    },
  });
}

export function useCompleteHop() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: CompleteHopRequest }) => {
      const url = buildUrl(api.hops.complete.path, { id });
      const res = await fetch(url, {
        method: api.hops.complete.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to complete hop");
      return api.hops.complete.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.hops.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.auth.me.path] }); // To refresh credits
      toast({ title: "Hop completed! Credits added." });
    },
  });
}
