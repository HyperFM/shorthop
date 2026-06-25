import { useEffect, useState, useRef } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { FlashNotificationContainer } from "@/components/FlashNotification";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import NotFound from "@/pages/not-found";
import { NavBar } from "@/components/NavBar";
import { BottomTabBar } from "@/components/BottomTabBar";
import Home from "@/pages/Home";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import RewardStore from "@/pages/RewardStore";
import Privacy from "@/pages/Privacy";
import TermsOfService from "@/pages/TermsOfService";
import Support from "@/pages/Support";
import Settings from "@/pages/Settings";
import Community from "@/pages/Community";
import Leaderboard from "@/pages/Leaderboard";
import Artist from "@/pages/Artist";
import DriverOnboarding from "@/pages/DriverOnboarding";
import Admin from "@/pages/Admin";
import Widget from "@/pages/Widget";
import InstallApp from "@/pages/InstallApp";
import SchedulePage from "@/pages/Schedule";
import InstaHop from "@/pages/InstaHop";
import { apiRequest } from "@/lib/queryClient";
import type { Notification } from "@shared/schema";
import shorthopIcon from "@assets/48110E6E-F081-4980-81F1-2C04E89CDE95_1781997457548.png";

function OrangeGlow() {
  return (
    <>
      <style>{`
        @keyframes glowPulse {
          0%, 100% { opacity: 0.5; transform: translateX(0); }
          30% { opacity: 0.8; transform: translateX(2px); }
          70% { opacity: 0.6; transform: translateX(-1px); }
        }
        @keyframes glowPulseRight {
          0%, 100% { opacity: 0.5; transform: translateX(0); }
          30% { opacity: 0.8; transform: translateX(-2px); }
          70% { opacity: 0.6; transform: translateX(1px); }
        }
      `}</style>
      <div
        className="fixed top-0 left-0 w-[2px] bottom-0 pointer-events-none z-[200]"
        style={{
          background: "linear-gradient(to bottom, transparent 0%, rgba(249,115,22,0.3) 15%, rgba(249,115,22,0.6) 50%, rgba(249,115,22,0.3) 85%, transparent 100%)",
        }}
      />
      <div
        className="fixed top-0 left-0 w-[18px] bottom-0 pointer-events-none z-[199]"
        style={{
          background: "linear-gradient(to right, rgba(249,115,22,0.12), transparent)",
          animation: "glowPulse 4s ease-in-out infinite",
        }}
      />
      <div
        className="fixed top-0 right-0 w-[2px] bottom-0 pointer-events-none z-[200]"
        style={{
          background: "linear-gradient(to bottom, transparent 0%, rgba(249,115,22,0.3) 15%, rgba(249,115,22,0.6) 50%, rgba(249,115,22,0.3) 85%, transparent 100%)",
        }}
      />
      <div
        className="fixed top-0 right-0 w-[18px] bottom-0 pointer-events-none z-[199]"
        style={{
          background: "linear-gradient(to left, rgba(249,115,22,0.12), transparent)",
          animation: "glowPulseRight 4s ease-in-out infinite",
        }}
      />
    </>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/auth" component={Auth} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/rewards" component={RewardStore} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={TermsOfService} />
      <Route path="/support" component={Support} />
      <Route path="/settings" component={Settings} />
      <Route path="/community" component={Community} />
      <Route path="/leaderboard" component={Leaderboard} />
      <Route path="/artist" component={Artist} />
      <Route path="/driver-onboarding" component={DriverOnboarding} />
      <Route path="/admin" component={Admin} />
      <Route path="/widget" component={Widget} />
      <Route path="/install" component={InstallApp} />
      <Route path="/schedule" component={SchedulePage} />
      <Route path="/instahop" component={InstaHop} />
      <Route path="/hop" component={InstaHop} />
      <Route component={NotFound} />
    </Switch>
  );
}

declare global {
  interface Window {
    __splashReady?: () => void;
  }
}

