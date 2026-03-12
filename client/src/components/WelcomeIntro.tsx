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
  const [visible, setVisible] = useState(true);
  const [canSkip, setCanSkip] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setCanSkip(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleComplete();
    }, 10000);
    return () => clearTimeout(timer);
  }, []);

  const handleComplete = () => {
    try {
      localStorage.setItem(WELCOME_SEEN_KEY, "true");
    } catch {}
    setVisible(false);
    setTimeout(onComplete, 500);
  };

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[200] bg-black flex items-center justify-center"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        onClick={() => canSkip && handleComplete()}
        data-testid="welcome-intro"
      >
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          muted={false}
          playsInline
          onEnded={handleComplete}
        >
          <source src="/welcome-intro.mov" type="video/quicktime" />
          <source src="/welcome-intro.mov" type="video/mp4" />
        </video>

        {canSkip && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute bottom-12 right-6 bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium"
            onClick={(e) => { e.stopPropagation(); handleComplete(); }}
            data-testid="button-skip-intro"
          >
            Skip
          </motion.button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
