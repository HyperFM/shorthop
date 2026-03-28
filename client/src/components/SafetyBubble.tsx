import { useState } from "react";
import { AlertCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SafetyBubbleProps {
  isOpen: boolean;
  onReasonSelected: (reason: string) => void;
  onNeedAssistance: () => void;
  distanceFeet?: number;
}

const DEVIATION_REASONS = [
  { id: "traffic", label: "Traffic / road delay" },
  { id: "reroute", label: "Navigation reroute" },
  { id: "detour", label: "Detour / preferred route" },
  { id: "stopping", label: "Stopping briefly" },
  { id: "other", label: "Other / not listed" },
];

export function SafetyBubble({ isOpen, onReasonSelected, onNeedAssistance, distanceFeet }: SafetyBubbleProps) {
  const [dismissed, setDismissed] = useState(false);

  if (!isOpen || dismissed) return null;

  const handleReasonSelect = (reasonId: string) => {
    setDismissed(true);
    onReasonSelected(reasonId);
  };

  const handleAssistance = () => {
    setDismissed(true);
    onNeedAssistance();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-700">
        <div className="p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="flex-shrink-0 mt-0.5">
              <AlertCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Route change detected — what's the reason?
              </h2>
              {distanceFeet && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  ({Math.round(distanceFeet)} feet off route)
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            {DEVIATION_REASONS.map((reason) => (
              <Button
                key={reason.id}
                onClick={() => handleReasonSelect(reason.id)}
                variant="outline"
                className="w-full justify-start text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-blue-50 dark:hover:bg-slate-800 py-2 h-auto"
                data-testid={`button-reason-${reason.id}`}
              >
                {reason.label}
              </Button>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button
              onClick={handleAssistance}
              variant="ghost"
              className="w-full text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 py-2"
              data-testid="button-need-assistance"
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Call 911
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
