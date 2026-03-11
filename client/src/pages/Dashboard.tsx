import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import WalkerDashboard from "./WalkerDashboard";
import DriverDashboard from "./DriverDashboard";
import { NearbyHopperAlert } from "@/components/NearbyHopperAlert";
import { useNearbyHopperSimulation } from "@/hooks/use-location";
import { Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { data: user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [viewingAsDriver, setViewingAsDriver] = useState<boolean | null>(null);
  const { toast } = useToast();

  const toggleDriverMode = useMutation({
    mutationFn: async (enable: boolean) => {
      const res = await apiRequest("POST", "/api/toggle-driver-mode", { enable });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
    },
    onError: (error: Error) => {
      setViewingAsDriver(prev => prev === true ? false : prev === false ? true : null);
      toast({
        title: "Cannot switch mode",
        description: error.message || "Flex Hop subscription required for Drive Mode",
        variant: "destructive",
      });
    },
  });

  const effectiveIsDriver = viewingAsDriver ?? !!user?.isDriver;
  const { currentHopper, dismiss } = useNearbyHopperSimulation(effectiveIsDriver);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    setLocation("/auth");
    return null;
  }

  const canDrive = user.isFounder || user.subscription === 'flex_hop' || user.subscription === 'power_hop';

  const handleSwitchToDriver = () => {
    setViewingAsDriver(true);
    toggleDriverMode.mutate(true);
  };

  const handleSwitchToWalker = () => {
    setViewingAsDriver(false);
    toggleDriverMode.mutate(false);
  };

  return (
    <>
      {effectiveIsDriver && (
        <NearbyHopperAlert hopper={currentHopper} onDismiss={dismiss} />
      )}
      {effectiveIsDriver ? (
        <DriverDashboard
          user={user}
          onSwitchToWalker={handleSwitchToWalker}
        />
      ) : (
        <WalkerDashboard
          user={user}
          canDrive={canDrive}
          onSwitchToDriver={canDrive ? handleSwitchToDriver : undefined}
        />
      )}
    </>
  );
}
