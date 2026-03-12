import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

type FlashType = "success" | "error" | "info" | "welcome";

interface FlashMessage {
  id: number;
  emoji: string;
  text: string;
  type: FlashType;
  username?: string;
}

interface FlashPayload {
  emoji: string;
  text: string;
  type: FlashType;
  username?: string;
}

const typeStyles: Record<FlashType, string> = {
  success: "from-green-400 to-emerald-500 text-white",
  error: "from-red-400 to-rose-500 text-white",
  info: "from-blue-400 to-cyan-500 text-white",
  welcome: "from-blue-600 to-blue-700 text-white",
};

let flashId = 0;
let globalAddFlash: ((msg: FlashPayload) => void) | null = null;

export function showFlash(emoji: string, text: string, type: FlashType = "success", username?: string) {
  globalAddFlash?.({ emoji, text, type, username });
}

function WelcomeFlash({ msg }: { msg: FlashMessage }) {
  const username = msg.username || msg.text.split(", ").slice(-1)[0]?.replace("!", "") || "";
  return (
    <div className="bg-gradient-to-br from-blue-600 to-blue-700 px-7 py-5 rounded-2xl shadow-2xl flex flex-col items-center gap-1 pointer-events-none min-w-[220px]">
      <motion.span
        className="text-4xl mb-1"
        initial={{ rotate: -30, scale: 0 }}
        animate={{ rotate: [0, -15, 15, 0], scale: [0, 1.3, 1] }}
        transition={{ type: "spring", stiffness: 400, damping: 12, delay: 0.05 }}
      >
        {msg.emoji}
      </motion.span>
      <span className="text-base font-black text-orange-400 tracking-wide drop-shadow-sm uppercase">
        Welcome
      </span>
      <motion.span
        className="text-lg font-semibold text-blue-100 tracking-wide"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, duration: 0.35, type: "spring" }}
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        {username}
      </motion.span>
    </div>
  );
}

export function FlashNotificationContainer() {
  const [messages, setMessages] = useState<FlashMessage[]>([]);

  const addFlash = useCallback((msg: FlashPayload) => {
    const id = ++flashId;
    const dur = msg.type === "welcome" ? 1800 : 1200;
    setMessages((prev) => [...prev, { ...msg, id }]);
    setTimeout(() => {
      setMessages((prev) => prev.filter((m) => m.id !== id));
    }, dur);
  }, []);

  useEffect(() => {
    globalAddFlash = addFlash;
    return () => { globalAddFlash = null; };
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
            transition={{ type: "spring", stiffness: 500, damping: 25, duration: 0.3 }}
          >
            {msg.type === "welcome" ? (
              <WelcomeFlash msg={msg} />
            ) : (
              <div className={`bg-gradient-to-r ${typeStyles[msg.type]} px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 pointer-events-none`}>
                <motion.span
                  className="text-3xl"
                  initial={{ rotate: -20, scale: 0.5 }}
                  animate={{ rotate: 0, scale: 1.2 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  {msg.emoji}
                </motion.span>
                <span className="text-base font-display font-bold drop-shadow-sm">{msg.text}</span>
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
