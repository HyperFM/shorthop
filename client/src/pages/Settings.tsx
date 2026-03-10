import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Bell, Route, Users, TrendingUp, MessageCircle, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STORAGE_KEY = "shorthop-notification-preferences";

interface NotificationPreferences {
  rideAlerts: boolean;
  routeAlerts: boolean;
  hopperNearbyAlerts: boolean;
  busyRouteAlerts: boolean;
  communityNotifications: boolean;
}

const defaultPreferences: NotificationPreferences = {
  rideAlerts: true,
  routeAlerts: true,
  hopperNearbyAlerts: true,
  busyRouteAlerts: false,
  communityNotifications: true,
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
  const [prefs, setPrefs] = useState<NotificationPreferences>(loadPreferences);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission | "unsupported">("default");
  const { toast } = useToast();

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

  const toggleItems: { key: keyof NotificationPreferences; label: string; description: string; icon: typeof Bell }[] = [
    { key: "rideAlerts", label: "Ride Alerts", description: "Get notified when a ride matches your route or a driver is heading your way.", icon: Bell },
    { key: "routeAlerts", label: "Route Alerts", description: "Receive alerts about your saved routes and schedule changes.", icon: Route },
    { key: "hopperNearbyAlerts", label: "Hopper Nearby Alerts", description: "Know when a hopper is nearby and ready to connect.", icon: Users },
    { key: "busyRouteAlerts", label: "Busy Route Alerts", description: "Get updates when your common routes are especially active.", icon: TrendingUp },
    { key: "communityNotifications", label: "Community Notifications", description: "Stay in the loop with community updates and Short Hop news.", icon: MessageCircle },
  ];

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <h1 data-testid="text-settings-title" className="text-4xl font-display font-bold mb-2">Settings</h1>
      <p className="text-muted-foreground mb-8">Manage your notification preferences and permissions.</p>

      <div className="space-y-6">
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
