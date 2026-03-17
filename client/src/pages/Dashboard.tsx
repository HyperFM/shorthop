import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import WalkerDashboard from "./WalkerDashboard";
import DriverDashboard from "./DriverDashboard";
import { NearbyHopperAlert } from "@/components/NearbyHopperAlert";
import { useNearbyHopperSimulation } from "@/hooks/use-location";
import { showFlash } from "@/components/FlashNotification";
import { Loader2, Bell, BellOff, ChevronRight, Volume2, Eye, EyeOff, Shield, MapPin, Navigation, Lightbulb } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { SubscriptionModal } from "@/components/SubscriptionModal";
import { RideVibeSelector } from "@/components/RideVibeSelector";
import { PricingPreferences } from "@/components/PricingPreferences";
import { Slider } from "@/components/ui/slider";
import { getDriverSoundDuration, setDriverSoundDuration, type DriverSoundDuration, playDriverApproachingSound } from "@/lib/sounds";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { api } from "@shared/routes";

const NOTIF_STORAGE_KEY = "shorthop-notification-preferences";

interface NotificationPreferences {
  rideAlerts: boolean;
  routeAlerts: boolean;
  hopperNearbyAlerts: boolean;
  busyRouteAlerts: boolean;
  communityNotifications: boolean;
  growthNotifications: boolean;
  driverApproachingSound: boolean;
}

const defaultPreferences: NotificationPreferences = {
  rideAlerts: true,
  routeAlerts: true,
  hopperNearbyAlerts: true,
  busyRouteAlerts: false,
  communityNotifications: true,
  growthNotifications: true,
  driverApproachingSound: true,
};

