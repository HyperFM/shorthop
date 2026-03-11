import { useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { FlashNotificationContainer } from "@/components/FlashNotification";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import { NavBar } from "@/components/NavBar";
import { BottomTabBar } from "@/components/BottomTabBar";

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
      <Route component={NotFound} />
    </Switch>
  );
}

function FeedbackToggle() {
  const { data: user } = useAuth();
  useEffect(() => {
    if (user) {
      document.body.classList.add("hide-feedback");
    } else {
      document.body.classList.remove("hide-feedback");
    }
  }, [user]);
  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <FeedbackToggle />
        <Toaster />
        <FlashNotificationContainer />
        <NavBar />
        <main className="min-h-screen pb-16">
          <Router />
        </main>
        <BottomTabBar />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
