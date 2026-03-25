import { useState } from "react";
import { ThumbsUp, UserPlus, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { api, buildUrl } from "@shared/routes";
import { showFlash } from "@/components/FlashNotification";

const RATINGS = [
  { value: "great_hop", label: "Great Hop", icon: "⭐", color: "text-yellow-500" },
  { value: "good_ride", label: "Good Ride", icon: "⭐", color: "text-yellow-400" },
  { value: "neutral", label: "Neutral", icon: "⭐", color: "text-muted-foreground" },
  { value: "issue", label: "Issue", icon: "⚠", color: "text-destructive" },
] as const;

const TIP_OPTIONS = [
  { label: "$1", cents: 100 },
  { label: "$2", cents: 200 },
  { label: "$5", cents: 500 },
  { label: "$10", cents: 1000 },
];

interface HopBuddyRatingProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: number;
  ratedUserId: number;
  ratedUsername?: string;
  ratedPhoto?: string | null;
  userTier?: string | null;
  userCredits?: number;
  showTip?: boolean;
}

export function HopBuddyRating({
  open,
  onOpenChange,
  tripId,
  ratedUserId,
  ratedUsername,
  ratedPhoto,
  userTier,
  userCredits = 0,
  showTip = false,
}: HopBuddyRatingProps) {
  const [selectedRating, setSelectedRating] = useState<string | null>(null);
  const [wantRideAgain, setWantRideAgain] = useState(false);
  const [tipCents, setTipCents] = useState<number | null>(null);
  const [customTip, setCustomTip] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [tipMethod, setTipMethod] = useState<"card" | "wheels">("card");
  const queryClient = useQueryClient();

  const submitRating = useMutation({
    mutationFn: async () => {
      if (!selectedRating) return;
      await apiRequest(api.ratings.create.method, api.ratings.create.path, {
        tripId,
        ratedUserId,
        rating: selectedRating,
        wantRideAgain,
      });
    },
    onSuccess: () => {
      showFlash("⭐", "Thanks for the feedback!", "success");
      queryClient.invalidateQueries({ queryKey: [api.hops.list.path] });
      queryClient.invalidateQueries({ queryKey: ['/api/pending-rating'] });
      queryClient.invalidateQueries({ queryKey: ['/api/me'] });
      const finalTip = showCustom ? Math.round(parseFloat(customTip || "0") * 100) : (tipCents || 0);
      if (showTip && finalTip >= 100) {
        sendTip.mutate();
      } else {
        onOpenChange(false);
        resetState();
      }
    },
  });

  const sendTip = useMutation({
    mutationFn: async () => {
      const finalTip = showCustom ? Math.round(parseFloat(customTip) * 100) : tipCents;
      if (!finalTip || finalTip < 100) return;
      const res = await apiRequest("POST", `/api/hops/${tripId}/tip`, {
        tipCents: finalTip,
        useWheels: tipMethod === "wheels",
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      if (data?.checkoutRequired && data?.url) {
        window.location.href = data.url;
      } else {
        const finalTip = showCustom ? Math.round(parseFloat(customTip) * 100) : tipCents;
        const methodLabel = tipMethod === "wheels" ? "wheels" : "card";
        showFlash("💰", `$${((finalTip || 0) / 100).toFixed(2)} tip sent via ${methodLabel}!`, "success");
        queryClient.invalidateQueries({ queryKey: ['/api/me'] });
        onOpenChange(false);
        resetState();
      }
    },
    onError: () => {
      showFlash("❌", "Failed to send tip", "error");
      onOpenChange(false);
      resetState();
    },
  });

  const followUser = useMutation({
    mutationFn: async () => {
      const url = buildUrl(api.follows.follow.path, { id: ratedUserId });
      await apiRequest(api.follows.follow.method, url);
    },
    onSuccess: () => {
      showFlash("👥", `Following ${ratedUsername || "user"}!`, "success");
      queryClient.invalidateQueries({ queryKey: [api.follows.list.path] });
    },
  });

  function resetState() {
    setSelectedRating(null);
    setWantRideAgain(false);
    setTipCents(null);
    setCustomTip("");
    setShowCustom(false);
    setTipMethod("card");
  }

  const effectiveTip = showCustom ? Math.round(parseFloat(customTip || "0") * 100) : tipCents;
  const effectiveTipWheels = (effectiveTip || 0) / 100;
  const canAffordWheels = userCredits >= effectiveTipWheels;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          {ratedPhoto && (
            <div className="flex justify-center mb-2" data-testid="display-rating-photo">
              <img src={ratedPhoto} className="w-16 h-16 rounded-full border-3 border-orange-400 object-cover shadow-lg" alt="" />
            </div>
          )}
          {!ratedPhoto && (
            <div className="flex justify-center mb-2">
              <div className="w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900/30 border-3 border-orange-400 flex items-center justify-center shadow-lg">
                <span className="text-2xl">🧡</span>
              </div>
            </div>
          )}
          <DialogTitle className="text-center text-lg leading-snug" data-testid="text-rating-title">
            how was your hop with{" "}
            <span className="text-orange-500">{ratedUsername || "your buddy"}</span>
            {" "}buddy?
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-2.5">
            {RATINGS.map((r) => (
              <button
                key={r.value}
                type="button"
                data-testid={`rating-${r.value}`}
                onClick={() => setSelectedRating(r.value)}
                className={`p-3 rounded-xl border-2 text-center transition-all ${
                  selectedRating === r.value
                    ? "border-primary bg-primary/5 shadow-md scale-[1.02]"
                    : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <span className={`text-xl ${r.color}`}>{r.icon}</span>
                <p className="text-xs font-medium mt-0.5">{r.label}</p>
              </button>
            ))}
          </div>

          {showTip && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-xl p-3.5 border border-green-200 dark:border-green-800" data-testid="tip-section">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <DollarSign className="w-3.5 h-3.5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground dark:text-white">Leave a tip?</p>
                  <p className="text-[10px] text-muted-foreground dark:text-gray-400">100% goes to your driver</p>
                </div>
              </div>

              <div className="flex gap-1.5 mb-2">
                <button
                  type="button"
                  onClick={() => setTipMethod("card")}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                    tipMethod === "card"
                      ? "bg-green-500 text-white"
                      : "bg-white dark:bg-background border border-border text-foreground dark:text-white"
                  }`}
                  data-testid="tip-method-card"
                >
                  💳 Card
                </button>
                <button
                  type="button"
                  onClick={() => setTipMethod("wheels")}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                    tipMethod === "wheels"
                      ? "bg-orange-500 text-white"
                      : "bg-white dark:bg-background border border-border text-foreground dark:text-white"
                  }`}
                  data-testid="tip-method-wheels"
                >
                  🛞 Wheels ({userCredits.toFixed(2)})
                </button>
              </div>

              <div className="flex gap-1.5 mb-2">
                {TIP_OPTIONS.map(t => (
                  <button
                    key={t.cents}
                    type="button"
                    onClick={() => { setTipCents(t.cents); setShowCustom(false); }}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                      tipCents === t.cents && !showCustom
                        ? "bg-green-500 text-white shadow-sm"
                        : "bg-white dark:bg-background border border-border hover:border-green-300 text-foreground dark:text-white"
                    }`}
                    data-testid={`tip-${t.cents}`}
                  >
                    {t.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => { setShowCustom(true); setTipCents(null); }}
                  className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition-all ${
                    showCustom
                      ? "bg-green-500 text-white shadow-sm"
                      : "bg-white dark:bg-background border border-border hover:border-green-300 text-foreground dark:text-white"
                  }`}
                  data-testid="tip-custom"
                >
                  Other
                </button>
              </div>
              {showCustom && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm font-bold text-green-600">$</span>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max="100"
                    placeholder="0"
                    value={customTip}
                    onChange={e => setCustomTip(e.target.value)}
                    className="flex-1 h-9 rounded-lg border border-green-200 px-3 text-sm bg-white dark:bg-background text-foreground dark:text-white"
                    data-testid="input-custom-tip"
                  />
                </div>
              )}
              {(tipCents || (showCustom && customTip)) && (
                <div className="mt-2 text-center">
                  <p className="text-[10px] text-green-600 font-medium">
                    Tip: ${((effectiveTip || 0) / 100).toFixed(2)} via {tipMethod === "wheels" ? "wheels" : "card"}
                  </p>
                  {tipMethod === "wheels" && !canAffordWheels && (
                    <p className="text-[10px] text-red-500 font-medium">Not enough wheels</p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2.5">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="ride-again"
                data-testid="checkbox-ride-again"
                checked={wantRideAgain}
                onCheckedChange={(checked) => setWantRideAgain(!!checked)}
              />
              <Label htmlFor="ride-again" className="text-sm cursor-pointer flex items-center gap-1.5 text-foreground dark:text-white">
                <ThumbsUp className="w-3.5 h-3.5" />
                Ride again with this person
              </Label>
            </div>

            {userTier === "flexhop" && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                data-testid="button-follow-buddy"
                onClick={() => followUser.mutate()}
                disabled={followUser.isPending}
              >
                <UserPlus className="w-4 h-4 mr-1.5" />
                Follow Hop Buddy
              </Button>
            )}
          </div>

          <Button
            className="w-full"
            data-testid="button-submit-rating"
            disabled={
              !selectedRating ||
              submitRating.isPending ||
              sendTip.isPending ||
              (showTip && tipMethod === "wheels" && (effectiveTip || 0) >= 100 && !canAffordWheels)
            }
            onClick={() => submitRating.mutate()}
          >
            {submitRating.isPending || sendTip.isPending
              ? "Submitting..."
              : effectiveTip && effectiveTip >= 100
              ? `Submit & Tip $${(effectiveTip / 100).toFixed(2)}`
              : "Submit Rating"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
