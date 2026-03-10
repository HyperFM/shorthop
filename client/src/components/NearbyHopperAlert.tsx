import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, X, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { NearbyHopper } from "@/hooks/use-location";

interface NearbyHopperAlertProps {
  hopper: NearbyHopper | null;
  onDismiss: () => void;
  onViewDetails?: () => void;
}

export function NearbyHopperAlert({
  hopper,
  onDismiss,
  onViewDetails,
}: NearbyHopperAlertProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (hopper) {
      setVisible(true);
      const autoHide = setTimeout(() => {
        setVisible(false);
        setTimeout(onDismiss, 400);
      }, 12000);
      return () => clearTimeout(autoHide);
    } else {
      setVisible(false);
    }
  }, [hopper, onDismiss]);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(onDismiss, 400);
  };

  const handleViewDetails = () => {
    if (onViewDetails) onViewDetails();
    handleDismiss();
  };

  return (
    <AnimatePresence>
      {visible && hopper && (
        <motion.div
          data-testid="alert-nearby-hopper"
          initial={{ opacity: 0, y: -80 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -80 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4"
        >
          <Card className="shadow-lg border-primary/30 bg-background">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <p
                    data-testid="text-hopper-message"
                    className="font-bold text-foreground text-sm leading-snug"
                  >
                    {hopper.message}
                  </p>
                  <p
                    data-testid="text-hopper-distance"
                    className="text-xs text-muted-foreground"
                  >
                    {hopper.distance} {hopper.direction}
                  </p>
                </div>
                <Button
                  data-testid="button-dismiss-hopper"
                  size="icon"
                  variant="ghost"
                  onClick={handleDismiss}
                  className="shrink-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                <Button
                  data-testid="button-view-hopper-details"
                  variant="default"
                  size="sm"
                  className="flex-1"
                  onClick={handleViewDetails}
                >
                  <Eye className="w-4 h-4 mr-1.5" />
                  View Details
                </Button>
                <Button
                  data-testid="button-dismiss-hopper-secondary"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={handleDismiss}
                >
                  Dismiss
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
