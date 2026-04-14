import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Car, User, MapPin, Clock, Navigation } from "lucide-react";

interface LiveRideOverlayProps {
  driverName: string;
  destination: string;
  startLocation: string;
  rideStartedAt?: string | null;
  distanceMiles?: string | null;
}

export function LiveRideOverlay({ driverName, destination, startLocation, rideStartedAt, distanceMiles }: LiveRideOverlayProps) {
  const [elapsed, setElapsed] = useState(0);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    const start = rideStartedAt ? new Date(rideStartedAt).getTime() : Date.now();
    timerRef.current = setInterval(() => {
      const secs = Math.floor((Date.now() - start) / 1000);
      setElapsed(secs);
      const totalDist = parseFloat(distanceMiles || "2");
      const estimatedSeconds = totalDist * 120;
      setProgress(Math.min(0.95, secs / estimatedSeconds));
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [rideStartedAt, distanceMiles]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      data-testid="card-live-ride"
    >
      <Card className="border-green-500/40 bg-green-500/5 overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-semibold text-green-400">Ride In Progress</span>
            </div>
            <Badge variant="outline" className="border-green-500/50 text-green-400 text-xs">
              <Clock className="w-3 h-3 mr-1" />
              {minutes}:{String(seconds).padStart(2, '0')}
            </Badge>
          </div>

          <div className="relative mb-3">
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>

            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-1.5">
                <motion.div
                  className="relative"
                  style={{ left: `${progress * 100}%` }}
                >
                  <div className="flex items-center gap-0.5">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/50 flex items-center justify-center">
                      <User className="w-3 h-3 text-blue-400" />
                    </div>
                    <div className="w-4 h-0.5 bg-green-500/50" />
                    <div className="w-6 h-6 rounded-lg bg-green-500/20 border border-green-500/50 flex items-center justify-center">
                      <Car className="w-3 h-3 text-green-400" />
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Navigation className="w-3 h-3 text-green-400" />
              <span>Riding with <span className="font-medium text-foreground">{driverName}</span></span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span className="truncate max-w-[120px]">{destination}</span>
            </div>
          </div>

          <div className="mt-2 px-2 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200/30 dark:border-blue-700/20">
            <p className="text-[10px] text-blue-700 dark:text-blue-400 font-medium" data-testid="text-dropoff-message">
              Your driver will take you as close as possible along their route
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
