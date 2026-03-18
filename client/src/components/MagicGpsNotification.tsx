import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, MapPin, Navigation, Sparkles } from "lucide-react";

interface MagicGpsSuggestionProps {
  type: "route_match" | "driving_detected" | "walking_detected";
  routeName?: string;
  isDriver: boolean;
  onAccept: () => void;
  onDismiss: () => void;
}

export function MagicGpsSuggestion({ type, routeName, isDriver, onAccept, onDismiss }: MagicGpsSuggestionProps) {
  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -100, opacity: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="fixed top-0 left-0 right-0 z-[80] p-4 pt-[env(safe-area-inset-top,16px)]"
      data-testid="magic-gps-suggestion"
    >
      <div className="max-w-md mx-auto rounded-2xl overflow-hidden shadow-2xl border border-border/50 bg-background">
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-md ${
              type === "walking_detected"
                ? "bg-gradient-to-br from-blue-400 to-cyan-500"
                : "bg-gradient-to-br from-amber-400 to-orange-500"
            }`}>
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-extrabold text-foreground">
                {type === "walking_detected" ? "👣 MagicGPS Check-In" : "✨ MagicGPS Suggestion"}
              </p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {type === "route_match" && isDriver && (
                  <>Hey, are you headed to '{routeName}'?</>
                )}
                {type === "route_match" && !isDriver && (
                  <>Headed to '{routeName}'? Need a hop?</>
                )}
                {type === "driving_detected" && (
                  <>Looks like you're headed somewhere... Turn this trip into earnings?</>
                )}
                {type === "walking_detected" && (
                  <>You headed somewhere? Keep up the good walk 🚶‍♂️ If you need a hop, I'll be right here 🙂</>
                )}
              </p>
            </div>
            <button onClick={onDismiss} className="p-1 rounded-full hover:bg-muted" data-testid="button-dismiss-magic-gps">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          <div className="flex gap-2 mt-3">
            <Button
              onClick={onAccept}
              size="sm"
              className={`flex-1 h-9 font-bold rounded-xl text-white ${
                isDriver
                  ? "bg-gradient-to-r from-orange-500 to-amber-600"
                  : "bg-gradient-to-r from-green-500 to-emerald-600"
              }`}
              data-testid="button-accept-magic-gps"
            >
              {type === "route_match" && isDriver && "Yes, Start Route"}
              {type === "route_match" && !isDriver && "Request a Hop"}
              {type === "driving_detected" && "Turn On Auto-Hop"}
              {type === "walking_detected" && "Request a Hop"}
            </Button>
            <Button
              onClick={onDismiss}
              size="sm"
              variant="outline"
              className="flex-1 h-9 font-bold rounded-xl"
              data-testid="button-decline-magic-gps"
            >
              {type === "walking_detected" ? "Dismiss" : "Not This Time"}
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

interface MagicGpsActivationProps {
  routeName: string;
  onActivate: () => void;
  onClose: () => void;
}

export function MagicGpsActivation({ routeName, onActivate, onClose }: MagicGpsActivationProps) {
  const [activated, setActivated] = useState(false);

  const handleActivate = () => {
    setActivated(true);
    onActivate();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] bg-white dark:bg-background flex flex-col items-center justify-center"
      data-testid="magic-gps-activation"
    >
      <button
        onClick={onClose}
        className="absolute top-6 right-6 w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center"
        data-testid="button-close-activation"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-amber-400/30"
            style={{
              left: `${20 + Math.random() * 60}%`,
              top: `${20 + Math.random() * 60}%`,
            }}
            animate={{
              scale: [0, 1, 0],
              opacity: [0, 0.8, 0],
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {!activated ? (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center px-8 text-center"
        >
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-2xl mb-8"
          >
            <Navigation className="w-10 h-10 text-white" />
          </motion.div>

          <p className="text-lg font-black text-foreground mb-2">MagicGPS Active</p>
          <p className="text-sm text-muted-foreground mb-8">Ready to start your route</p>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleActivate}
            className="w-64 h-16 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 text-white font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-orange-500/30"
            data-testid="button-hop-to-route"
          >
            <MapPin className="w-6 h-6" />
            Hop to {routeName}
          </motion.button>
        </motion.div>
      ) : (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center px-8 text-center"
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-2xl mb-8"
          >
            <Sparkles className="w-10 h-10 text-white" />
          </motion.div>

          <p className="text-lg font-black text-green-600 mb-2">Auto-Hop Active 💰</p>
          <p className="text-sm text-muted-foreground mb-4">Searching for riders along your route...</p>

          <div className="w-64 p-4 rounded-2xl bg-muted/30 border border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-orange-500" />
              <p className="text-sm font-bold">{routeName}</p>
            </div>
            <motion.div
              className="h-1 rounded-full bg-green-500/20 overflow-hidden"
            >
              <motion.div
                className="h-full bg-green-500 rounded-full"
                animate={{ x: ["-100%", "100%"] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                style={{ width: "40%" }}
              />
            </motion.div>
          </div>

          <Button
            onClick={onClose}
            variant="outline"
            className="mt-6 rounded-xl font-bold"
            data-testid="button-close-activation-active"
          >
            Back to Map
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}

interface MagicGpsStatusProps {
  isOn: boolean;
  movementType: "stationary" | "walking" | "driving" | null;
}

export function MagicGpsStatus({ isOn, movementType }: MagicGpsStatusProps) {
  if (!isOn) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100/80 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700"
      data-testid="magic-gps-status"
    >
      <motion.div
        animate={{ scale: [1, 1.3, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="w-1.5 h-1.5 rounded-full bg-amber-500"
      />
      <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400">
        ✨ MagicGPS On
      </span>
      {movementType === "driving" && <span className="text-[9px] text-amber-600">🚗</span>}
      {movementType === "walking" && <span className="text-[9px] text-amber-600">🚶</span>}
    </motion.div>
  );
}
