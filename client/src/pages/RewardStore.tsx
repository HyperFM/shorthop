import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Gift, Coffee, Fuel, Utensils, Wind, Check } from "lucide-react";
import type { Reward } from "@shared/schema";

interface User {
  id: number;
  username: string;
  isDriver: boolean;
  credits: number;
}

const categoryIcons = {
  coffee: Coffee,
  gas: Fuel,
  meal: Utensils,
  carwash: Wind,
};

function useRewards() {
  return useQuery({
    queryKey: [api.rewards.list.path],
    queryFn: async () => {
      const res = await fetch(api.rewards.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch rewards");
      return res.json() as Promise<Reward[]>;
    },
  });
}

function useRedeemReward() {
  return useMutation({
    mutationFn: async (rewardId: number) => {
      const res = await fetch(api.rewards.redeem.path.replace(":id", String(rewardId)), {
        method: api.rewards.redeem.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to redeem reward");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.rewards.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.auth.me.path] });
    },
  });
}

export default function RewardStore({ user }: { user: User }) {
  const { data: rewards, isLoading } = useRewards();
  const redeem = useRedeemReward();
  const [redeemCode, setRedeemCode] = useState<string | null>(null);

  const canRedeem = (wheelsCost: number) => user.credits >= wheelsCost;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
          <Gift className="w-8 h-8 text-secondary" />
          Reward Store
        </h1>
        <p className="text-muted-foreground mt-1">Redeem your Wheels for amazing rewards.</p>
      </div>

      <Card className="bg-gradient-to-r from-secondary/10 to-transparent border-secondary/20">
        <CardContent className="p-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Available Wheels</p>
            <p className="text-4xl font-bold text-foreground">{user.credits || 0}</p>
          </div>
          <div className="text-right text-sm text-muted-foreground max-w-md">
            <p>Earn more wheels by completing Short Hops and Flex Hops as a driver.</p>
          </div>
        </CardContent>
      </Card>

      {redeemCode && (
        <Card className="border-green-500/50 bg-green-500/5">
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center gap-3">
              <Check className="w-6 h-6 text-green-600" />
              <div>
                <p className="font-bold text-foreground">Reward Redeemed!</p>
                <p className="text-sm text-muted-foreground">Your reward code is ready to use.</p>
              </div>
            </div>
            <div className="bg-foreground/10 p-4 rounded-lg font-mono text-lg font-bold text-foreground text-center">
              {redeemCode}
            </div>
            <p className="text-xs text-muted-foreground">Show this code at participating locations.</p>
            <Button variant="outline" size="sm" onClick={() => setRedeemCode(null)}>
              Close
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">Loading rewards...</div>
        ) : !rewards || rewards.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">No rewards available.</div>
        ) : (
          rewards.map((reward) => {
            const Icon = categoryIcons[reward.category as keyof typeof categoryIcons] || Gift;
            return (
              <Card key={reward.id} className="hover:shadow-md transition-shadow flex flex-col">
                <CardHeader className="pb-3">
                  <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center text-secondary mb-3">
                    <Icon className="w-5 h-5" />
                  </div>
                  <CardTitle className="text-lg">{reward.name}</CardTitle>
                  <CardDescription className="text-xs">{reward.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-secondary">{reward.wheelsCost}</span>
                      <span className="text-sm text-muted-foreground">Wheels</span>
                    </div>
                  </div>

                  <Dialog open={redeem.isPending} onOpenChange={() => {}}>
                    <Button
                      onClick={() => redeem.mutate(reward.id, {
                        onSuccess: (data) => {
                          setRedeemCode(data.code);
                        },
                      })}
                      disabled={!canRedeem(reward.wheelsCost) || redeem.isPending}
                      className="w-full"
                    >
                      {canRedeem(reward.wheelsCost) ? "Redeem Now" : "Not Enough Wheels"}
                    </Button>
                  </Dialog>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