function loadPreferences(): NotificationPreferences {
  try {
    const stored = localStorage.getItem(NOTIF_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return defaultPreferences;
}

function savePreferences(prefs: NotificationPreferences) {
  localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(prefs));
}

export default function Dashboard() {
  const { data: user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { currentHopper, dismiss } = useNearbyHopperSimulation(!!user?.isDriver);
  const [activeTab, setActiveTab] = useState<"hopper" | "driver">(
    user?.isDriver ? "driver" : "hopper"
  );
  const welcomeShown = useRef(false);
  const [subModal, setSubModal] = useState<"flex_hop" | "power_hop" | null>(null);
  const [soundDuration, setSoundDuration] = useState<DriverSoundDuration>(getDriverSoundDuration);
  const [rideVibe, setRideVibe] = useState(user?.rideVibe || "friendly_chat");
  const [hopperFlexRange, setHopperFlexRange] = useState(user?.hopperFlexRange || "0.25");
  const [driverFlexRange, setDriverFlexRange] = useState(user?.driverFlexRange || "0.5");
  const [detourEnabled, setDetourEnabled] = useState(user?.isFlexibleDriver || false);
  const [prefs, setPrefs] = useState<NotificationPreferences>(loadPreferences);
  const [autoAlerts, setAutoAlerts] = useState(() => {
    try { return localStorage.getItem("sh-driver-auto-notify") === "true"; } catch { return false; }
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    function onDurationChange(e: Event) {
      setSoundDuration((e as CustomEvent).detail);
    }
    window.addEventListener("sh-sound-duration-change", onDurationChange);
    return () => window.removeEventListener("sh-sound-duration-change", onDurationChange);
  }, []);

  useEffect(() => {
    if (user?.rideVibe) setRideVibe(user.rideVibe);
  }, [user?.rideVibe]);

  useEffect(() => {
    if (user?.hopperFlexRange) setHopperFlexRange(user.hopperFlexRange);
    if (user?.driverFlexRange) setDriverFlexRange(user.driverFlexRange);
    if (user?.isFlexibleDriver !== undefined) setDetourEnabled(user.isFlexibleDriver || false);
  }, [user?.hopperFlexRange, user?.driverFlexRange, user?.isFlexibleDriver]);

  useEffect(() => {
    savePreferences(prefs);
  }, [prefs]);

  function togglePref(key: keyof NotificationPreferences) {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function toggleSoundDuration() {
    const next: DriverSoundDuration = soundDuration === "full" ? "short" : "full";
    setDriverSoundDuration(next);
    setSoundDuration(next);
    showFlash("🔔", `Alert sound: ${next === "full" ? "8 seconds" : "3 seconds"}`, "info");
    try { navigator.vibrate?.(20); } catch {}
    playDriverApproachingSound();
  }

  const updatePreferences = useMutation({
    mutationFn: async (updates: { rideVibe?: string; hopperFlexRange?: string; driverFlexRange?: string; isFlexibleDriver?: boolean }) => {
      const res = await apiRequest(api.profile.updatePreferences.method, api.profile.updatePreferences.path, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.auth.me.path] });
      showFlash("✨", "Preferences saved!", "success");
    },
  });

  const handleVibeChange = (value: string) => {
    setRideVibe(value);
    updatePreferences.mutate({ rideVibe: value });
  };

  useEffect(() => {
    if (user && !welcomeShown.current) {
      welcomeShown.current = true;
      const params = new URLSearchParams(window.location.search);
      if (params.get("subscription") === "success") {
        const plan = params.get("plan");
        showFlash("🎉", `${plan === "power_hop" ? "Power Hop" : "Flex Hop"} subscription activated!`, "success");
        window.history.replaceState({}, "", "/dashboard");
      } else if (params.get("subscription") === "cancelled") {
        showFlash("ℹ️", "Subscription checkout cancelled", "info");
        window.history.replaceState({}, "", "/dashboard");
      } else if (params.get("tip") === "success") {
        showFlash("💰", "Tip sent successfully!", "success");
        window.history.replaceState({}, "", "/dashboard");
      } else if (params.get("tip") === "cancelled") {
        showFlash("ℹ️", "Tip cancelled", "info");
        window.history.replaceState({}, "", "/dashboard");
      }
    }
  }, [user]);

  function vibrate() {
    try { navigator.vibrate?.(30); } catch {}
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    setLocation("/auth");
    return null;
  }

  const toggleItems: { key: keyof NotificationPreferences; label: string; description: string; icon: typeof Bell }[] = [
    { key: "rideAlerts", label: "Ride Alerts", description: "Matches or incoming drivers", icon: Bell },
    { key: "driverApproachingSound", label: "Driver Approaching Sound", description: "Alert sound when your driver enters the corridor zone", icon: Volume2 },
    { key: "hopperNearbyAlerts", label: "Hopper Nearby", description: "Know when a hopper is nearby", icon: Bell },
    { key: "communityNotifications", label: "Community", description: "Social updates and news", icon: Bell },
    { key: "growthNotifications", label: "Network Growth", description: "Milestones and progress", icon: Bell },
  ];

  return (
    <>
      {subModal && (
        <SubscriptionModal
          plan={subModal}
          onClose={() => setSubModal(null)}
        />
      )}

      {activeTab === "driver" && (
        <NearbyHopperAlert hopper={currentHopper} onDismiss={dismiss} />
      )}

      <div className="pt-2 pb-1 px-4 max-w-lg mx-auto" data-testid="mode-switcher">
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full blur-lg bg-orange-400/25 scale-110 -z-10" />
            <div className="relative flex items-center bg-card/98 backdrop-blur-xl rounded-full border border-orange-400/50 shadow-lg shadow-orange-500/15 p-1">
              <motion.div
                className="absolute top-1 bottom-1 rounded-full"
                animate={{
                  left: activeTab === "hopper" ? 4 : "50%",
                  right: activeTab === "driver" ? 4 : "50%",
                  background: activeTab === "hopper"
                    ? "linear-gradient(135deg, #3b82f6, #1d4ed8)"
                    : "linear-gradient(135deg, #16a34a, #15803d)",
                }}
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
              <button
                onClick={() => {
                  setActiveTab("hopper");
                  vibrate();
                  try { localStorage.setItem("sh-active-tab", "hopper"); } catch {}
                  window.dispatchEvent(new CustomEvent("sh-mode-change", { detail: "hopper" }));
                }}
                className={`relative z-10 px-7 py-2.5 rounded-full text-xs font-black tracking-wide transition-colors ${
                  activeTab === "hopper" ? "text-white" : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid="tab-hopper"
              >
                Hopper
              </button>
              <button
                onClick={() => {
                  setActiveTab("driver");
                  vibrate();
                  try { localStorage.setItem("sh-active-tab", "driver"); } catch {}
                  window.dispatchEvent(new CustomEvent("sh-mode-change", { detail: "driver" }));
                }}
                className={`relative z-10 px-7 py-2.5 rounded-full text-xs font-black tracking-wide transition-colors ${
                  activeTab === "driver" ? "text-white" : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid="tab-driver"
              >
                Driver
              </button>
            </div>
          </div>
        </div>
      </div>

      {activeTab === "driver" ? (
        <DriverDashboard user={user} />
      ) : (
        <WalkerDashboard user={user} />
      )}

      <div className="max-w-lg mx-auto px-4 pb-4 space-y-3 mt-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Your Tailor</p>
          <button onClick={() => setLocation("/settings")} className="text-[10px] text-orange-500 font-semibold flex items-center gap-0.5" data-testid="link-tailor-settings">
            Full Settings <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {activeTab === "hopper" && (
          <Card className="border-border/40" data-testid="card-tailor-hopper-flex">
            <CardContent className="py-3 px-4 space-y-3">
              <div className="flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
                <p className="text-xs font-black text-foreground">Flex Range</p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-foreground mb-1">How far are you willing to walk?</p>
                <p className="text-[10px] text-muted-foreground mb-3">
                  {hopperFlexRange === "0" ? "You must be directly on route" : `Up to ${hopperFlexRange} mile${hopperFlexRange !== "1" && hopperFlexRange !== "0" ? "s" : ""}`}
                </p>
                <Slider
                  data-testid="slider-hopper-flex-range"
                  min={0}
                  max={3}
                  step={1}
                  value={[["0", "0.25", "0.5", "1"].indexOf(hopperFlexRange)]}
                  onValueChange={([idx]) => {
                    const val = ["0", "0.25", "0.5", "1"][idx];
                    setHopperFlexRange(val);
                    updatePreferences.mutate({ hopperFlexRange: val as any });
                  }}
                />
                <div className="flex justify-between mt-1">
                  {["0", "0.25", "0.5", "1"].map((v) => (
                    <span key={v} className={`text-[9px] ${hopperFlexRange === v ? "text-blue-500 font-bold" : "text-muted-foreground"}`}>
                      {v === "0" ? "0 mi" : v === "1" ? "1 mi" : `${v} mi`}
                    </span>
                  ))}
                </div>
              </div>
              <div className="border-t border-border/20 pt-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <Lightbulb className="w-3 h-3 text-yellow-500 shrink-0" />
                  <p className="text-[10px] font-bold text-foreground">Smart Tips</p>
                </div>
                <p className="text-[9px] text-muted-foreground leading-relaxed" data-testid="text-hopper-smart-tip">
                  {hopperFlexRange === "0"
                    ? "You'll only match with drivers passing right by you. Try increasing your range for faster matches."
                    : hopperFlexRange === "0.25"
                    ? "Great for main roads — short walk for a quick pickup."
                    : hopperFlexRange === "0.5"
                    ? "Nice balance — you'll see more available drivers nearby."
                    : "Maximum flexibility — you'll get the most match options."}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "driver" && (
          <Card className="border-border/40" data-testid="card-tailor-ride-style">
            <CardContent className="py-3 px-4 space-y-3">
              <div className="flex items-center gap-2.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-green-500 shrink-0"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2" /><path d="M12 8v4l3 3" /></svg>
                <p className="text-xs font-black text-foreground">Ride Style</p>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <Navigation className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <Label htmlFor="toggle-detours" className="text-[11px] font-medium cursor-pointer">Allow Detours</Label>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Leave your route to pick up nearby hoppers</p>
                  </div>
                </div>
                <Switch
                  id="toggle-detours"
                  data-testid="switch-enable-detours"
                  checked={detourEnabled}
                  onCheckedChange={(checked) => {
                    setDetourEnabled(checked);
                    if (!checked) {
                      setDriverFlexRange("0");
                      updatePreferences.mutate({ isFlexibleDriver: false, driverFlexRange: "0" });
                    } else {
                      setDriverFlexRange("0.5");
                      updatePreferences.mutate({ isFlexibleDriver: true, driverFlexRange: "0.5" });
                    }
                  }}
                />
              </div>

              {detourEnabled && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border-t border-border/20 pt-2"
                >
                  <div className="flex items-center gap-2.5 mb-1">
                    <MapPin className="w-4 h-4 text-green-500 shrink-0" />
                    <p className="text-xs font-black text-foreground">Flex Range</p>
                  </div>
                  <p className="text-[11px] font-medium text-foreground mb-1">How far are you willing to detour?</p>
                  <p className="text-[10px] text-muted-foreground mb-3">
                    {driverFlexRange === "0" ? "No detours — direct route only" : `Up to ${driverFlexRange} mile${driverFlexRange !== "1" ? "s" : ""}${driverFlexRange === "1" ? "+" : ""}`}
                  </p>
                  <Slider
                    data-testid="slider-driver-flex-range"
                    min={0}
                    max={3}
                    step={1}
                    value={[["0", "0.25", "0.5", "1"].indexOf(driverFlexRange)]}
                    onValueChange={([idx]) => {
                      const val = ["0", "0.25", "0.5", "1"][idx];
                      setDriverFlexRange(val);
                      updatePreferences.mutate({ driverFlexRange: val as any });
                    }}
                  />
                  <div className="flex justify-between mt-1">
                    {["0", "0.25", "0.5", "1+"].map((v, i) => (
                      <span key={v} className={`text-[9px] ${driverFlexRange === ["0", "0.25", "0.5", "1"][i] ? "text-green-500 font-bold" : "text-muted-foreground"}`}>
                        {v === "0" ? "0 mi" : `${v} mi`}
                      </span>
                    ))}
                  </div>
                  <div className="border-t border-border/20 pt-2 mt-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Lightbulb className="w-3 h-3 text-yellow-500 shrink-0" />
                      <p className="text-[10px] font-bold text-foreground">Smart Tips</p>
                    </div>
                    <p className="text-[9px] text-muted-foreground leading-relaxed" data-testid="text-driver-smart-tip">
                      {driverFlexRange === "0"
                        ? "You'll only match hoppers right on your route. Great for staying efficient."
                        : driverFlexRange === "0.25"
                        ? "Short detours can increase your earnings without much extra time."
                        : driverFlexRange === "0.5"
                        ? "Most riders nearby are within this range — solid pickup zone."
                        : "Maximum reach — you'll see the most hop requests in your area."}
                    </p>
                  </div>
                </motion.div>
              )}

              {!detourEnabled && (
                <div className="border-t border-border/20 pt-2">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Lightbulb className="w-3 h-3 text-yellow-500 shrink-0" />
                    <p className="text-[10px] font-bold text-foreground">Smart Tips</p>
                  </div>
                  <p className="text-[9px] text-muted-foreground leading-relaxed" data-testid="text-driver-smart-tip-off">
                    Detours are off — you'll match hoppers willing to walk to your route. Turn on detours to see more requests.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between gap-3 border-t border-border/20 pt-2">
                <div className="flex items-start gap-2.5">
                  {autoAlerts ? <Bell className="w-4 h-4 mt-0.5 text-orange-500 shrink-0" /> : <BellOff className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />}
                  <div>
                    <Label htmlFor="toggle-auto-alerts" className="text-[11px] font-medium cursor-pointer">Auto-Alerts</Label>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Alert when pickup is on your route</p>
                  </div>
                </div>
                <Switch
                  id="toggle-auto-alerts"
                  data-testid="switch-auto-alerts"
                  checked={autoAlerts}
                  onCheckedChange={async (checked) => {
                    if (checked && "Notification" in window && Notification.permission !== "granted") {
                      const perm = await Notification.requestPermission();
                      if (perm !== "granted") {
                        showFlash("🔕", "Notifications blocked by browser", "error");
                        return;
                      }
                    }
                    setAutoAlerts(checked);
                    try { localStorage.setItem("sh-driver-auto-notify", String(checked)); } catch {}
                    window.dispatchEvent(new CustomEvent("sh-auto-alert-change"));
                    showFlash(checked ? "🔔" : "🔕", checked ? "Auto-notifications ON" : "Auto-notifications OFF", checked ? "success" : "info");
                  }}
                />
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-border/40" data-testid="card-tailor-vibe">
          <CardContent className="py-3 px-4 space-y-3">
            <div className="flex items-center gap-2.5">
              <Shield className="w-4 h-4 text-primary shrink-0" />
              <p className="text-xs font-black text-foreground">Ride Vibe</p>
            </div>
            <p className="text-[10px] text-muted-foreground">Set your ride vibe so matches know what to expect.</p>
            <RideVibeSelector
              value={rideVibe}
              onChange={handleVibeChange}
              disabled={updatePreferences.isPending}
            />
          </CardContent>
        </Card>

        <Card className="border-border/40" data-testid="card-tailor-privacy">
          <CardContent className="py-3 px-4 space-y-3">
            <div className="flex items-center gap-2.5">
              <Eye className="w-4 h-4 text-muted-foreground shrink-0" />
              <p className="text-xs font-black text-foreground">Privacy Controls</p>
            </div>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <EyeOff className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <Label htmlFor="toggle-community-tailor" className="text-[11px] font-medium cursor-pointer">Community Features</Label>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Show profile in community and allow follows.</p>
                </div>
              </div>
              <Switch
                id="toggle-community-tailor"
                data-testid="switch-community-features-tailor"
                checked={prefs.communityNotifications}
                onCheckedChange={() => togglePref("communityNotifications")}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40" data-testid="card-tailor-notifications">
          <CardContent className="py-3 px-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Bell className="w-4 h-4 text-accent shrink-0" />
                <p className="text-xs font-black text-foreground">Alert Preferences</p>
              </div>
            </div>

            {toggleItems.map(({ key, label, description, icon: Icon }) => (
              <div key={key} className="flex items-center justify-between gap-3 border-t border-border/20 pt-2">
                <div className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-[11px] font-bold text-foreground">{label}</p>
                    <p className="text-[9px] text-muted-foreground">{description}</p>
                  </div>
                </div>
                <Switch
                  id={`toggle-tailor-${key}`}
                  data-testid={`switch-tailor-${key}`}
                  checked={prefs[key]}
                  onCheckedChange={() => togglePref(key)}
                />
              </div>
            ))}

            {prefs.driverApproachingSound && (
              <div className="flex items-center justify-between gap-3 pt-1 border-t border-border/30">
                <div className="flex items-center gap-2.5">
                  <Volume2 className="w-4 h-4 text-orange-400 shrink-0" />
                  <div>
                    <p className="text-[11px] font-bold text-foreground">Alert Duration</p>
                    <p className="text-[9px] text-muted-foreground">Duration of the alert tone</p>
                  </div>
                </div>
                <button
                  onClick={toggleSoundDuration}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-black transition-all border ${
                    soundDuration === "full"
                      ? "bg-orange-500 text-white border-orange-500 shadow-sm shadow-orange-400/30"
                      : "bg-muted/60 text-foreground border-border/50"
                  }`}
                  data-testid="button-sound-duration"
                >
                  {soundDuration === "full" ? "8 seconds" : "3 seconds"}
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
