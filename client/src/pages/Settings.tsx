import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Bell, Route, Users, TrendingUp, MessageCircle, Globe, Sparkles, Shield, Eye, EyeOff, Gift, Copy, Share2, Check, Mail, AlertTriangle, Smartphone, Volume2 } from "lucide-react";
import { useLocation } from "wouter";
import { showFlash } from "@/components/FlashNotification";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { NotificationCenter } from "@/components/NotificationCenter";
import { api } from "@shared/routes";
import { RideVibeSelector } from "@/components/RideVibeSelector";
import { InterestBubbles } from "@/components/InterestBubbles";
import { SubscriptionModal } from "@/components/SubscriptionModal";

const STORAGE_KEY = "shorthop-notification-preferences";

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
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return defaultPreferences;
}

function savePreferences(prefs: NotificationPreferences) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export default function Settings() {
  const { data: user } = useAuth();
  const [, setLocation] = useLocation();
  const [prefs, setPrefs] = useState<NotificationPreferences>(loadPreferences);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission | "unsupported">("default");
  const [rideVibe, setRideVibe] = useState(user?.rideVibe || "friendly_chat");
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();
  const [bio, setBio] = useState((user as any)?.bio || "");
  const [selectedInterests, setSelectedInterests] = useState<string[]>(() => {
    const raw = (user as any)?.interests;
    return raw ? raw.split(',').filter(Boolean) : [];
  });
  const [language, setLanguage] = useState((user as any)?.language || "en");
  const [preferredRoutes, setPreferredRoutes] = useState((user as any)?.preferredRoutes || "");
  const [travelTime, setTravelTime] = useState((user as any)?.travelTime || "");
  const [favoritePlaces, setFavoritePlaces] = useState((user as any)?.favoritePlaces || "");
  const [subscriptionPlan, setSubscriptionPlan] = useState<"flex_hop" | "power_hop" | null>(null);

  useEffect(() => {
    if (user) {
      setBio((user as any)?.bio || "");
      setLanguage((user as any)?.language || "en");
      setPreferredRoutes((user as any)?.preferredRoutes || "");
      setTravelTime((user as any)?.travelTime || "");
      setFavoritePlaces((user as any)?.favoritePlaces || "");
      const raw = (user as any)?.interests;
      setSelectedInterests(raw ? raw.split(',').filter(Boolean) : []);
    }
  }, [user]);

  const saveProfile = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", "/api/user/profile", {
        bio: bio.trim() || null,
        interests: selectedInterests.join(',') || null,
        language,
        preferredRoutes: preferredRoutes.trim() || null,
        travelTime: travelTime || null,
        favoritePlaces: favoritePlaces.trim() || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/me'] });
      showFlash("✅", "Profile saved!", "success");
    },
    onError: () => showFlash("❌", "Failed to save", "error"),
  });

  const switchTier = useMutation({
    mutationFn: async (subscription: string | null) => {
      await apiRequest("PATCH", "/api/admin/my-tier", { subscription });
    },
    onSuccess: (_data, subscription) => {
      queryClient.invalidateQueries({ queryKey: ['/api/me'] });
      const label = subscription === "power_hop" ? "PowerHop" : subscription === "flex_hop" ? "FlexHop" : "Standard";
      showFlash("✅", `Switched to ${label}`, "success");
    },
    onError: () => showFlash("❌", "Failed to switch tier", "error"),
  });

  const copyReferralCode = async () => {
    if (!user?.referralCode) return;
    try {
      await navigator.clipboard.writeText(user.referralCode);
      setCopied(true);
      showFlash("📋", "Copied!", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showFlash("❌", "Copy failed", "error");
    }
  };

  const shareReferralCode = async () => {
    if (!user?.referralCode) return;
    const shareData = {
      title: "Join ShortHop!",
      text: `Use my referral code "${user.referralCode}" to join ShortHop and we both earn bonus credits! Hop, skip, and a jump away from your next ride.`,
      url: window.location.origin + "/auth?tab=register",
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {}
    } else {
      copyReferralCode();
    }
  };

  const cancelSubscription = useMutation({
    mutationFn: async () => {
      await apiRequest(api.subscription.cancel.method, api.subscription.cancel.path);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.auth.me.path] });
      showFlash("✅", "Subscription cancelled", "info");
    },
    onError: () => {
      showFlash("❌", "Failed to cancel", "error");
    },
  });

  useEffect(() => {
    if (user?.rideVibe) setRideVibe(user.rideVibe);
  }, [user?.rideVibe]);

  useEffect(() => {
    if ("Notification" in window) {
      setBrowserPermission(Notification.permission);
    } else {
      setBrowserPermission("unsupported");
    }
  }, []);

  useEffect(() => {
    savePreferences(prefs);
  }, [prefs]);

  function toggle(key: keyof NotificationPreferences) {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function requestBrowserPermission() {
    if (!("Notification" in window)) {
      showFlash("🚫", "Not supported", "error");
      return;
    }
    const permission = await Notification.requestPermission();
    setBrowserPermission(permission);
    if (permission === "granted") {
      showFlash("🔔", "Notifications enabled!", "success");
    } else if (permission === "denied") {
      showFlash("🚫", "Notifications blocked", "error");
    }
  }

  const updatePreferences = useMutation({
    mutationFn: async (updates: { rideVibe?: string; tier?: string }) => {
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

  const toggleItems: { key: keyof NotificationPreferences; label: string; description: string; icon: typeof Bell }[] = [
    { key: "rideAlerts", label: "Ride Alerts", description: "Get notified when a ride matches your route or a driver is heading your way.", icon: Bell },
    { key: "driverApproachingSound", label: "Driver Approaching Sound", description: "Play an alert sound when your driver enters the corridor zone. Notification always stays on.", icon: Volume2 },
    { key: "routeAlerts", label: "Route Alerts", description: "Receive alerts about your saved routes and schedule changes.", icon: Route },
    { key: "hopperNearbyAlerts", label: "Hopper Nearby Alerts", description: "Know when a hopper is nearby and ready to connect.", icon: Users },
    { key: "busyRouteAlerts", label: "Busy Route Alerts", description: "Get updates when your common routes are especially active.", icon: TrendingUp },
    { key: "communityNotifications", label: "Community Notifications", description: "Stay in the loop with community updates and Short Hop news.", icon: MessageCircle },
    { key: "growthNotifications", label: "Network Growth Updates", description: "Get notified about founder milestones, new members, and network progress.", icon: TrendingUp },
  ];

  return (
    <div className="px-4 pt-4 pb-6 max-w-lg mx-auto">
      <h1 data-testid="text-settings-title" className="text-xl font-display font-bold mb-1">Settings</h1>
      <p className="text-xs text-muted-foreground mb-4">Manage your preferences and notifications.</p>

      <div className="space-y-6">
        {user && (user as any)?.isRoutePioneer && (
          <Card className="border-yellow-400/80 bg-gradient-to-br from-yellow-400/20 to-amber-300/20 dark:from-yellow-500/15 dark:to-amber-500/10" data-testid="card-route-pioneer">
            <CardContent className="py-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center shadow-lg shadow-yellow-400/50">
                <span className="text-2xl">👑</span>
              </div>
              <div>
                <p className="text-sm font-extrabold text-yellow-600 dark:text-yellow-300">Route Pioneer</p>
                <p className="text-xs text-yellow-700 dark:text-yellow-400 font-semibold">Early Rider #{(user as any)?.signupNumber || '?'}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">One of the first 5 riders to join ShortHop</p>
              </div>
            </CardContent>
          </Card>
        )}

        {user && (user as any)?.signupNumber && !(user as any)?.isRoutePioneer && (
          <Card className="border-border/50" data-testid="card-signup-number">
            <CardContent className="py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                <span className="text-sm font-bold text-muted-foreground">#{(user as any)?.signupNumber}</span>
              </div>
              <div>
                <p className="text-xs font-bold">ShortHop Member #{(user as any)?.signupNumber}</p>
                <p className="text-[10px] text-muted-foreground">Thank you for being an early adopter</p>
              </div>
            </CardContent>
          </Card>
        )}

        {user && (
          <Card className="border-green-200/50 dark:border-green-800/40" data-testid="card-your-profile">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-green-500" />
                Your Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs font-bold mb-1.5 block flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-green-500" />
                  Language
                </Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="text-sm" data-testid="select-language">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Español (Spanish)</SelectItem>
                    <SelectItem value="fr">Français (French)</SelectItem>
                    <SelectItem value="zh">中文 (Chinese)</SelectItem>
                    <SelectItem value="ar">العربية (Arabic)</SelectItem>
                    <SelectItem value="hi">हिन्दी (Hindi)</SelectItem>
                    <SelectItem value="pt">Português (Portuguese)</SelectItem>
                    <SelectItem value="ja">日本語 (Japanese)</SelectItem>
                    <SelectItem value="ko">한국어 (Korean)</SelectItem>
                    <SelectItem value="de">Deutsch (German)</SelectItem>
                    <SelectItem value="sw">Kiswahili (Swahili)</SelectItem>
                    <SelectItem value="tl">Tagalog (Filipino)</SelectItem>
                    <SelectItem value="vi">Tiếng Việt (Vietnamese)</SelectItem>
                    <SelectItem value="ru">Русский (Russian)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[9px] text-muted-foreground mt-0.5">Messages you receive will be auto-translated to your language</p>
              </div>
              <div>
                <Label className="text-xs font-bold mb-1.5 block">Bio</Label>
                <Textarea
                  placeholder="Tell people a little about yourself..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={200}
                  className="text-sm resize-none h-20"
                  data-testid="input-bio"
                />
                <p className="text-[9px] text-muted-foreground text-right mt-0.5">{bio.length}/200</p>
              </div>
              <div>
                <Label className="text-xs font-bold mb-1 block">Interests</Label>
                <p className="text-[10px] text-muted-foreground mb-2">Tap to select up to 12 — riders see what you have in common</p>
                <InterestBubbles
                  selected={selectedInterests}
                  onChange={setSelectedInterests}
                  maxSelections={12}
                />
                <p className="text-[9px] text-muted-foreground text-right mt-1">{selectedInterests.length}/12 selected</p>
              </div>
              <div>
                <Label className="text-xs font-bold mb-1.5 block flex items-center gap-1.5">
                  <Route className="w-3.5 h-3.5 text-green-500" />
                  Preferred Routes
                </Label>
                <Input
                  placeholder="e.g. UK Campus to Hamburg, Tates Creek to Downtown..."
                  value={preferredRoutes}
                  onChange={(e) => setPreferredRoutes(e.target.value)}
                  className="text-sm"
                  data-testid="input-preferred-routes"
                />
              </div>
              <div>
                <Label className="text-xs font-bold mb-1.5 block">Travel Time</Label>
                <Select value={travelTime} onValueChange={setTravelTime}>
                  <SelectTrigger className="text-sm" data-testid="select-travel-time">
                    <SelectValue placeholder="When do you usually ride?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">Morning</SelectItem>
                    <SelectItem value="afternoon">Afternoon</SelectItem>
                    <SelectItem value="evening">Evening</SelectItem>
                    <SelectItem value="anytime">Anytime</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-bold mb-1.5 block">Favorite Places in the City</Label>
                <Input
                  placeholder="e.g. Rupp Arena, Summit, The Burl, Keeneland..."
                  value={favoritePlaces}
                  onChange={(e) => setFavoritePlaces(e.target.value)}
                  className="text-sm"
                  data-testid="input-favorite-places"
                />
              </div>
              <Button
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                onClick={() => saveProfile.mutate()}
                disabled={saveProfile.isPending}
                data-testid="button-save-profile"
              >
                {saveProfile.isPending ? "Saving..." : "Save Profile"}
              </Button>
            </CardContent>
          </Card>
        )}

        {user && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Membership
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {user.isAdmin ? (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">Admin: Switch between tiers freely</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: null, label: "Standard", icon: "🚶", desc: "Free tier" },
                      { key: "flex_hop", label: "FlexHop", icon: "🚀", desc: "$10/mo" },
                      { key: "power_hop", label: "PowerHop", icon: "⚡", desc: "$25/mo" },
                    ].map((tier) => {
                      const isActive = (user.subscription || null) === tier.key;
                      return (
                        <button
                          key={tier.label}
                          onClick={() => switchTier.mutate(tier.key)}
                          disabled={switchTier.isPending}
                          className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                            isActive
                              ? 'border-primary bg-primary/10'
                              : 'border-border/50 hover:border-primary/30'
                          }`}
                          data-testid={`button-admin-tier-${tier.label.toLowerCase()}`}
                        >
                          <span className="text-xl">{tier.icon}</span>
                          <span className="text-xs font-bold">{tier.label}</span>
                          <span className="text-[9px] text-muted-foreground">{tier.desc}</span>
                          {isActive && <Badge className="text-[8px] h-4 bg-primary/20 text-primary border-0">Active</Badge>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : user.subscription ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{user.subscription === "power_hop" ? "⚡" : "🚀"}</span>
                      <div>
                        <p className="font-bold text-foreground text-sm" data-testid="text-subscription-plan">
                          {user.subscription === "power_hop" ? "PowerHop" : "FlexHop"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {user.subscription === "power_hop" ? "$25/month" : "$10/month"}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-green-500/10 text-green-600 border-green-500/30">Active</Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    data-testid="button-cancel-subscription"
                    onClick={() => cancelSubscription.mutate()}
                    disabled={cancelSubscription.isPending}
                    className="w-full text-destructive hover:text-destructive"
                  >
                    Cancel Subscription
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/20">
                    <span className="text-xl">🚶</span>
                    <div>
                      <p className="text-sm font-bold text-foreground">Standard</p>
                      <p className="text-xs text-muted-foreground">Free plan — pay per ride</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setSubscriptionPlan("flex_hop")}
                      className="flex flex-col items-center gap-1 p-3 rounded-xl border border-border/50 hover:border-primary/40 transition-all"
                      data-testid="button-upgrade-flex"
                    >
                      <span className="text-lg">🚀</span>
                      <span className="text-xs font-bold">FlexHop</span>
                      <span className="text-[10px] text-muted-foreground">$10/mo</span>
                    </button>
                    <button
                      onClick={() => setSubscriptionPlan("power_hop")}
                      className="flex flex-col items-center gap-1 p-3 rounded-xl border border-border/50 hover:border-orange-400/40 transition-all"
                      data-testid="button-upgrade-power"
                    >
                      <span className="text-lg">⚡</span>
                      <span className="text-xs font-bold">PowerHop</span>
                      <span className="text-[10px] text-muted-foreground">$25/mo</span>
                    </button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {user && user.referralCode && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-secondary" />
                Referral Program
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Share your referral code with friends. When they sign up, you both earn bonus credits!
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex-1 min-w-[200px] bg-muted rounded-xl px-4 py-3 font-mono text-lg text-foreground tracking-wider text-center" data-testid="text-referral-code">
                  {user.referralCode}
                </div>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={copyReferralCode}
                  data-testid="button-copy-referral"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={shareReferralCode}
                  data-testid="button-share-referral"
                >
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>
              {user.referredBy && (
                <p className="text-xs text-muted-foreground">
                  You were referred by code: <span className="font-mono font-medium text-foreground">{user.referredBy}</span>
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {user && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Ride Vibe
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Set your ride vibe so matches know what to expect. This helps prevent awkward social expectations and protects everyone's comfort.
              </p>
              <RideVibeSelector
                value={rideVibe}
                onChange={handleVibeChange}
                disabled={updatePreferences.isPending}
              />
            </CardContent>
          </Card>
        )}

        {user && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Privacy Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground mb-2">
                All social features are optional. You can disable community interactions at any time.
              </p>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <EyeOff className="w-5 h-5 mt-0.5 text-muted-foreground" />
                  <div>
                    <Label htmlFor="toggle-community" className="text-sm font-medium cursor-pointer">Community Features</Label>
                    <p className="text-sm text-muted-foreground mt-0.5">Show your profile in the community and allow follows.</p>
                  </div>
                </div>
                <Switch
                  id="toggle-community"
                  data-testid="switch-community-features"
                  checked={prefs.communityNotifications}
                  onCheckedChange={() => toggle("communityNotifications")}
                />
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Browser Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enable browser notifications to receive real-time alerts even when you're not actively using Short Hop.
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <Button
                data-testid="button-request-browser-notifications"
                onClick={requestBrowserPermission}
                disabled={browserPermission === "granted" || browserPermission === "unsupported"}
              >
                {browserPermission === "granted"
                  ? "Notifications Enabled"
                  : browserPermission === "denied"
                    ? "Notifications Blocked"
                    : browserPermission === "unsupported"
                      ? "Not Supported"
                      : "Enable Browser Notifications"}
              </Button>
              {browserPermission === "granted" && (
                <span data-testid="text-browser-permission-status" className="text-sm text-green-600 dark:text-green-400 font-medium">Active</span>
              )}
              {browserPermission === "denied" && (
                <span data-testid="text-browser-permission-status" className="text-sm text-destructive font-medium">Blocked in browser settings</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200/50 dark:border-green-800/40 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation("/install")} data-testid="card-install-app">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-md shadow-green-500/20">
                <Smartphone className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-extrabold text-foreground">Install ShortHop</p>
                <p className="text-[10px] text-muted-foreground">Add to your home screen for the best experience</p>
              </div>
              <Badge className="text-[9px] bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 border-0">NEW</Badge>
            </div>
          </CardContent>
        </Card>

        {user?.isAdmin && (
          <Card className="border-red-200/50 dark:border-red-800/40 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation("/admin")} data-testid="card-admin-link">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-md shadow-red-500/20">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-extrabold text-foreground">Admin Dashboard</p>
                  <p className="text-[10px] text-muted-foreground">Manage users, reports, and settings</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card data-testid="card-notifications-inbox">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Alerts & Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <NotificationCenter />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notification Preferences
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {toggleItems.map(({ key, label, description, icon: Icon }) => (
                <div key={key} className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <Icon className="w-5 h-5 mt-0.5 text-muted-foreground" />
                    <div>
                      <Label htmlFor={`toggle-${key}`} className="text-sm font-medium cursor-pointer">
                        {label}
                      </Label>
                      <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
                    </div>
                  </div>
                  <Switch
                    id={`toggle-${key}`}
                    data-testid={`switch-${key}`}
                    checked={prefs[key]}
                    onCheckedChange={() => toggle(key)}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <ContactShortHop />
        <ReportIssue />
      </div>

      {subscriptionPlan && user && (
        <SubscriptionModal
          plan={subscriptionPlan}
          user={user}
          open={true}
          onOpenChange={(open) => !open && setSubscriptionPlan(null)}
        />
      )}
    </div>
  );
}

function ContactShortHop() {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("general");

  const sendMsg = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/contact", { subject, message, category });
    },
    onSuccess: () => {
      setOpen(false);
      setSubject("");
      setMessage("");
      showFlash("✅", "Message sent!", "success");
    },
    onError: () => {
      showFlash("❌", "Failed to send", "error");
    },
  });

  return (
    <>
      <Card className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setOpen(true)}>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <Mail className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-bold">Contact ShortHop</p>
            <p className="text-xs text-muted-foreground">Questions, feedback, or support</p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contact ShortHop</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="text-sm" data-testid="select-contact-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General Question</SelectItem>
                <SelectItem value="support">Support</SelectItem>
                <SelectItem value="feedback">Feedback</SelectItem>
                <SelectItem value="bug">Bug Report</SelectItem>
                <SelectItem value="safety">Safety Concern</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Subject"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="text-sm"
              data-testid="input-contact-subject"
            />
            <Textarea
              placeholder="Your message..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={4}
              className="text-sm"
              data-testid="input-contact-message"
            />
            <Button
              className="w-full"
              onClick={() => sendMsg.mutate()}
              disabled={!subject.trim() || !message.trim() || sendMsg.isPending}
              data-testid="button-send-contact"
            >
              Send Message
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ReportIssue() {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("bug");
  const [description, setDescription] = useState("");

  const submitReport = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/report", { category, description });
    },
    onSuccess: () => {
      setOpen(false);
      setDescription("");
      showFlash("✅", "Report submitted", "success");
    },
    onError: () => {
      showFlash("❌", "Failed to submit", "error");
    },
  });

  return (
    <>
      <Card className="cursor-pointer hover:border-red-200 transition-colors" onClick={() => setOpen(true)}>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="text-sm font-bold">Report an Issue</p>
            <p className="text-xs text-muted-foreground">Safety, bugs, or concerns</p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report an Issue</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="text-sm" data-testid="select-report-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unsafe_driver">Unsafe Driver</SelectItem>
                <SelectItem value="harassment">Harassment</SelectItem>
                <SelectItem value="bug">Bug Report</SelectItem>
                <SelectItem value="payment">Payment Issue</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Describe the issue..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={4}
              className="text-sm"
              data-testid="input-report-description"
            />
            <Button
              className="w-full bg-red-500 hover:bg-red-600"
              onClick={() => submitReport.mutate()}
              disabled={!description.trim() || submitReport.isPending}
              data-testid="button-submit-report"
            >
              Submit Report
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
