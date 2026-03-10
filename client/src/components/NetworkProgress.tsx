import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@shared/routes";
import { motion } from "framer-motion";

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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <Card data-testid="card-network-progress" className="game-card border-primary/20 overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/10 to-transparent rounded-bl-full pointer-events-none" />
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <motion.span
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="text-xl"
            >
              🎯
            </motion.span>
            Lexington ShortHop Network
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="text-center p-3 rounded-2xl bg-gradient-to-b from-secondary/10 to-secondary/5 border border-secondary/20"
            >
              <span className="text-2xl block mb-1">🚗</span>
              <p className="text-2xl font-black text-foreground" data-testid="text-driver-count">{stats.totalDrivers}</p>
              <p className="text-[11px] text-muted-foreground font-bold uppercase">Drivers</p>
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="text-center p-3 rounded-2xl bg-gradient-to-b from-primary/10 to-primary/5 border border-primary/20"
            >
              <span className="text-2xl block mb-1">🏃</span>
              <p className="text-2xl font-black text-foreground" data-testid="text-hopper-count">{stats.totalHoppers}</p>
              <p className="text-[11px] text-muted-foreground font-bold uppercase">Hoppers</p>
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="text-center p-3 rounded-2xl bg-gradient-to-b from-accent/10 to-accent/5 border border-accent/20"
            >
              <span className="text-2xl block mb-1">✨</span>
              <p className="text-2xl font-black text-foreground" data-testid="text-total-count">{stats.totalUsers}</p>
              <p className="text-[11px] text-muted-foreground font-bold uppercase">Total</p>
            </motion.div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Level Progress</span>
              <span className="font-bold text-foreground flex items-center gap-1">
                🎮 Next: {stats.nextMilestone.toLocaleString()} users
              </span>
            </div>
            <div className="xp-bar">
              <motion.div 
                className="xp-bar-fill"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
              />
            </div>
          </div>

          {(stats.foundingHoppersRemaining > 0 || stats.foundingDriversRemaining > 0) && (
            <div className="flex flex-wrap gap-2 pt-1">
              {stats.foundingHoppersRemaining > 0 && (
                <motion.div whileHover={{ scale: 1.05 }}>
                  <Badge variant="outline" className="text-[10px] bg-primary/5 border-primary/20 gap-1" data-testid="badge-founding-hoppers">
                    🛞 {stats.foundingHoppersRemaining} Founding Hopper spots left!
                  </Badge>
                </motion.div>
              )}
              {stats.foundingDriversRemaining > 0 && (
                <motion.div whileHover={{ scale: 1.05 }}>
                  <Badge variant="outline" className="text-[10px] bg-secondary/5 border-secondary/20 gap-1" data-testid="badge-founding-drivers">
                    🛞 {stats.foundingDriversRemaining} Founding Driver spots left!
                  </Badge>
                </motion.div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
