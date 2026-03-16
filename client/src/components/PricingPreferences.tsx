import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { showFlash } from "@/components/FlashNotification";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { DollarSign, Gift, Users, UserPlus, X, Loader2, Zap, Heart, TrendingUp } from "lucide-react";

interface PricingPreferencesProps {
  user: any;
  activeTab: "hopper" | "driver";
}

function getPriceGuidance(price: number): { label: string; color: string; message: string } {
  if (price === 0) {
    return {
      label: "Free Ride",
      color: "text-green-600",
      message: "You are offering rides for free. This is great for helping others or giving rides to friends and regular riders.",
    };
  }
  if (price <= 0.80) {
    return {
      label: "Low Price",
      color: "text-blue-600",
      message: "Lower prices can help you match faster and help more people get where they need to go. Many drivers choose this range when they are already headed the same direction.",
    };
  }
  if (price >= 0.90 && price <= 1.40) {
    return {
      label: "Recommended",
      color: "text-green-600",
      message: "Most ShortHop riders and drivers match fastest in this range. $1.20 per half mile is the most common price and usually leads to the quickest ride matches.",
    };
  }
  if (price > 1.75) {
    return {
      label: "Higher Price",
      color: "text-orange-600",
      message: "This price is higher than most ShortHop rides. You may receive fewer ride matches unless riders nearby are willing to pay this rate.",
    };
  }
  return {
    label: "Moderate",
    color: "text-yellow-600",
    message: "This price is within a reasonable range. You should still get matches, though the sweet spot is around $0.90–$1.40.",
  };
}

