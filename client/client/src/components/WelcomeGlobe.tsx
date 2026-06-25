import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SEEN_KEY = "sh_welcome_globe_v2";

export function hasSeenWelcomeGlobe(): boolean {
  try { return localStorage.getItem(SEEN_KEY) === "1"; } catch { return false; }
}

function markWelcomeGlobeSeen() {
  try { localStorage.setItem(SEEN_KEY, "1"); } catch {}
}

interface WelcomeGlobeProps {
  username: string;
  isReturning?: boolean;
  onDismiss: () => void;
}

type Phase = "in" | "hold" | "out";

export function WelcomeGlobe({ username, isReturning = true, onDismiss }: WelcomeGlobeProps) {
  const [phase, setPhase] = useState<Phase>("in");
  const holdTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const dismissed = useRef(false);

  function startExit() {
    if (dismissed.current) return;
    dismissed.current = true;
    markWelcomeGlobeSeen();
    setPhase("out");
    setTimeout(onDismiss, 450);
  }

  useEffect(() => {
    const inTimer = setTimeout(() => setPhase("hold"), 250);
    holdTimerRef.current = setTimeout(() => startExit(), 1300);
    return () => {
      clearTimeout(inTimer);
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    };
  }, []);

  const greeting = isReturning ? "welcome back" : "welcome";

  return (
    <AnimatePresence>
      {phase !== "out" ? (
        <motion.div
          key="globe-overlay"
          className="fixed inset-0 z-[300] flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          data-testid="welcome-globe-overlay"
        >
          {/* Dark scrim */}
          <motion.div
            className="absolute inset-0"
            style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(10,15,40,0.92) 0%, rgba(2,4,16,0.97) 100%)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          />

          {/* Outer glow ring — pulsing blue halo */}
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 340,
              height: 340,
              background: "radial-gradient(circle, rgba(56,189,248,0.18) 0%, rgba(14,165,233,0.08) 50%, transparent 75%)",
              filter: "blur(28px)",
            }}
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          />

          {/* Core globe */}
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 220,
              height: 220,
              background: "radial-gradient(circle at 40% 38%, rgba(99,210,255,0.55) 0%, rgba(56,189,248,0.3) 35%, rgba(14,165,233,0.12) 65%, transparent 85%)",
              boxShadow: "0 0 60px 20px rgba(56,189,248,0.22), 0 0 120px 40px rgba(14,165,233,0.12), inset 0 0 40px rgba(186,230,255,0.08)",
              filter: "blur(2px)",
            }}
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.4, opacity: 0 }}
            transition={{ duration: 0.38, ease: "easeOut" }}
          />

          {/* Inner shimmer highlight */}
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 90,
              height: 56,
              background: "radial-gradient(ellipse, rgba(255,255,255,0.22) 0%, transparent 80%)",
              top: "calc(50% - 70px)",
              left: "calc(50% - 38px)",
              filter: "blur(8px)",
            }}
            animate={{ opacity: [0.5, 0.9, 0.5] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Text — centered in globe */}
          <motion.div
            className="relative z-10 flex flex-col items-center select-none"
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.94 }}
            transition={{ delay: 0.12, duration: 0.32, ease: "easeOut" }}
          >
            {/* Small label above */}
            <p className="text-[11px] font-semibold tracking-[0.28em] uppercase text-sky-300/80 mb-1.5 leading-none">
              {greeting}
            </p>

            {/* Big name */}
            <p
              className="text-5xl font-black text-white tracking-tight leading-none"
              style={{ textShadow: "0 0 32px rgba(56,189,248,0.65), 0 2px 8px rgba(0,0,0,0.5)" }}
            >
              {username}
            </p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
