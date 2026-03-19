import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { FlashNotificationContainer } from "@/components/FlashNotification";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { NavBar } from "@/components/NavBar";
import { BottomTabBar } from "@/components/BottomTabBar";
import { SplashScreen } from "@/components/SplashScreen";

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
    __dismissPreloader?: () => void;
  }
}

function App() {
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    try {
      const count = parseInt(localStorage.getItem('sh_app_open_count') || '0', 10);
      localStorage.setItem('sh_app_open_count', String(count + 1));
    } catch {}
  }, []);

  if (!splashDone) {
    return <SplashScreen onComplete={() => setSplashDone(true)} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <OrangeGlow />
        <Toaster />
        <FlashNotificationContainer />
        <NavBar />
        <main className="min-h-screen pb-32">
          <Router />
        </main>
        <BottomTabBar />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