export function PricingPreferences({ user, activeTab }: PricingPreferencesProps) {
  const queryClient = useQueryClient();
  const [price, setPrice] = useState(parseFloat(user?.pricingPreference || "1.20"));
  const [allowFreeRides, setAllowFreeRides] = useState(user?.allowFreeRides || false);
  const [allowFollowerFreeRides, setAllowFollowerFreeRides] = useState(user?.allowFollowerFreeRides || false);
  const [addUsername, setAddUsername] = useState("");

  useEffect(() => {
    if (user?.pricingPreference) setPrice(parseFloat(user.pricingPreference));
    if (user?.allowFreeRides !== undefined) setAllowFreeRides(user.allowFreeRides);
    if (user?.allowFollowerFreeRides !== undefined) setAllowFollowerFreeRides(user.allowFollowerFreeRides);
  }, [user]);

  const { data: freeRideListData, isLoading: freeRideLoading } = useQuery<{ id: number; riderId: number; username: string; createdAt: string }[]>({
    queryKey: ["/api/free-ride-list"],
  });

  const updatePricing = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const res = await apiRequest("PATCH", "/api/user/profile", updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
    },
  });

  const addFreeRider = useMutation({
    mutationFn: async (username: string) => {
      const res = await apiRequest("POST", "/api/free-ride-list", { username });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/free-ride-list"] });
      setAddUsername("");
      showFlash("✅", "Rider added to free ride list", "success");
    },
    onError: (err: any) => {
      showFlash("❌", err.message || "Failed to add rider", "error");
    },
  });

  const removeFreeRider = useMutation({
    mutationFn: async (riderId: number) => {
      await apiRequest("DELETE", `/api/free-ride-list/${riderId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/free-ride-list"] });
      showFlash("✅", "Rider removed", "success");
    },
  });

  const handlePriceChange = (val: number[]) => {
    const newPrice = val[0];
    setPrice(newPrice);
  };

  const handlePriceCommit = (val: number[]) => {
    const newPrice = val[0];
    setPrice(newPrice);
    updatePricing.mutate({ pricingPreference: newPrice.toFixed(2) });
    showFlash("💲", `Price set to $${newPrice.toFixed(2)} per 0.5 mile`, "success");
  };

  const applyPreset = (presetPrice: number) => {
    setPrice(presetPrice);
    updatePricing.mutate({ pricingPreference: presetPrice.toFixed(2) });
    showFlash("💲", `Price set to $${presetPrice.toFixed(2)} per 0.5 mile`, "success");
  };

  const toggleFreeRides = (val: boolean) => {
    setAllowFreeRides(val);
    updatePricing.mutate({ allowFreeRides: val });
    showFlash(val ? "🎁" : "💲", val ? "Free rides enabled" : "Free rides disabled", "info");
  };

  const toggleFollowerFreeRides = (val: boolean) => {
    setAllowFollowerFreeRides(val);
    updatePricing.mutate({ allowFollowerFreeRides: val });
    showFlash(val ? "👥" : "💲", val ? "Follower free rides enabled" : "Follower free rides disabled", "info");
  };

  const guidance = getPriceGuidance(price);
  const fee = price * 0.15;
  const earnings = price - fee;
  const roleLabel = activeTab === "driver" ? "minimum" : "maximum";

  return (
    <div className="space-y-3">
      <Card className="border-border/40" data-testid="card-pricing-preferences">
        <CardContent className="py-3 px-4 space-y-4">
          <div className="flex items-center gap-2.5">
            <DollarSign className="w-4 h-4 text-green-600 shrink-0" />
            <p className="text-xs font-black text-foreground">Pricing Preferences</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => applyPreset(1.20)}
              className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-all ${
                price === 1.20 ? "bg-green-600 text-white border-green-600" : "bg-muted/50 text-foreground border-border/40 hover:border-green-400"
              }`}
              data-testid="button-preset-community"
            >
              <Heart className="w-3 h-3 mx-auto mb-0.5" />
              Community $1.20
            </button>
            <button
              onClick={() => applyPreset(0.75)}
              className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-all ${
                price === 0.75 ? "bg-blue-600 text-white border-blue-600" : "bg-muted/50 text-foreground border-border/40 hover:border-blue-400"
              }`}
              data-testid="button-preset-budget"
            >
              <Gift className="w-3 h-3 mx-auto mb-0.5" />
              Budget $0.75
            </button>
            <button
              onClick={() => applyPreset(1.50)}
              className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-all ${
                price === 1.50 ? "bg-orange-600 text-white border-orange-600" : "bg-muted/50 text-foreground border-border/40 hover:border-orange-400"
              }`}
              data-testid="button-preset-fast"
            >
              <Zap className="w-3 h-3 mx-auto mb-0.5" />
              Fast Match $1.50
            </button>
          </div>

          <div>
            <p className="text-[10px] text-muted-foreground mb-2">Price Per 0.5 Mile</p>
            <Slider
              min={0}
              max={5}
              step={0.05}
              value={[price]}
              onValueChange={handlePriceChange}
              onValueCommit={handlePriceCommit}
              className="w-full"
              data-testid="slider-pricing"
            />
            <div className="flex justify-between mt-1">
              <span className="text-[9px] text-muted-foreground">FREE</span>
              <span className="text-[9px] text-muted-foreground">$5.00</span>
            </div>
          </div>

          <div className="text-center py-2 bg-muted/30 rounded-lg">
            <p className="text-lg font-black text-foreground" data-testid="text-price-value">
              {price === 0 ? "FREE" : `$${price.toFixed(2)}`}
            </p>
            <p className="text-[10px] text-muted-foreground">
              Your {roleLabel} price per 0.5 mile
            </p>
          </div>

          <div className={`p-2.5 rounded-lg border ${
            guidance.label === "Recommended" ? "bg-green-500/5 border-green-500/20" :
            guidance.label === "Free Ride" ? "bg-green-500/5 border-green-500/20" :
            guidance.label === "Low Price" ? "bg-blue-500/5 border-blue-500/20" :
            guidance.label === "Higher Price" ? "bg-orange-500/5 border-orange-500/20" :
            "bg-yellow-500/5 border-yellow-500/20"
          }`}>
            <p className={`text-[10px] font-black uppercase tracking-wider ${guidance.color}`} data-testid="text-price-guidance-label">
              {guidance.label}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1" data-testid="text-price-guidance-message">
              {guidance.message}
            </p>
          </div>

          {activeTab === "driver" && price > 0 && (
            <div className="p-2.5 rounded-lg bg-muted/20 border border-border/30 space-y-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-muted-foreground">Driver price:</span>
                <span className="font-bold text-foreground">${price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-muted-foreground">ShortHop fee (15%):</span>
                <span className="font-bold text-orange-500">-${fee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[10px] border-t border-border/30 pt-1">
                <span className="font-bold text-foreground">Estimated earnings:</span>
                <span className="font-black text-green-600" data-testid="text-estimated-earnings">${earnings.toFixed(2)}</span>
              </div>
            </div>
          )}

          <p className="text-[9px] text-muted-foreground text-center italic">
            ShortHop recommends around $1 per half mile to keep rides affordable and easy to match. However, drivers and riders are always free to choose their own price.
          </p>
        </CardContent>
      </Card>

      {activeTab === "driver" && (
        <>
          <Card className="border-border/40" data-testid="card-free-ride-settings">
            <CardContent className="py-3 px-4 space-y-3">
              <div className="flex items-center gap-2.5">
                <Gift className="w-4 h-4 text-purple-600 shrink-0" />
                <p className="text-xs font-black text-foreground">Free Ride Settings</p>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <Users className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <Label htmlFor="toggle-free-rides" className="text-[11px] font-medium cursor-pointer">Allow Free Rides For Everyone</Label>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Drivers can match with riders for $0 rides.</p>
                  </div>
                </div>
                <Switch
                  id="toggle-free-rides"
                  data-testid="switch-free-rides"
                  checked={allowFreeRides}
                  onCheckedChange={toggleFreeRides}
                />
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-border/20 pt-2">
                <div className="flex items-start gap-2.5">
                  <Heart className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <Label htmlFor="toggle-follower-free" className="text-[11px] font-medium cursor-pointer">Allow Free Rides For Followers</Label>
                    <p className="text-[10px] text-muted-foreground mt-0.5">People you follow or connect with can ride with you for free.</p>
                  </div>
                </div>
                <Switch
                  id="toggle-follower-free"
                  data-testid="switch-follower-free-rides"
                  checked={allowFollowerFreeRides}
                  onCheckedChange={toggleFollowerFreeRides}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/40" data-testid="card-free-ride-list">
            <CardContent className="py-3 px-4 space-y-3">
              <div className="flex items-center gap-2.5">
                <UserPlus className="w-4 h-4 text-green-600 shrink-0" />
                <p className="text-xs font-black text-foreground">Free Ride List</p>
              </div>
              <p className="text-[10px] text-muted-foreground">Add riders who automatically see "Free Ride Available" when requesting rides with you.</p>

              <div className="flex gap-2">
                <Input
                  placeholder="Enter username"
                  value={addUsername}
                  onChange={(e) => setAddUsername(e.target.value)}
                  className="text-xs h-8"
                  data-testid="input-free-ride-username"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && addUsername.trim()) {
                      addFreeRider.mutate(addUsername.trim());
                    }
                  }}
                />
                <Button
                  size="sm"
                  className="h-8 px-3 text-xs bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => addUsername.trim() && addFreeRider.mutate(addUsername.trim())}
                  disabled={addFreeRider.isPending || !addUsername.trim()}
                  data-testid="button-add-free-rider"
                >
                  {addFreeRider.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "+ Add"}
                </Button>
              </div>

              {freeRideLoading ? (
                <div className="flex justify-center py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              ) : freeRideListData && freeRideListData.length > 0 ? (
                <div className="space-y-1.5">
                  {freeRideListData.map((entry) => (
                    <div key={entry.riderId} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-1.5" data-testid={`free-rider-${entry.riderId}`}>
                      <div className="flex items-center gap-2">
                        <Gift className="w-3 h-3 text-green-500" />
                        <span className="text-[11px] font-bold text-foreground">{entry.username}</span>
                      </div>
                      <button
                        onClick={() => removeFreeRider.mutate(entry.riderId)}
                        className="text-muted-foreground hover:text-red-500 transition-colors"
                        data-testid={`button-remove-rider-${entry.riderId}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground text-center py-2">No riders added yet</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
