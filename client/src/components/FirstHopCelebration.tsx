import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Flame } from "lucide-react";

export function FirstHopCelebration({ show, onDismiss }: { show: boolean; onDismiss: () => void }) {
  const [visible, setVisible] = useState(show);

  useEffect(() => {
    setVisible(show);
  }, [show]);

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        data-testid="modal-first-hop-celebration"
      >
        <motion.div
          className="bg-card border border-border rounded-2xl p-8 mx-6 max-w-sm text-center shadow-2xl"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", duration: 0.6, bounce: 0.4 }}
        >
          <motion.div
            className="text-6xl mb-4"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring", bounce: 0.6 }}
          >
            🎉
          </motion.div>

          <motion.h2
            className="text-2xl font-bold text-foreground mb-2"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Hooray!
          </motion.h2>

          <motion.p
            className="text-lg text-muted-foreground mb-4"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            You completed your first Hop.
          </motion.p>

          <motion.div
            className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 mb-6"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <Flame className="w-5 h-5 text-orange-400" />
              <span className="font-semibold text-orange-400">Hop Streak Started!</span>
            </div>
            <p className="text-sm text-muted-foreground">
              You've started your Hop streak. Let's see how far you can Hop.
            </p>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.9 }}
          >
            <Button
              onClick={() => {
                setVisible(false);
                onDismiss();
              }}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              data-testid="button-dismiss-celebration"
            >
              Let's Go!
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
