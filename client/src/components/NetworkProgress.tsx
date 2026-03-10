import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, CarFront, Footprints, Target } from "lucide-react";
import { api } from "@shared/routes";

interface NetworkStats {
  totalUsers: number;
  totalDrivers: number;
  totalHoppers: number;
  nextMilestone: number;
  foundingHoppersRemaining: number;
  foundingDriversRemaining: number;
}

export function NetworkProgress() {
  const { data: stats, isLoading } = useQuery<NetworkStats>({
    queryKey: [api.network.stats.path],
    queryFn: async () => {
      const res = await fetch(api.network.stats.path);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    staleTime: 60000,
  });

  if (isLoading || !stats) return null;

  const progress = Math.min(100, (stats.totalUsers / stats.nextMilestone) * 100);

  return (
    <Card data-testid="card-network-progress">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="w-4 h-4 text-primary" />
          Lexington ShortHop Network
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <CarFront className="w-5 h-5 mx-auto text-secondary mb-1" />
            <p className="text-xl font-bold text-foreground" data-testid="text-driver-count">{stats.totalDrivers}</p>
            <p className="text-[11px] text-muted-foreground font-medium uppercase">Drivers</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <Footprints className="w-5 h-5 mx-auto text-primary mb-1" />
            <p className="text-xl font-bold text-foreground" data-testid="text-hopper-count">{stats.totalHoppers}</p>
            <p className="text-[11px] text-muted-foreground font-medium uppercase">Hoppers</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-primary/5 border border-primary/10">
            <Users className="w-5 h-5 mx-auto text-primary mb-1" />
            <p className="text-xl font-bold text-foreground" data-testid="text-total-count">{stats.totalUsers}</p>
            <p className="text-[11px] text-muted-foreground font-medium uppercase">Total</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium text-foreground">
              Next milestone: {stats.nextMilestone.toLocaleString()} users
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {(stats.foundingHoppersRemaining > 0 || stats.foundingDriversRemaining > 0) && (
          <div className="flex flex-wrap gap-2 pt-1">
            {stats.foundingHoppersRemaining > 0 && (
              <Badge variant="outline" className="text-[10px]" data-testid="badge-founding-hoppers">
                🛞 {stats.foundingHoppersRemaining} Founding Hopper spots left
              </Badge>
            )}
            {stats.foundingDriversRemaining > 0 && (
              <Badge variant="outline" className="text-[10px]" data-testid="badge-founding-drivers">
                🛞 {stats.foundingDriversRemaining} Founding Driver spots left
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
