import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { api } from "@shared/routes";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Gift, Coffee, Fuel, CreditCard, Check, Sparkles, Loader2 } from "lucide-react";
import { showFlash } from "@/components/FlashNotification";
import type { Reward } from "@shared/schema";

const categoryIcons: Record<string, typeof Coffee> = {
  coffee: Coffee,
  gas: Fuel,
  meal: CreditCard,
  carwash: Gift,
  giftcard: CreditCard,
};

const categoryColors: Record<string, { bg: string; text: string; glow: string }> = {
  coffee: { bg: "from-amber-500 to-orange-600", text: "text-amber-600", glow: "shadow-amber-500/30" },
  gas: { bg: "from-blue-500 to-blue-700", text: "text-blue-600", glow: "shadow-blue-500/30" },
  meal: { bg: "from-green-500 to-emerald-600", text: "text-green-600", glow: "shadow-green-500/30" },
  carwash: { bg: "from-purple-500 to-violet-600", text: "text-purple-600", glow: "shadow-purple-500/30" },
  giftcard: { bg: "from-pink-500 to-rose-600", text: "text-pink-600", glow: "shadow-pink-500/30" },
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

export default function RewardStore() {
  const { data: user, isLoading: authLoading } = useAuth();
  const { data: rewards, isLoading } = useRewards();
  const redeem = useRedeemReward();
  const [redeemCode, setRedeemCode] = useState<string | null>(null);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const canRedeem = (wheelsCost: number) => user.credits >= wheelsCost;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, type: "spring", stiffness: 120 }}
      className="px-4 pt-4 pb-24 max-w-lg mx-auto"
    >
      <div className="flex items-center gap-2 mb-6">
        <Gift className="w-5 h-5 text-secondary" />
        <h1 className="text-xl font-display font-bold text-foreground" data-testid="text-rewards-title">
          Rewards
        </h1>
      </div>

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 150 }}
        className="mb-6"
      >
        <Card className="border-2 border-secondary/30 bg-gradient-to-br from-secondary/10 via-orange-500/5 to-transparent overflow-hidden relative" data-testid="card-wheels-balance">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-secondary/5 -translate-y-8 translate-x-8" />
          <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-orange-500/5 translate-y-6 -translate-x-6" />
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-center mb-3">
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="w-20 h-20 rounded-full bg-gradient-to-br from-secondary to-orange-600 flex items-center justify-center shadow-xl shadow-secondary/40"
              >
                <span className="text-4xl">🛞</span>
              </motion.div>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1">Wheels Balance</p>
              <motion.p
                key={user.credits}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                className="text-5xl font-black text-foreground leading-none"
                data-testid="text-wheels-balance"
              >
                {user.credits || 0}
              </motion.p>
              <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed max-w-[240px] mx-auto">
                1 Wheel = $1 in reward value
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gradient-to-r from-primary/5 to-green-500/5 border border-primary/20 rounded-xl px-4 py-3 mb-6"
        data-testid="card-philosophy"
      >
        <p className="text-xs text-foreground font-medium leading-relaxed">
          "You're already heading that way. Helping someone along your route earns Wheels you can redeem for rewards."
        </p>
        <p className="text-[10px] text-muted-foreground mt-1">
          ShortHop is not gig work — it's community movement.
        </p>
      </motion.div>

      {redeemCode && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="border-green-400 bg-green-50 dark:bg-green-950/20 mb-6" data-testid="card-redeem-code">
            <CardContent className="p-5 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center mx-auto">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="font-bold text-foreground text-sm">Reward Redeemed!</p>
                <p className="text-[10px] text-muted-foreground">Your reward code is ready to use</p>
              </div>
              <div className="bg-background/80 p-4 rounded-xl font-mono text-lg font-black text-foreground tracking-wider border border-border">
                {redeemCode}
              </div>
              <p className="text-[10px] text-muted-foreground">Show this code at participating locations.</p>
              <Button variant="outline" size="sm" onClick={() => setRedeemCode(null)} className="rounded-full" data-testid="button-close-redeem">
                Done
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="mb-3">
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2" data-testid="text-rewards-heading">
          <Sparkles className="w-3.5 h-3.5" />
          Rewards
        </h2>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-12">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-8 h-8 border-2 border-secondary border-t-transparent rounded-full mx-auto"
            />
          </div>
        ) : !rewards || rewards.length === 0 ? (
          <div className="text-center py-10 space-y-3">
            <motion.span
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-4xl block"
            >
              🎁
            </motion.span>
            <p className="text-sm text-muted-foreground font-medium">No rewards available yet</p>
            <p className="text-xs text-muted-foreground">Check back soon for Starbucks, gas, and cash gift cards!</p>
          </div>
        ) : (
          rewards.map((reward, i) => {
            const Icon = categoryIcons[reward.category] || Gift;
            const colors = categoryColors[reward.category] || categoryColors.giftcard;
            return (
              <motion.div
                key={reward.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="border-border/50 hover:border-border transition-colors" data-testid={`reward-${reward.id}`}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${colors.bg} flex items-center justify-center text-white shadow-lg ${colors.glow} shrink-0`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{reward.name}</p>
                      <p className="text-[10px] text-muted-foreground line-clamp-1">{reward.description}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-xs font-black text-secondary">{reward.wheelsCost}</span>
                        <span className="text-[10px] text-muted-foreground">Wheels</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className={`h-8 px-4 rounded-full text-xs font-bold shrink-0 ${
                        canRedeem(reward.wheelsCost)
                          ? "bg-secondary hover:bg-secondary/90 text-white"
                          : ""
                      }`}
                      variant={canRedeem(reward.wheelsCost) ? "default" : "outline"}
                      onClick={() => redeem.mutate(reward.id, {
                        onSuccess: (data) => {
                          setRedeemCode(data.code);
                          showFlash("🎉", "Reward redeemed!", "success");
                        },
                      })}
                      disabled={!canRedeem(reward.wheelsCost) || redeem.isPending}
                      data-testid={`button-redeem-${reward.id}`}
                    >
                      {canRedeem(reward.wheelsCost) ? "Redeem" : "Need More"}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-8 text-center space-y-2"
      >
        <div className="flex items-center justify-center gap-3 text-muted-foreground">
          <div className="h-px w-8 bg-border" />
          <Sparkles className="w-3 h-3" />
          <div className="h-px w-8 bg-border" />
        </div>
        <p className="text-xs text-muted-foreground font-medium" data-testid="text-more-rewards">
          More rewards coming soon.
        </p>
        <p className="text-[10px] text-muted-foreground leading-relaxed max-w-[280px] mx-auto">
          Local business discounts, free rides, community perks, and event invitations.
        </p>
      </motion.div>
    </motion.div>
  );
}
