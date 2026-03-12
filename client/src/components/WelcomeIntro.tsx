import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const WELCOME_SEEN_KEY = "shorthop_welcome_seen";

export function useHasSeenWelcome(): boolean {
  try {
    return localStorage.getItem(WELCOME_SEEN_KEY) === "true";
  } catch {
    return false;
  }
}

export function WelcomeIntro({ onComplete }: { onComplete: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<"glow-in" | "playing" | "glow-out" | "done">("glow-in");
  const [canSkip, setCanSkip] = useState(false);
  const completedRef = useRef(false);
  const maxTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const glowOutTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const skipTimer = setTimeout(() => setCanSkip(true), 1200);
    return () => clearTimeout(skipTimer);
  }, []);

  useEffect(() => {
    const glowTimer = setTimeout(() => {
      setPhase("playing");
      videoRef.current?.play().catch(() => {});
    }, 800);
    return () => clearTimeout(glowTimer);
  }, []);

  useEffect(() => {
    maxTimerRef.current = setTimeout(() => handleGlowOut(), 8000);
    return () => { if (maxTimerRef.current) clearTimeout(maxTimerRef.current); };
  }, []);

  const handleGlowOut = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    if (maxTimerRef.current) clearTimeout(maxTimerRef.current);
    setPhase("glow-out");
    try { localStorage.setItem(WELCOME_SEEN_KEY, "true"); } catch {}
    glowOutTimerRef.current = setTimeout(() => {
      setPhase("done");
      onComplete();
    }, 900);
  };

  useEffect(() => {
    return () => { if (glowOutTimerRef.current) clearTimeout(glowOutTimerRef.current); };
  }, []);

  if (phase === "done") return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden"
        style={{ background: "radial-gradient(ellipse at center, #1a1a2e 0%, #0a0a0f 100%)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.6 }}
        onClick={() => canSkip && handleGlowOut()}
        data-testid="welcome-intro"
      >
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(circle at 50% 50%, rgba(34,197,94,0.15) 0%, rgba(249,115,22,0.1) 30%, transparent 70%)",
          }}
          animate={{
            scale: phase === "glow-in" ? [0.5, 1.5] : phase === "glow-out" ? [1.5, 3] : [1.3, 1.5, 1.3],
            opacity: phase === "glow-out" ? [0.8, 0] : phase === "glow-in" ? [0, 1] : [0.6, 1, 0.6],
          }}
          transition={{
            duration: phase === "glow-in" ? 0.8 : phase === "glow-out" ? 0.9 : 3,
            repeat: phase === "playing" ? Infinity : 0,
            ease: "easeInOut",
          }}
        />

        <motion.div
          className="absolute w-64 h-64 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(34,197,94,0.3) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
          animate={{
            scale: phase === "glow-in" ? [0, 2] : phase === "glow-out" ? [2, 0] : [1.5, 2, 1.5],
            opacity: phase === "glow-out" ? [1, 0] : [0.5, 1, 0.5],
          }}
          transition={{
            duration: phase === "playing" ? 2.5 : 0.8,
            repeat: phase === "playing" ? Infinity : 0,
            ease: "easeInOut",
          }}
        />

        <motion.div
          className="absolute w-48 h-48 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(249,115,22,0.25) 0%, transparent 70%)",
            filter: "blur(50px)",
            top: "30%",
            left: "60%",
          }}
          animate={{
            scale: [1, 1.8, 1],
            opacity: phase === "glow-out" ? [0.7, 0] : [0.3, 0.8, 0.3],
          }}
          transition={{
            duration: 3,
            repeat: phase === "playing" ? Infinity : 0,
            ease: "easeInOut",
            delay: 0.5,
          }}
        />

        <motion.div
          className="relative w-full h-full flex items-center justify-center"
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{
            scale: phase === "glow-out" ? 1.1 : 1,
            opacity: phase === "glow-in" ? 0.3 : phase === "glow-out" ? 0 : 1,
          }}
          transition={{ duration: phase === "glow-in" ? 0.8 : 0.9, ease: "easeOut" }}
        >
          <video
            ref={videoRef}
            className="w-full h-full object-contain max-w-lg rounded-2xl"
            style={{
              filter: phase === "playing" ? "drop-shadow(0 0 30px rgba(34,197,94,0.3)) drop-shadow(0 0 60px rgba(249,115,22,0.15))" : "none",
            }}
            muted={false}
            playsInline
            preload="auto"
            onEnded={handleGlowOut}
          >
            <source src="/welcome-intro-v2.mov" type="video/quicktime" />
            <source src="/welcome-intro-v2.mov" type="video/mp4" />
          </video>
        </motion.div>

        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full pointer-events-none"
            style={{
              background: i % 2 === 0 ? "rgba(34,197,94,0.6)" : "rgba(249,115,22,0.6)",
              left: `${10 + Math.random() * 80}%`,
              top: `${10 + Math.random() * 80}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: phase === "glow-out" ? [0.6, 0] : [0, 0.8, 0],
              scale: [0, 1.5, 0],
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              repeat: phase === "playing" ? Infinity : 0,
              delay: Math.random() * 2,
              ease: "easeInOut",
            }}
          />
        ))}

        {canSkip && phase !== "glow-out" && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 0.8 }}
            transition={{ duration: 0.4 }}
            className="absolute bottom-12 right-6 bg-white/10 backdrop-blur-md text-white/80 px-5 py-2 rounded-full text-sm font-medium border border-white/10 hover:bg-white/20 transition-colors"
            onClick={(e) => { e.stopPropagation(); handleGlowOut(); }}
            data-testid="button-skip-intro"
          >
            Skip
          </motion.button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
