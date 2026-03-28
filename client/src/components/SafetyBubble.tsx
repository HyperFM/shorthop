import { useState } from "react";
import { AlertTriangle, X, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SafetyBubbleProps {
  isOpen: boolean;
  onDismiss: () => void;
  onAllWell: () => void;
  onEmergency: () => void;
  distanceFeet?: number;
}

export function SafetyBubble({ isOpen, onDismiss, onAllWell, onEmergency, distanceFeet }: SafetyBubbleProps) {
  const [dismissed, setDismissed] = useState(false);

  if (!isOpen || dismissed) return null;

  const handleAllWell = () => {
    setDismissed(true);
    onAllWell();
  };

  const handleEmergency = () => {
    onEmergency();
  };

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full border-2 border-amber-400 dark:border-amber-600 animate-pulse">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <AlertTriangle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                Route Deviation Alert 🚨
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                We noticed you've gone {distanceFeet ? `${Math.round(distanceFeet)} feet` : "significantly"} off your planned route.
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                Is everything okay? Please let us know so we can help if needed.
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition"
              data-testid="button-dismiss-safety-bubble"
              aria-label="Dismiss"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-col gap-3 mt-6">
            <Button
              onClick={handleAllWell}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2"
              data-testid="button-all-is-well"
            >
              ✅ All is Well
            </Button>

            <Button
              onClick={handleEmergency}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 flex items-center justify-center gap-2"
              data-testid="button-call-emergency"
            >
              <Phone className="w-4 h-4" />
              Call 911
            </Button>

            <Button
              onClick={handleDismiss}
              variant="outline"
              className="border-slate-300 dark:border-slate-600 py-2"
              data-testid="button-dismiss-alert"
            >
              Dismiss
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
