import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Route, Users, TrendingUp, MessageCircle, Globe, Sparkles, Shield, Eye, EyeOff, Gift, Copy, Share2, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { api } from "@shared/routes";
import { RideVibeSelector } from "@/components/RideVibeSelector";

const STORAGE_KEY = "shorthop-notification-preferences";

interface NotificationPreferences {
  rideAlerts: boolean;
  routeAlerts: boolean;
  hopperNearbyAlerts: boolean;
  busyRouteAlerts: boolean;
  communityNotifications: boolean;
  growthNotifications: boolean;
}

const defaultPreferences: NotificationPreferences = {
  rideAlerts: true,
  routeAlerts: true,
  hopperNearbyAlerts: true,
  busyRouteAlerts: false,
  communityNotifications: true,
  growthNotifications: true,
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
  const [prefs, setPrefs] = useState<NotificationPreferences>(loadPreferences);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission | "unsupported">("default");
  const [rideVibe, setRideVibe] = useState(user?.rideVibe || "friendly_chat");
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const copyReferralCode = async () => {
    if (!user?.referralCode) return;
    try {
      await navigator.clipboard.writeText(user.referralCode);
      setCopied(true);
      toast({ title: "Copied!", description: "Referral code copied to clipboard." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Copy failed", description: "Could not copy to clipboard.", variant: "destructive" });
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
      toast({ title: "Subscription cancelled", description: "You're back on the free Short Hop plan." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to cancel subscription.", variant: "destructive" });
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
      toast({ title: "Not Supported", description: "Browser notifications are not supported in this browser.", variant: "destructive" });
      return;
    }
    const permission = await Notification.requestPermission();
    setBrowserPermission(permission);
    if (permission === "granted") {
      toast({ title: "Notifications Enabled", description: "You'll now receive browser notifications from Short Hop." });
    } else if (permission === "denied") {
      toast({ title: "Notifications Blocked", description: "Browser notifications were blocked. You can change this in your browser settings.", variant: "destructive" });
    }
  }

  const updatePreferences = useMutation({
    mutationFn: async (updates: { rideVibe?: string; tier?: string }) => {
      const res = await apiRequest(api.profile.updatePreferences.method, api.profile.updatePreferences.path, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.auth.me.path] });
      toast({ title: "Preferences updated", description: "Your profile has been saved." });
    },
  });

  const handleVibeChange = (value: string) => {
    setRideVibe(value);
    updatePreferences.mutate({ rideVibe: value });
  };

  const handleTierToggle = () => {
    const newTier = user?.tier === "flexhop" ? "standard" : "flexhop";
    updatePreferences.mutate({ tier: newTier });
  };

  const toggleItems: { key: keyof NotificationPreferences; label: string; description: string; icon: typeof Bell }[] = [
    { key: "rideAlerts", label: "Ride Alerts", description: "Get notified when a ride matches your route or a driver is heading your way.", icon: Bell },
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
        {user && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-secondary" />
                Membership Tier
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground flex items-center gap-2">
                    {user.tier === "flexhop" ? "FlexHop" : "Standard ShortHop"}
                    {user.tier === "flexhop" && (
                      <Badge className="bg-secondary text-secondary-foreground text-[10px]">Premium</Badge>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {user.tier === "flexhop"
                      ? "Full community access: post stories, follow hoppers, message connections."
                      : "Core ride features. Upgrade to FlexHop for community access."}
                  </p>
                </div>
              </div>
              <Button
                data-testid="button-toggle-tier"
                variant={user.tier === "flexhop" ? "outline" : "default"}
                onClick={handleTierToggle}
                disabled={updatePreferences.isPending}
                className="w-full"
              >
                {user.tier === "flexhop" ? "Switch to Standard" : "Upgrade to FlexHop"}
              </Button>
            </CardContent>
          </Card>
        )}

        {user && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Subscription Plan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {user.subscription ? (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-foreground" data-testid="text-subscription-plan">
                        {user.subscription === "power_hop" ? "Power Hop" : "Flex Hop"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {user.subscription === "power_hop" ? "$15/month — Unlimited rides" : "$5/month — Dynamic pricing"}
                      </p>
                    </div>
                    <Badge className="bg-green-500/10 text-green-600 border-green-500/30">Active</Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    data-testid="button-cancel-subscription"
                    onClick={() => {
                      cancelSubscription.mutate();
                    }}
                    disabled={cancelSubscription.isPending}
                    className="text-destructive hover:text-destructive"
                  >
                    Cancel Subscription
                  </Button>
                </>
              ) : (
                <div className="text-center py-2">
                  <p className="text-sm text-muted-foreground mb-2">
                    You're on the free Short Hop plan. Upgrade to Flex Hop or Power Hop for more options.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Choose a plan when requesting a ride from the dashboard.
                  </p>
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
      </div>
    </div>
  );
}
