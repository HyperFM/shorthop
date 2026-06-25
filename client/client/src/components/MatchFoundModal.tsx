import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Navigation, Car, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MatchFoundModalProps {
  visible: boolean;
  role: "hopper" | "driver";
  destination?: string;
  driverInfo?: {
    vehicleMake?: string | null;
    vehicleModel?: string | null;
    vehicleColor?: string | null;
    licensePlate?: string | null;
  };
  onDismiss: () => void;
  onViewTrip?: () => void;
}

export function MatchFoundModal({ visible, role, destination, driverInfo, onDismiss, onViewTrip }: MatchFoundModalProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      setShow(true);
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200, 100, 400]);
      }
    }
  }, [visible]);

  if (!show) return null;

  const handleDismiss = () => {
    setShow(false);
    onDismiss();
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          data-testid="match-found-overlay"
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="mx-4 w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 p-6 shadow-2xl border border-green-500/30"
            data-testid="match-found-modal"
          >
            <div className="flex justify-end">
              <button onClick={handleDismiss} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" data-testid="match-dismiss-btn">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-center space-y-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 400 }}
                className="mx-auto w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center"
              >
                <span className="text-4xl">🎯</span>
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-bold text-green-600 dark:text-green-400"
                data-testid="match-found-title"
              >
                MATCH FOUND!
              </motion.h2>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="space-y-2"
              >
                {role === "hopper" ? (
                  <>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">A driver is heading your way!</p>
                    {driverInfo && (driverInfo.vehicleMake || driverInfo.vehicleColor) && (
                      <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <Car className="w-4 h-4" />
                        <span>
                          {[driverInfo.vehicleColor, driverInfo.vehicleMake, driverInfo.vehicleModel].filter(Boolean).join(" ")}
                          {driverInfo.licensePlate && ` (${driverInfo.licensePlate})`}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-gray-600 dark:text-gray-300 text-sm">A hopper matched with your route!</p>
                )}

                {destination && (
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <MapPin className="w-4 h-4 text-green-500" />
                    <span className="truncate max-w-[200px]">{destination}</span>
                  </div>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="pt-2 space-y-2"
              >
                <Button
                  onClick={() => {
                    handleDismiss();
                    onViewTrip?.();
                  }}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  data-testid="match-view-trip-btn"
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  View Active Trip
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
