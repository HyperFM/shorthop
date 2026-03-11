import { useState } from "react";
import { Star, ThumbsUp, UserPlus, DollarSign } from "lucide-react";
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
  { label: "$3", cents: 300 },
];

interface HopBuddyRatingProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: number;
  ratedUserId: number;
  ratedUsername?: string;
  userTier?: string | null;
  showTip?: boolean;
}

export function HopBuddyRating({
  open,
  onOpenChange,
  tripId,
  ratedUserId,
  ratedUsername,
  userTier,
  showTip = false,
}: HopBuddyRatingProps) {
  const [selectedRating, setSelectedRating] = useState<string | null>(null);
  const [wantRideAgain, setWantRideAgain] = useState(false);
  const [tipCents, setTipCents] = useState<number | null>(null);
  const [customTip, setCustomTip] = useState("");
  const [showCustom, setShowCustom] = useState(false);
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
      const finalTip = showCustom ? Math.round(parseFloat(customTip || "0") * 100) : (tipCents || 0);
      if (showTip && finalTip >= 50) {
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
      if (!finalTip || finalTip < 50) return;
      await apiRequest("POST", `/api/hops/${tripId}/tip`, { tipCents: finalTip });
    },
    onSuccess: () => {
      const finalTip = showCustom ? Math.round(parseFloat(customTip) * 100) : tipCents;
      showFlash("💰", `$${((finalTip || 0) / 100).toFixed(2)} tip sent!`, "success");
      onOpenChange(false);
      resetState();
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
  }

  const effectiveTip = showCustom ? Math.round(parseFloat(customTip || "0") * 100) : tipCents;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl" data-testid="text-rating-title">
            How was your Hop Buddy?
          </DialogTitle>
          {ratedUsername && (
            <p className="text-center text-sm text-muted-foreground mt-1">
              Rate your ride with <span className="font-bold text-foreground">{ratedUsername}</span>
            </p>
          )}
        </DialogHeader>
        <div className="space-y-5 py-3">
          <div className="grid grid-cols-2 gap-3">
            {RATINGS.map((r) => (
              <button
                key={r.value}
                type="button"
                data-testid={`rating-${r.value}`}
                onClick={() => setSelectedRating(r.value)}
                className={`p-3.5 rounded-xl border-2 text-center transition-all ${
                  selectedRating === r.value
                    ? "border-primary bg-primary/5 shadow-md scale-[1.02]"
                    : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <span className={`text-2xl ${r.color}`}>{r.icon}</span>
                <p className="text-sm font-medium mt-1">{r.label}</p>
              </button>
            ))}
          </div>

          {showTip && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-xl p-4 border border-green-200 dark:border-green-800" data-testid="tip-section">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Leave a tip?</p>
                  <p className="text-[10px] text-muted-foreground">100% goes to your driver</p>
                </div>
              </div>
              <div className="flex gap-2 mb-2">
                {TIP_OPTIONS.map(t => (
                  <button
                    key={t.cents}
                    type="button"
                    onClick={() => { setTipCents(t.cents); setShowCustom(false); }}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                      tipCents === t.cents && !showCustom
                        ? "bg-green-500 text-white shadow-sm"
                        : "bg-white dark:bg-background border border-border hover:border-green-300"
                    }`}
                    data-testid={`tip-${t.cents}`}
                  >
                    {t.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => { setShowCustom(true); setTipCents(null); }}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                    showCustom
                      ? "bg-green-500 text-white shadow-sm"
                      : "bg-white dark:bg-background border border-border hover:border-green-300"
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
                    step="0.50"
                    min="0.50"
                    placeholder="0.00"
                    value={customTip}
                    onChange={e => setCustomTip(e.target.value)}
                    className="flex-1 h-9 rounded-lg border border-green-200 px-3 text-sm bg-white dark:bg-background"
                    data-testid="input-custom-tip"
                  />
                </div>
              )}
              {(tipCents || (showCustom && customTip)) && (
                <p className="text-[10px] text-green-600 mt-2 text-center font-medium">
                  Tip: ${((effectiveTip || 0) / 100).toFixed(2)}
                </p>
              )}
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="ride-again"
                data-testid="checkbox-ride-again"
                checked={wantRideAgain}
                onCheckedChange={(checked) => setWantRideAgain(!!checked)}
              />
              <Label htmlFor="ride-again" className="text-sm cursor-pointer flex items-center gap-1.5">
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
            disabled={!selectedRating || submitRating.isPending || sendTip.isPending}
            onClick={() => submitRating.mutate()}
          >
            {submitRating.isPending || sendTip.isPending
              ? "Submitting..."
              : effectiveTip && effectiveTip >= 50
              ? `Submit & Tip $${(effectiveTip / 100).toFixed(2)}`
              : "Submit Rating"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
