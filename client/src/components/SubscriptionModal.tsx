import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { api } from "@shared/routes";
import { Check, Sparkles, CarFront, Crown, X } from "lucide-react";
import type { User } from "@shared/routes";

interface SubscriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: "flex_hop" | "power_hop";
  user: User;
  onSubscribed?: () => void;
}

const PLAN_DETAILS = {
  flex_hop: {
    name: "Flex Hop",
    price: "$5",
    period: "/month",
    icon: CarFront,
    color: "from-blue-500 to-green-500",
    shadowColor: "shadow-blue-500/25",
    perRide: "$2–5 per ride",
    features: [
      "Allows small driver detours to pick you up",
      "Dynamic pricing based on detour distance",
      "Priority matching with nearby drivers",
      "Flex Hop badge on your profile",
    ],
  },
  power_hop: {
    name: "Power Hop",
    price: "$15",
    period: "/month",
    icon: Crown,
    color: "from-orange-500 to-green-500",
    shadowColor: "shadow-orange-500/25",
    perRide: "Unlimited rides included",
    features: [
      "Complete mobility freedom — anywhere to anywhere",
      "No per-ride charges",
      "Top priority driver matching",
      "Power Hop badge and premium status",
      "Access to all Flex Hop features",
    ],
  },
};

export function SubscriptionModal({ open, onOpenChange, plan, user, onSubscribed }: SubscriptionModalProps) {
  const queryClient = useQueryClient();
  const details = PLAN_DETAILS[plan];
  const IconComponent = details.icon;

  const subscribe = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(api.subscription.subscribe.method, api.subscription.subscribe.path, { plan });
      return res.json();
    },
    onSuccess: (data: any) => {
      if (data.checkoutRequired && data.url) {
        window.location.href = data.url;
      } else {
        queryClient.invalidateQueries({ queryKey: [api.auth.me.path] });
        onOpenChange(false);
        onSubscribed?.();
      }
    },
  });

  const currentPlan = user.subscription;
  const isCurrentPlan = currentPlan === plan;
  const isUpgrade = plan === "power_hop" && currentPlan === "flex_hop";
  const isDowngrade = plan === "flex_hop" && currentPlan === "power_hop";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className={`bg-gradient-to-br ${plan === "power_hop" ? "from-orange-500/10 via-green-500/5 to-transparent" : "from-blue-500/10 via-green-500/5 to-transparent"} p-6 pb-0`}>
          <DialogHeader className="pb-4">
            <div className="flex items-center justify-center mb-4">
              <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${details.color} flex items-center justify-center text-white shadow-xl ${details.shadowColor}`}>
                <IconComponent className="w-8 h-8" />
              </div>
            </div>
            <DialogTitle className="text-center text-2xl font-bold" data-testid="text-subscription-title">
              {details.name}
            </DialogTitle>
            <div className="text-center mt-2">
              <span className="text-4xl font-black text-foreground" data-testid="text-subscription-price">{details.price}</span>
              <span className="text-muted-foreground text-lg">{details.period}</span>
            </div>
            {details.perRide && (
              <p className="text-center text-sm text-muted-foreground mt-1" data-testid="text-per-ride">{details.perRide}</p>
            )}
          </DialogHeader>
        </div>

        <div className="p-6 pt-2 space-y-5">
          <Card className="border-border/50">
            <CardContent className="p-4 space-y-3">
              <p className="text-sm font-bold text-foreground uppercase tracking-wider">What's included</p>
              {details.features.map((feature, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Check className={`w-4 h-4 mt-0.5 shrink-0 ${plan === "power_hop" ? "text-orange-500" : "text-blue-500"}`} />
                  <p className="text-sm text-muted-foreground">{feature}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {isCurrentPlan ? (
            <div className="text-center py-2">
              <Badge className="bg-green-500/10 text-green-600 border-green-500/30 px-4 py-1.5">
                <Check className="w-3.5 h-3.5 mr-1.5" />
                Active Subscription
              </Badge>
            </div>
          ) : (
            <div className="space-y-3">
              <Button
                data-testid="button-subscribe"
                className={`w-full h-12 font-bold text-base rounded-full ${plan === "power_hop" ? "bg-gradient-to-r from-orange-500 to-green-500 hover:from-orange-600 hover:to-green-600 text-white shadow-xl shadow-orange-500/30" : "shadow-lg"}`}
                onClick={() => subscribe.mutate()}
                disabled={subscribe.isPending}
              >
                {subscribe.isPending ? (
                  <Sparkles className="w-5 h-5 animate-spin mr-2" />
                ) : null}
                {isUpgrade ? "Upgrade to " : isDowngrade ? "Switch to " : "Start "}
                {details.name} — {details.price}{details.period}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Cancel anytime from Settings. No commitment required.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
