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
  flowModeActive?: boolean;
}

export function MagicGpsStatus({ isOn, movementType, flowModeActive }: MagicGpsStatusProps) {
  if (!isOn) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${
        flowModeActive
          ? "bg-green-100/80 dark:bg-green-900/30 border-green-200 dark:border-green-700"
          : "bg-amber-100/80 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700"
      }`}
      data-testid="magic-gps-status"
    >
      <motion.div
        animate={{ scale: [1, 1.3, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        className={`w-1.5 h-1.5 rounded-full ${flowModeActive ? "bg-green-500" : "bg-amber-500"}`}
      />
      <span className={`text-[10px] font-bold ${flowModeActive ? "text-green-700 dark:text-green-400" : "text-amber-700 dark:text-amber-400"}`}>
        {flowModeActive ? "🌊 Flow Mode" : "✨ MagicGPS On"}
      </span>
      {movementType === "driving" && <span className="text-[9px]">🚗</span>}
      {movementType === "walking" && <span className="text-[9px]">🚶</span>}
    </motion.div>
  );
}

interface FlowModeNotificationProps {
  routeName: string;
  onDismiss: () => void;
}

export function FlowModeNotification({ routeName, onDismiss }: FlowModeNotificationProps) {
  return (
    <motion.div
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -80, opacity: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="fixed top-0 left-0 right-0 z-[80] p-4 pt-[env(safe-area-inset-top,16px)]"
      data-testid="flow-mode-notification"
    >
      <div className="max-w-md mx-auto rounded-2xl overflow-hidden shadow-2xl border border-green-200/50 dark:border-green-700/30 bg-background">
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shrink-0 shadow-md">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-extrabold text-foreground">✨ Flow Mode Active</p>
              <p className="text-xs text-muted-foreground mt-0.5">Earning along your route to {routeName}</p>
            </div>
            <button onClick={onDismiss} className="p-1 rounded-full hover:bg-muted" data-testid="button-dismiss-flow-mode">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

interface DriftCatchNotificationProps {
  onRequestHop: () => void;
  onDismiss: () => void;
}

export function DriftCatchNotification({ onRequestHop, onDismiss }: DriftCatchNotificationProps) {
  return (
    <motion.div
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -80, opacity: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="fixed top-0 left-0 right-0 z-[80] p-4 pt-[env(safe-area-inset-top,16px)]"
      data-testid="drift-catch-notification"
    >
      <div className="max-w-md mx-auto rounded-2xl overflow-hidden shadow-2xl border border-blue-200/50 dark:border-blue-700/30 bg-background">
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center shrink-0 shadow-md">
              <Navigation className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-extrabold text-foreground">🧭 On the Move</p>
              <p className="text-xs text-muted-foreground mt-1">You're on the move — want a quick hop?</p>
            </div>
            <button onClick={onDismiss} className="p-1 rounded-full hover:bg-muted" data-testid="button-dismiss-drift-catch">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <div className="flex gap-2 mt-3">
            <Button onClick={onRequestHop} size="sm" className="flex-1 h-9 font-bold rounded-xl text-white bg-gradient-to-r from-green-500 to-emerald-600" data-testid="button-drift-catch-hop">
              Request a Hop
            </Button>
            <Button onClick={onDismiss} size="sm" variant="outline" className="flex-1 h-9 font-bold rounded-xl" data-testid="button-drift-catch-dismiss">
              Keep Walking
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

interface OnTheWayPingProps {
  onRequestHop: () => void;
  onDismiss: () => void;
}

export function OnTheWayPing({ onRequestHop, onDismiss }: OnTheWayPingProps) {
  return (
    <motion.div
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -80, opacity: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="fixed top-0 left-0 right-0 z-[80] p-4 pt-[env(safe-area-inset-top,16px)]"
      data-testid="on-the-way-ping"
    >
      <div className="max-w-md mx-auto rounded-2xl overflow-hidden shadow-2xl border border-orange-200/50 dark:border-orange-700/30 bg-background">
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shrink-0 shadow-md">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-extrabold text-foreground">🚗 Someone's heading your way</p>
              <p className="text-xs text-muted-foreground mt-1">Catch a hop without delay</p>
            </div>
            <button onClick={onDismiss} className="p-1 rounded-full hover:bg-muted" data-testid="button-dismiss-on-the-way">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <div className="flex gap-2 mt-3">
            <Button onClick={onRequestHop} size="sm" className="flex-1 h-9 font-bold rounded-xl text-white bg-gradient-to-r from-orange-500 to-amber-600" data-testid="button-on-the-way-hop">
              Request Ride
            </Button>
            <Button onClick={onDismiss} size="sm" variant="outline" className="flex-1 h-9 font-bold rounded-xl" data-testid="button-on-the-way-dismiss">
              Dismiss
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

interface RepeatRouteProps {
  routeName: string;
  onActivate: () => void;
  onDismiss: () => void;
}

export function RepeatRoutePrompt({ routeName, onActivate, onDismiss }: RepeatRouteProps) {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 20, opacity: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="flex items-center gap-3 p-3 rounded-2xl bg-amber-50/80 dark:bg-amber-900/20 border border-amber-200/50 dark:border-amber-700/30 shadow-lg"
      data-testid="repeat-route-prompt"
    >
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0">
        <MapPin className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold text-foreground truncate">Go to {routeName} again?</p>
      </div>
      <Button onClick={onActivate} size="sm" className="h-8 text-[10px] font-bold rounded-xl text-white bg-gradient-to-r from-orange-500 to-amber-600 px-3" data-testid="button-repeat-route">
        Let's Go
      </Button>
      <button onClick={onDismiss} className="p-1 rounded-full hover:bg-muted shrink-0" data-testid="button-dismiss-repeat">
        <X className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
    </motion.div>
  );
}