function AppStartRedirect() {
  const [, setLocation] = useLocation();
  const [location] = useLocation();

  useEffect(() => {
    const alreadyRedirected = sessionStorage.getItem("sh_session_start");
    if (!alreadyRedirected) {
      sessionStorage.setItem("sh_session_start", "1");
      if (location !== "/" && location !== "/auth" && location !== "/instahop" && location !== "/hop" && location !== "/privacy" && location !== "/terms" && location !== "/support" && location !== "/artist" && location !== "/widget" && location !== "/install" && !location.startsWith("/auth")) {
        setLocation("/instahop");
      }
    }
  }, []);

  return null;
}

function AdminNotificationOverlay() {
  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications", { credentials: "include" });
      if (res.status === 401) return [];
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 15000,
    staleTime: 5000,
  });

  const qc = useQueryClient();
  const [visible, setVisible] = useState<Notification | null>(null);
  const shownIdsRef = useRef<Set<number>>(new Set());
  const [adminPhoto, setAdminPhoto] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/photo", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.profilePhoto) setAdminPhoto(data.profilePhoto); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const unread = notifications.filter(
      n => !n.isRead && n.type === "admin_broadcast" && !shownIdsRef.current.has(n.id)
    );
    if (unread.length > 0 && !visible) {
      const newest = unread[0];
      shownIdsRef.current.add(newest.id);
      setVisible(newest);
    }
  }, [notifications, visible]);

  const dismiss = async () => {
    if (visible) {
      try {
        await apiRequest("POST", `/api/notifications/${visible.id}/read`);
        qc.invalidateQueries({ queryKey: ["/api/notifications"] });
      } catch {}
    }
    setVisible(null);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-6" data-testid="admin-notification-overlay">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={dismiss} />

      <style>{`
        @keyframes adminCardEnter { 0% { opacity: 0; transform: scale(0.8) translateY(20px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes sparkle { 0%,100% { opacity: 0; transform: scale(0); } 50% { opacity: 1; transform: scale(1); } }
        @keyframes ringPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(59,130,246,0.4), 0 0 20px rgba(59,130,246,0.2); } 50% { box-shadow: 0 0 0 6px rgba(59,130,246,0), 0 0 30px rgba(59,130,246,0.3); } }
      `}</style>

      <div
        className="relative max-w-sm w-full rounded-3xl overflow-visible"
        style={{ animation: "adminCardEnter 0.4s ease-out forwards" }}
        data-testid="admin-notification-card"
      >
        {[
          { top: "-6px", left: "10%", delay: "0s", size: "8px" },
          { top: "-8px", right: "15%", delay: "0.3s", size: "6px" },
          { top: "20%", left: "-8px", delay: "0.6s", size: "7px" },
          { top: "15%", right: "-6px", delay: "0.9s", size: "5px" },
          { bottom: "-5px", left: "25%", delay: "0.2s", size: "6px" },
          { bottom: "-7px", right: "20%", delay: "0.5s", size: "8px" },
          { top: "50%", left: "-10px", delay: "0.8s", size: "5px" },
          { top: "40%", right: "-8px", delay: "1.1s", size: "7px" },
        ].map((s, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-blue-400"
            style={{
              ...s,
              width: s.size,
              height: s.size,
              animation: `sparkle 2s ease-in-out ${s.delay} infinite`,
              zIndex: 10,
            }}
          />
        ))}

        <div
          className="rounded-3xl p-[3px]"
          style={{
            background: "linear-gradient(135deg, #3b82f6, #60a5fa, #3b82f6, #93c5fd)",
            animation: "ringPulse 2.5s ease-in-out infinite",
          }}
        >
          <div className="bg-gradient-to-br from-orange-500 via-orange-500 to-orange-600 rounded-[21px] px-5 py-6">
            <div className="flex flex-col items-center text-center gap-3">
              {adminPhoto && (
                <div className="w-16 h-16 rounded-full border-[3px] border-white/80 overflow-hidden shadow-lg shadow-orange-700/30">
                  <img src={adminPhoto} alt="ShortHop" className="w-full h-full object-cover" />
                </div>
              )}

              <div className="max-h-[50vh] overflow-y-auto w-full">
                <p className="text-white font-black text-base leading-tight">
                  {visible.title}
                </p>
                <p className="text-white/85 text-sm mt-2 leading-relaxed font-medium whitespace-pre-wrap break-words">
                  {visible.message}
                </p>
              </div>

              <button
                onClick={dismiss}
                className="mt-2 px-6 py-2.5 bg-white/20 hover:bg-white/30 border border-white/30 text-white font-bold text-sm rounded-full transition-all active:scale-95"
                data-testid="button-dismiss-admin-notification"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AppStoreBanner() {
  const isInApp = /ShortHop-iOS/g.test(navigator.userAgent);
  if (isInApp) return null;

  function openAppStore() {
    const ua = navigator.userAgent;
    if (/(iPad|iPhone|iPod)/g.test(ua)) {
      window.location.href = "https://apps.apple.com/search?term=shorthop%20app";
    } else if (/Windows Phone|Windows Mobile/g.test(ua)) {
      window.location.href = "https://www.microsoft.com/search/shop?q=shorthop+app";
    } else if (/Huawei|HMS|HONOR/g.test(ua)) {
      window.location.href = "https://appgallery.huawei.com/search?keyword=shorthop";
    } else if (/Android/g.test(ua)) {
      window.location.href = "https://play.google.com/store/search?q=shorthop+app&c=apps";
    } else {
      window.location.href = "https://www.google.com/search?q=shorthop+app";
    }
  }

  return (
    <>
      {/* Floating icon — bigger with glow + sparkles */}
      <button
        onClick={openAppStore}
        className="fixed bottom-16 left-3 z-50 cursor-pointer"
        style={{ background: "none", border: "none", padding: 0, width: 56, height: 56, filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.5))" }}
        data-testid="app-store-icon"
      >
        <img
          src={shorthopIcon}
          alt="Get ShortHop"
          className="w-14 h-14"
          style={{ objectFit: "cover", borderRadius: 12, filter: "drop-shadow(0 0 10px rgba(249,115,22,0.6)) drop-shadow(0 0 20px rgba(249,115,22,0.3))" }}
        />
        <span className="absolute -top-1 -left-2 text-sm animate-pulse" style={{ animationDuration: "1.8s", textShadow: "0 0 4px rgba(249,115,22,1), 0 0 8px rgba(249,115,22,0.9)" }}>✨</span>
        <span className="absolute -bottom-1 -right-2 text-base animate-pulse" style={{ animationDuration: "2.3s", animationDelay: "0.6s", textShadow: "0 0 4px rgba(249,115,22,1), 0 0 8px rgba(249,115,22,0.9)" }}>✨</span>
        <span className="absolute top-2 -right-3 text-xs animate-pulse" style={{ animationDuration: "1.5s", animationDelay: "1.2s", textShadow: "0 0 4px rgba(249,115,22,1), 0 0 8px rgba(249,115,22,0.9)" }}>✨</span>
      </button>
    </>
  );
}

function App() {
  useEffect(() => {
    try {
      const count = parseInt(localStorage.getItem('sh_app_open_count') || '0', 10);
      localStorage.setItem('sh_app_open_count', String(count + 1));
    } catch {}

    const splash = document.getElementById('sh-splash');
    if (splash) {
      splash.classList.add('fade-out');
      setTimeout(() => { try { splash.remove(); } catch {} }, 600);
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AppStartRedirect />
          <OrangeGlow />
          <Toaster />
          <FlashNotificationContainer />
          <AdminNotificationOverlay />
          <NavBar />
          <main className="min-h-screen pb-32">
            <Router />
          </main>
          <AppStoreBanner />
          <BottomTabBar />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
