import { useState } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { FlashNotificationContainer } from "@/components/FlashNotification";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { NavBar } from "@/components/NavBar";
import { BottomTabBar } from "@/components/BottomTabBar";
import { SplashScreen } from "@/components/SplashScreen";
import { useAuth } from "@/hooks/use-auth";

import Home from "@/pages/Home";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import RewardStore from "@/pages/RewardStore";
import Privacy from "@/pages/Privacy";
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
    <div
      className="fixed inset-0 pointer-events-none z-[200]"
      style={{
        boxShadow: "inset 0 0 0 2.5px rgba(249,115,22,0.55), inset 0 0 28px rgba(249,115,22,0.12)",
      }}
    />
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

function AppInner() {
  const [location] = useLocation();
  const isHopPage = location === "/instahop" || location === "/hop";

  return (
    <>
      <OrangeGlow />
      <Toaster />
      <FlashNotificationContainer />
      <NavBar />
      <main className={isHopPage ? "" : "min-h-screen pb-32"}>
        <Router />
      </main>
      <BottomTabBar />
    </>
  );
}

function App() {
  const [splashDone, setSplashDone] = useState(false);

  if (!splashDone) {
    return <SplashScreen onComplete={() => setSplashDone(true)} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppInner />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
