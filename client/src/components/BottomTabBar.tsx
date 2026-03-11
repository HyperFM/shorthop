import { useLocation } from "wouter";
import { Home, Trophy, Users, Settings } from "lucide-react";
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
        {user.isAdmin && (
          <button
            onClick={() => setLocation("/admin")}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full"
            data-testid="tab-admin"
          >
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-sm transition-all ${
              location === "/admin"
                ? "bg-red-500 text-white shadow-[0_0_12px_rgba(239,68,68,0.6),0_0_24px_rgba(249,115,22,0.3),0_0_36px_rgba(59,130,246,0.2)]"
                : "bg-red-500/80 text-white/90 shadow-[0_0_8px_rgba(239,68,68,0.4),0_0_16px_rgba(249,115,22,0.2)]"
            }`}>
              A
            </div>
            <span className={`text-[10px] font-medium leading-none ${location === "/admin" ? "text-red-500" : "text-muted-foreground"}`}>Admin</span>
          </button>
        )}
      </div>
    </nav>
  );
}
