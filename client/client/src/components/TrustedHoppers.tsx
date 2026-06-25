import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, UserMinus, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api, buildUrl } from "@shared/routes";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function TrustedHoppers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: followsList = [], isLoading } = useQuery<
    { id: number; userId: number; username: string; isMutual: boolean }[]
  >({
    queryKey: [api.follows.list.path],
    queryFn: async () => {
      const res = await fetch(api.follows.list.path, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const unfollow = useMutation({
    mutationFn: async (userId: number) => {
      const url = buildUrl(api.follows.unfollow.path, { id: userId });
      await apiRequest(api.follows.unfollow.method, url);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.follows.list.path] });
      toast({ title: "Unfollowed", description: "Connection removed." });
    },
  });

  const trustedHoppers = followsList.filter((f) => f.isMutual);
  const following = followsList.filter((f) => !f.isMutual);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="w-5 h-5 text-primary" />
          Trusted Hoppers
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-hoppers-loading">Loading...</p>
        ) : followsList.length === 0 ? (
          <div className="text-center py-6" data-testid="text-hoppers-empty">
            <Users className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No connections yet.</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Complete hops and follow your Hop Buddies to build trust.
            </p>
          </div>
        ) : (
          <div className="space-y-3" data-testid="list-trusted-hoppers">
            {trustedHoppers.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mutual Connections</p>
                {trustedHoppers.map((h) => (
                  <div
                    key={h.id}
                    data-testid={`trusted-hopper-${h.userId}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/10"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold">
                        {h.username[0].toUpperCase()}
                      </div>
                      <div>
                        <span className="text-sm font-medium">{h.username}</span>
                        <Badge variant="secondary" className="ml-2 text-[10px]">Trusted</Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      data-testid={`button-unfollow-${h.userId}`}
                      onClick={() => unfollow.mutate(h.userId)}
                      disabled={unfollow.isPending}
                    >
                      <UserMinus className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {following.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Following</p>
                {following.map((h) => (
                  <div
                    key={h.id}
                    data-testid={`following-${h.userId}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-sm font-bold">
                        {h.username[0].toUpperCase()}
                      </div>
                      <span className="text-sm font-medium">{h.username}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      data-testid={`button-unfollow-${h.userId}`}
                      onClick={() => unfollow.mutate(h.userId)}
                      disabled={unfollow.isPending}
                    >
                      <UserMinus className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
