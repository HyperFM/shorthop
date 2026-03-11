import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

type FlashType = "success" | "error" | "info" | "welcome";

interface FlashMessage {
  id: number;
  emoji: string;
  text: string;
  type: FlashType;
}

const typeStyles: Record<FlashType, string> = {
  success: "from-green-400 to-emerald-500 text-white",
  error: "from-red-400 to-rose-500 text-white",
  info: "from-blue-400 to-cyan-500 text-white",
  welcome: "from-orange-400 via-yellow-400 to-green-400 text-white",
};

let flashId = 0;
let globalAddFlash: ((msg: Omit<FlashMessage, "id">) => void) | null = null;

export function showFlash(emoji: string, text: string, type: FlashType = "success") {
  globalAddFlash?.({ emoji, text, type });
}

export function FlashNotificationContainer() {
  const [messages, setMessages] = useState<FlashMessage[]>([]);

  const addFlash = useCallback((msg: Omit<FlashMessage, "id">) => {
    const id = ++flashId;
    setMessages((prev) => [...prev, { ...msg, id }]);
    setTimeout(() => {
      setMessages((prev) => prev.filter((m) => m.id !== id));
    }, 1200);
  }, []);

  useEffect(() => {
    globalAddFlash = addFlash;
    return () => {
      globalAddFlash = null;
    };
  }, [addFlash]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] flex items-center justify-center">
      <AnimatePresence>
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, scale: 0.3, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            transition={{
              type: "spring",
              stiffness: 500,
              damping: 25,
              duration: 0.3,
            }}
            className={`bg-gradient-to-r ${typeStyles[msg.type]} px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 pointer-events-none`}
          >
            <motion.span
              className="text-3xl"
              initial={{ rotate: -20, scale: 0.5 }}
              animate={{ rotate: 0, scale: 1.2 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              {msg.emoji}
            </motion.span>
            <span className="text-base font-display font-bold drop-shadow-sm">
              {msg.text}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
