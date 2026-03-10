import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import type { PickupSpot } from "@/hooks/use-location";
import hopperImg from "@assets/660BFE19-0B0D-4EAF-80FF-0BDCB97F3624_1773147645721.png";

interface PickupMapVisualProps {
  spots: PickupSpot[];
  hasLocation: boolean;
}

export function PickupMapVisual({ spots, hasLocation }: PickupMapVisualProps) {
  return (
    <div className="space-y-4">
      <div className="relative w-full h-48 sm:h-56 rounded-2xl overflow-hidden bg-gradient-to-b from-sky-300 via-sky-200 to-green-200 dark:from-sky-800 dark:via-sky-900 dark:to-green-900">
        <div className="absolute top-3 right-6 w-10 h-10">
          <div className="w-8 h-8 rounded-full bg-yellow-300 shadow-lg shadow-yellow-300/50" />
          <div className="absolute top-1 right-0 w-3 h-2 rounded-full bg-white/80" />
        </div>

        <div className="absolute top-6 left-8 flex gap-4">
          <div className="w-12 h-6 rounded-full bg-white/60 dark:bg-white/20" />
          <div className="w-8 h-4 rounded-full bg-white/40 dark:bg-white/15 mt-1" />
        </div>

        <svg className="absolute bottom-0 left-0 w-full h-32" viewBox="0 0 400 130" preserveAspectRatio="none">
          <path d="M0,80 Q100,40 200,70 Q300,100 400,50 L400,130 L0,130 Z" fill="hsl(142, 40%, 45%)" opacity="0.3" />
          <path d="M0,100 Q80,70 160,90 Q240,110 320,80 Q360,70 400,85 L400,130 L0,130 Z" fill="hsl(142, 40%, 40%)" opacity="0.4" />
        </svg>

        <svg className="absolute bottom-4 left-0 w-full h-24" viewBox="0 0 400 100" preserveAspectRatio="none">
          <path d="M-20,60 Q80,30 200,55 Q320,80 420,40" stroke="hsl(220, 60%, 55%)" strokeWidth="18" fill="none" strokeLinecap="round" />
          <path d="M-20,60 Q80,30 200,55 Q320,80 420,40" stroke="hsl(220, 50%, 65%)" strokeWidth="2" fill="none" strokeDasharray="12 16" strokeLinecap="round" />

          <path d="M-10,75 Q100,50 220,70 Q340,90 410,55" stroke="hsl(25, 80%, 55%)" strokeWidth="14" fill="none" strokeLinecap="round" />
          <path d="M-10,75 Q100,50 220,70 Q340,90 410,55" stroke="hsl(25, 70%, 65%)" strokeWidth="2" fill="none" strokeDasharray="10 14" strokeLinecap="round" />
        </svg>

        <motion.div
          className="absolute bottom-8 right-16 sm:right-24 w-14 h-10"
          animate={{ x: [0, -30, -60, -30, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        >
          <svg viewBox="0 0 60 40" className="w-full h-full drop-shadow-md">
            <rect x="5" y="12" width="50" height="22" rx="6" fill="hsl(142, 60%, 45%)" />
            <rect x="12" y="8" width="30" height="14" rx="4" fill="hsl(200, 70%, 75%)" opacity="0.7" />
            <circle cx="16" cy="34" r="5" fill="#333" />
            <circle cx="44" cy="34" r="5" fill="#333" />
            <circle cx="16" cy="34" r="2" fill="#666" />
            <circle cx="44" cy="34" r="2" fill="#666" />
          </svg>
        </motion.div>

        <motion.div
          className="absolute bottom-8 left-6 sm:left-12 w-14 h-10"
          animate={{ x: [0, 20, 40, 20, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        >
          <svg viewBox="0 0 60 40" className="w-full h-full drop-shadow-md">
            <rect x="5" y="12" width="50" height="22" rx="6" fill="hsl(142, 55%, 50%)" />
            <rect x="12" y="8" width="30" height="14" rx="4" fill="hsl(200, 70%, 80%)" opacity="0.7" />
            <circle cx="16" cy="34" r="5" fill="#333" />
            <circle cx="44" cy="34" r="5" fill="#333" />
          </svg>
        </motion.div>

        {hasLocation && (
          <motion.div
            className="absolute bottom-12 left-1/2 -translate-x-1/2"
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="relative">
              <img src={hopperImg} alt="You" className="w-12 h-16 object-contain drop-shadow-lg" />
              <motion.div
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-lg"
                animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            </div>
          </motion.div>
        )}

        {!hasLocation && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-background/80 backdrop-blur-sm rounded-xl px-4 py-2 text-xs font-medium text-muted-foreground">
              Allow location to see your position
            </div>
          </div>
        )}
      </div>

      {hasLocation && spots.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3"
          data-testid="pickup-guidance-tip"
        >
          <p className="text-sm font-bold text-foreground mb-1 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Walk toward a main road
          </p>
          <p className="text-xs text-muted-foreground">
            Drivers pass through busy roads on their routine commutes. Head to <strong className="text-foreground">{spots[0]?.name}</strong> for the best pickup chances.
          </p>
        </motion.div>
      )}

      <div className="space-y-2">
        {spots.map((spot, i) => (
          <motion.div
            key={spot.name}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-start gap-3 p-3 rounded-lg bg-background hover:bg-muted/50 transition-colors"
            data-testid={`pickup-spot-${i}`}
          >
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="text-sm min-w-0">
              <p className="font-semibold text-foreground text-xs">{spot.name}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{spot.desc}</p>
              {spot.distance !== undefined && (
                <p className="text-[11px] text-primary font-medium mt-0.5">
                  {spot.distance < 0.1 ? "You're here!" : `~${spot.distance.toFixed(1)} mi away`}
                </p>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
