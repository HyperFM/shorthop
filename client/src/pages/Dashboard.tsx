import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import WalkerDashboard from "./WalkerDashboard";
import DriverDashboard from "./DriverDashboard";
import { Loader2 } from "lucide-react";

export default function Dashboard() {
  const { data: user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

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

  if (user.isDriver) {
    return <DriverDashboard user={user} />;
  }

  return <WalkerDashboard user={user} />;
}
