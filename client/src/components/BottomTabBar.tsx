import { useLocation } from "wouter";
import { Home, Compass, Trophy, Users, Settings } from "lucide-react";
import { NotificationCenter } from "@/components/NotificationCenter";
import { useAuth } from "@/hooks/use-auth";

const tabs = [
  { path: "/dashboard", icon: Home, label: "Home" },
  { path: "/community", icon: Users, label: "Community" },
  { path: "/leaderboard", icon: Trophy, label: "Board" },
  { path: "/settings", icon: Settings, label: "Settings" },
];

export function BottomTabBar() {
  const [location, setLocation] = useLocation();
  const { data: user } = useAuth();

  if (!user) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border/50 safe-area-bottom"
      data-testid="bottom-tab-bar"
    >
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto px-2">
        {tabs.map((tab) => {
          const isActive = location === tab.path || (tab.path === "/dashboard" && location === "/");
          const Icon = tab.icon;
          return (
            <button
              key={tab.path}
              onClick={() => setLocation(tab.path)}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
              data-testid={`tab-${tab.label.toLowerCase()}`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : ""}`} />
              <span className="text-[10px] font-medium leading-none">{tab.label}</span>
            </button>
          );
        })}
        <div className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full">
          <NotificationCenter />
          <span className="text-[10px] font-medium leading-none text-muted-foreground">Alerts</span>
        </div>
      </div>
    </nav>
  );
}
