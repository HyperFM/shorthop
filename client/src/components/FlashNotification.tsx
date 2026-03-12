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
  welcome: "",
};

let flashId = 0;
let globalAddFlash: ((msg: FlashPayload) => void) | null = null;

export function showFlash(emoji: string, text: string, type: FlashType = "success", username?: string) {
  globalAddFlash?.({ emoji, text, type, username });
}

function WelcomeFlash({ msg }: { msg: FlashMessage }) {
  const username = msg.username || "";
  return (
    <div
      style={{ borderRadius: "100px" }}
      className="bg-blue-700 px-10 py-5 shadow-2xl shadow-blue-900/40 flex flex-col items-center gap-0.5 pointer-events-none min-w-[260px]"
    >
      <motion.span
        className="text-3xl mb-0.5"
        initial={{ rotate: -40, scale: 0 }}
        animate={{ rotate: [0, -18, 18, -8, 0], scale: [0, 1.4, 1] }}
        transition={{ type: "spring", stiffness: 350, damping: 12, delay: 0.04 }}
      >
        {msg.emoji}
      </motion.span>
      <span className="text-xl font-black text-orange-400 tracking-widest uppercase leading-tight drop-shadow">
        Welcome
      </span>
      {username && (
        <motion.span
          className="text-base font-bold text-blue-100 tracking-wide leading-tight"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, type: "spring", stiffness: 300 }}
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          {username}
        </motion.span>
      )}
    </div>
  );
}

export function FlashNotificationContainer() {
  const [messages, setMessages] = useState<FlashMessage[]>([]);

  const addFlash = useCallback((msg: FlashPayload) => {
    const id = ++flashId;
    const dur = msg.type === "welcome" ? 2000 : 1200;
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
            initial={{ opacity: 0, scale: 0.5, y: 40 }}
            animate={{
              opacity: 1,
              scale: [0.5, 1.08, 0.96, 1.02, 1],
              y: 0,
            }}
            exit={{ opacity: 0, scale: 0.85, y: -16, transition: { duration: 0.25 } }}
            transition={{ type: "spring", stiffness: 420, damping: 22, duration: 0.45 }}
          >
            {msg.type === "welcome" ? (
              <WelcomeFlash msg={msg} />
            ) : (
              <div className={`bg-gradient-to-r ${typeStyles[msg.type]} px-6 py-4 rounded-full shadow-2xl flex items-center gap-3 pointer-events-none`}>
                <motion.span
                  className="text-3xl"
                  initial={{ rotate: -20, scale: 0.5 }}
                  animate={{ rotate: 0, scale: 1.2 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  {msg.emoji}
                </motion.span>
                <span className="text-base font-black drop-shadow-sm tracking-wide">{msg.text}</span>
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
