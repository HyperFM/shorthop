import { useLocation } from "wouter";
import { Calendar, Zap, Activity, User } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import { useState } from "react";

function BowTieIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M2 8 L10 12 L2 16 Z" />
      <path d="M22 8 L14 12 L22 16 Z" />
      <rect x="10" y="11" width="4" height="2" rx="1" />
    </svg>
  );
}

const tabs = [
  { path: "/settings", icon: User, label: "Profile" },
  { path: "/schedule", icon: Calendar, label: "Schedule" },
  { path: "/instahop", icon: Zap, label: "InstaHop", isHop: true },
  { path: "/community", icon: Activity, label: "Network" },
  { path: "/dashboard", customIcon: BowTieIcon, label: "Tailor" },
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
      <div className="h-px bg-gradient-to-r from-orange-500/40 via-orange-400/60 to-orange-500/40" />
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {tabs.map((tab) => {
          const isActive =
            location === tab.path ||
            (tab.path === "/instahop" && location === "/hop") ||
            (tab.path === "/settings" && location === "/profile");
          const isProfile = tab.label === "Profile";
          const showAdminDot = isProfile && user.isAdmin;
          const Icon = (tab as any).icon as typeof User | undefined;
          const CustomIcon = (tab as any).customIcon as typeof BowTieIcon | undefined;

          if ((tab as any).isHop) {
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
                data-testid="tab-instahop"
              >
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg shadow-green-500/25 -mt-3">
                  <Zap className="w-5 h-5 text-white stroke-[2.5]" />
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
                isActive ? "text-orange-500" : "text-muted-foreground"
              }`}
              data-testid={`tab-${tab.label.toLowerCase()}`}
            >
              {CustomIcon ? (
                <CustomIcon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : ""}`} />
              ) : Icon ? (
                <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : ""}`} />
              ) : null}
              <span className={`text-[10px] font-medium leading-none ${isActive ? "font-bold" : ""}`}>{tab.label}</span>
              {isActive && (
                <motion.div
                  layoutId="tabIndicator"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-orange-500"
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
