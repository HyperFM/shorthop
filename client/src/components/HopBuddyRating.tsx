import { useState } from "react";
import { X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { api } from "@shared/routes";
import { showFlash } from "@/components/FlashNotification";
import driverIconUrl from "@assets/Untitled_design_1773938700510.png";
import hopperIconUrl from "@assets/Untitled_design_1773938781771.png";

const TIP_OPTIONS = [
  { label: "$1", cents: 100 },
  { label: "$2", cents: 200 },
  { label: "$5", cents: 500 },
  { label: "$10", cents: 1000 },
];

interface HopBuddyRatingProps {
  tripId: number;
  ratedUserId: number;
  ratedUsername?: string;
  ratedPhoto?: string | null;
  partnerRole?: "driver" | "hopper";
  userCredits?: number;
  showTip?: boolean;
  onDismiss: () => void;
}

export function HopBuddyRating({
  tripId,
  ratedUserId,
  ratedUsername,
  ratedPhoto,
  partnerRole = "driver",
  userCredits = 0,
  showTip = false,
  onDismiss,
}: HopBuddyRatingProps) {
  const fallbackIcon = partnerRole === "driver" ? driverIconUrl : hopperIconUrl;
  const [tipCents, setTipCents] = useState<number | null>(null);
  const [customTip, setCustomTip] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [tipMethod, setTipMethod] = useState<"card" | "wheels">("card");
  const queryClient = useQueryClient();

  const markRated = useMutation({
    mutationFn: async () => {
      await apiRequest(api.ratings.create.method, api.ratings.create.path, {
        tripId,
        ratedUserId,
        rating: "great_hop",
        wantRideAgain: false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.hops.list.path] });
      queryClient.invalidateQueries({ queryKey: ['/api/pending-rating'] });
      queryClient.invalidateQueries({ queryKey: ['/api/me'] });
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
        return;
      }
      const finalTip = showCustom ? Math.round(parseFloat(customTip) * 100) : tipCents;
      const methodLabel = tipMethod === "wheels" ? "wheels" : "card";
      showFlash("💰", `$${((finalTip || 0) / 100).toFixed(2)} tip sent via ${methodLabel}!`, "success");
      queryClient.invalidateQueries({ queryKey: ['/api/me'] });
      markRated.mutate();
      onDismiss();
    },
    onError: () => {
      showFlash("❌", "Failed to send tip", "error");
    },
  });

  const handleDismiss = () => {
    markRated.mutate();
    onDismiss();
  };

  const handleSendTip = () => {
    const finalTip = showCustom ? Math.round(parseFloat(customTip || "0") * 100) : tipCents;
    if (!finalTip || finalTip < 100) return;
    sendTip.mutate();
  };

  const effectiveTip = showCustom ? Math.round(parseFloat(customTip || "0") * 100) : tipCents;
  const effectiveTipWheels = (effectiveTip || 0) / 100;
  const canAffordWheels = userCredits >= effectiveTipWheels;
  const canSend = (effectiveTip || 0) >= 100 && (tipMethod !== "wheels" || canAffordWheels);

  return (
    <div className="mx-2 mb-2 rounded-xl border border-orange-200 dark:border-orange-800/50 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 overflow-hidden" data-testid="hop-buddy-tip-banner">
      <div className="flex items-center gap-2.5 px-3 py-2">
        {ratedPhoto ? (
          <img src={ratedPhoto} className="w-9 h-9 rounded-full border-2 border-orange-400 object-cover flex-shrink-0" alt="" data-testid="display-rating-photo" />
        ) : (
          <img src={fallbackIcon} className="w-9 h-9 rounded-full border-2 border-orange-400 object-contain flex-shrink-0 bg-white dark:bg-gray-800" alt={partnerRole} data-testid="display-rating-photo" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground dark:text-white truncate" data-testid="text-rating-title">
            Hop with <span className="text-orange-500">{ratedUsername || "your buddy"}</span> complete!
          </p>
          {showTip && (
            <p className="text-[10px] text-muted-foreground dark:text-gray-400">Leave a tip? 100% goes to your driver</p>
          )}
        </div>
        <button type="button" onClick={handleDismiss} className="p-1 rounded-full hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors flex-shrink-0" data-testid="button-dismiss-rating">
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      {showTip && (
        <div className="px-3 pb-2.5 space-y-1.5">
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setTipMethod("card")}
              className={`flex-1 py-1 rounded-md text-[10px] font-bold transition-all ${
                tipMethod === "card"
                  ? "bg-green-500 text-white"
                  : "bg-white dark:bg-gray-800 border border-border text-foreground dark:text-white"
              }`}
              data-testid="tip-method-card"
            >
              💳 Card
            </button>
            <button
              type="button"
              onClick={() => setTipMethod("wheels")}
              className={`flex-1 py-1 rounded-md text-[10px] font-bold transition-all ${
                tipMethod === "wheels"
                  ? "bg-orange-500 text-white"
                  : "bg-white dark:bg-gray-800 border border-border text-foreground dark:text-white"
              }`}
              data-testid="tip-method-wheels"
            >
              🛞 {userCredits.toFixed(2)}
            </button>
          </div>

          <div className="flex gap-1">
            {TIP_OPTIONS.map(t => (
              <button
                key={t.cents}
                type="button"
                onClick={() => { setTipCents(t.cents); setShowCustom(false); }}
                className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${
                  tipCents === t.cents && !showCustom
                    ? "bg-green-500 text-white shadow-sm"
                    : "bg-white dark:bg-gray-800 border border-border hover:border-green-300 text-foreground dark:text-white"
                }`}
                data-testid={`tip-${t.cents}`}
              >
                {t.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => { setShowCustom(true); setTipCents(null); }}
              className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                showCustom
                  ? "bg-green-500 text-white shadow-sm"
                  : "bg-white dark:bg-gray-800 border border-border hover:border-green-300 text-foreground dark:text-white"
              }`}
              data-testid="tip-custom"
            >
              Other
            </button>
          </div>

          {showCustom && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-green-600">$</span>
              <input
                type="number"
                step="1"
                min="1"
                max="100"
                placeholder="0"
                value={customTip}
                onChange={e => setCustomTip(e.target.value)}
                className="flex-1 h-7 rounded-md border border-green-200 px-2 text-xs bg-white dark:bg-gray-800 text-foreground dark:text-white"
                data-testid="input-custom-tip"
              />
            </div>
          )}

          {tipMethod === "wheels" && (effectiveTip || 0) >= 100 && !canAffordWheels && (
            <p className="text-[10px] text-red-500 font-medium text-center">Not enough wheels</p>
          )}

          {canSend && (
            <button
              type="button"
              onClick={handleSendTip}
              disabled={sendTip.isPending}
              className="w-full py-1.5 rounded-md bg-green-500 hover:bg-green-600 text-white text-xs font-bold transition-all disabled:opacity-50"
              data-testid="button-send-tip"
            >
              {sendTip.isPending ? "Sending..." : `Send $${((effectiveTip || 0) / 100).toFixed(2)} Tip`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
