import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type CreateRouteRequest, type UpdateRouteRequest } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useRoutes() {
  return useQuery({
    queryKey: [api.routes.list.path],
    queryFn: async () => {
      const res = await fetch(api.routes.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch routes");
      return api.routes.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateRoute() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateRouteRequest) => {
      const res = await fetch(api.routes.create.path, {
        method: api.routes.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create route");
      return api.routes.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.routes.list.path] });
      toast({ title: "Route added successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to add route", description: err.message, variant: "destructive" });
    },
  });
}

export function useUpdateRoute() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & UpdateRouteRequest) => {
      const url = buildUrl(api.routes.update.path, { id });
      const res = await fetch(url, {
        method: api.routes.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update route");
      return api.routes.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.routes.list.path] });
      toast({ title: "Route updated" });
    },
  });
}

export function useDeleteRoute() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.routes.delete.path, { id });
      const res = await fetch(url, {
        method: api.routes.delete.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete route");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.routes.list.path] });
      toast({ title: "Route removed" });
    },
  });
}
