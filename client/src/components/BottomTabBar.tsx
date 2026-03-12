import { useLocation } from "wouter";
import { Home, Calendar, Zap, Activity, User } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import { useState } from "react";

const tabs = [
  { path: "/dashboard", icon: Home, label: "Home" },
  { path: "/schedule", icon: Calendar, label: "Schedule" },
  { path: "/instahop", icon: Zap, label: "InstaHop", isHop: true },
  { path: "/community", icon: Activity, label: "Network" },
  { path: "/settings", icon: User, label: "Profile" },
];

export function BottomTabBar() {
  const [location, setLocation] = useLocation();
  const { data: user } = useAuth();
  const [hopBounce, setHopBounce] = useState(false);

  if (!user) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg safe-area-bottom"
      data-testid="bottom-tab-bar"
    >
      <div className="h-px bg-gradient-to-r from-blue-500/20 via-green-500/30 to-orange-500/20" />
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {tabs.map((tab) => {
          const isActive = location === tab.path || (tab.path === "/dashboard" && location === "/") || (tab.path === "/instahop" && location === "/hop");
          const isProfile = tab.label === "Profile";
          const showAdminDot = isProfile && user.isAdmin;
          const Icon = tab.icon;

          if (tab.isHop) {
            return (
              <motion.button
                key={tab.path}
                onClick={() => {
                  setHopBounce(true);
                  setTimeout(() => setHopBounce(false), 400);
                  setLocation("/instahop");
                }}
                animate={hopBounce ? { scale: [1, 1.2, 0.95, 1.05, 1] } : {}}
                transition={{ duration: 0.4 }}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative"
                data-testid="tab-hop"
              >
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg shadow-green-500/25 -mt-3">
                  <Icon className="w-5 h-5 text-white stroke-[2.5]" />
                </div>
                <span className="text-[10px] font-bold leading-none text-green-600 dark:text-green-400">InstaHop</span>
              </motion.button>
            );
          }

          return (
            <button
              key={tab.path}
              onClick={() => setLocation(tab.path)}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors relative ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
              data-testid={`tab-${tab.label.toLowerCase()}`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : ""}`} />
              <span className={`text-[10px] font-medium leading-none ${isActive ? "font-bold" : ""}`}>{tab.label}</span>
              {isActive && (
                <motion.div
                  layoutId="tabIndicator"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              {showAdminDot && (
                <div className="absolute top-2 right-[calc(50%-14px)] w-2 h-2 rounded-full bg-red-500" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
