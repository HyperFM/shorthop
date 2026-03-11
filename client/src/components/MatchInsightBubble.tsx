import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X } from "lucide-react";

interface MatchInsightBubbleProps {
  driverName: string;
  visible: boolean;
  onDismiss: () => void;
}

export function MatchInsightBubble({ driverName, visible, onDismiss }: MatchInsightBubbleProps) {
  const [show, setShow] = useState(visible);

  useEffect(() => {
    setShow(visible);
    if (visible) {
      const timer = setTimeout(() => {
        setShow(false);
        onDismiss();
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [visible, onDismiss]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 24 }}
          onClick={() => { setShow(false); onDismiss(); }}
          className="relative cursor-pointer overflow-hidden rounded-xl border border-orange-200/60 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/40 dark:to-amber-950/30 dark:border-orange-800/40 px-3.5 py-2.5 shadow-lg shadow-orange-200/30 dark:shadow-orange-900/20"
          data-testid="match-insight-bubble"
        >
          <motion.div
            className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-orange-300/20 dark:bg-orange-400/10"
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
          />

          <div className="flex items-start gap-2.5 relative z-10">
            <motion.div
              className="mt-0.5 w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center flex-shrink-0 shadow-md"
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
            >
              <Sparkles className="w-4 h-4 text-white" />
            </motion.div>

            <div className="flex-1 min-w-0">
              <p className="text-xs font-extrabold text-orange-800 dark:text-orange-300 leading-tight">
                Route Match Found!
              </p>
              <p className="text-[11px] text-orange-700/80 dark:text-orange-400/80 mt-0.5 leading-snug">
                <span className="font-bold">{driverName}</span> is already heading your direction — hop in for a quick ride!
              </p>
            </div>

            <button
              className="mt-0.5 p-0.5 rounded-full hover:bg-orange-200/50 dark:hover:bg-orange-800/30 transition-colors"
              onClick={(e) => { e.stopPropagation(); setShow(false); onDismiss(); }}
              data-testid="button-dismiss-insight"
            >
              <X className="w-3.5 h-3.5 text-orange-400" />
            </button>
          </div>

          <motion.div
            className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-orange-400 to-amber-400"
            initial={{ width: "100%" }}
            animate={{ width: "0%" }}
            transition={{ duration: 8, ease: "linear" }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
