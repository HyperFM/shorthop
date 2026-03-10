import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";
import { api } from "@shared/routes";
import type { User } from "@shared/routes";

interface WelcomeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
}

const welcomeLines = [
  { text: "Welcome back", color: "text-primary" },
  { text: "to ShortHop", color: "text-accent" },
  { text: "🛞", color: "" },
];

export function WelcomeModal({ open, onOpenChange, user }: WelcomeModalProps) {
  const queryClient = useQueryClient();
  const [visible, setVisible] = useState(open);

  const dismiss = useMutation({
    mutationFn: async () => {
      await apiRequest(api.profile.dismissWelcome.method, api.profile.dismissWelcome.path);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.auth.me.path] });
    },
  });

  useEffect(() => {
    if (open) {
      setVisible(true);
      dismiss.mutate();
      const timer = setTimeout(() => {
        setVisible(false);
        onOpenChange(false);
      }, 2800);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [open]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="text-center space-y-2">
            {welcomeLines.map((line, i) => (
              <motion.p
                key={i}
                className={`text-lg font-display font-bold ${line.color}`}
                initial={{ opacity: 0, y: 15, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{
                  enter: { delay: i * 0.2, duration: 0.4 },
                  exit: { delay: i * 0.1, duration: 0.5 },
                }}
              >
                {line.text}
              </motion.p>
            ))}

            {user.isFounder && user.founderBadge && (
              <motion.p
                className="text-xs font-bold bg-gradient-to-r from-orange-500 to-green-500 bg-clip-text text-transparent mt-3"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.6, duration: 0.4 }}
              >
                🛞 {user.founderBadge}
              </motion.p>
            )}

            <motion.p
              className="text-xs text-muted-foreground font-medium mt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.8, duration: 0.4 }}
            >
              {user.username}
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
