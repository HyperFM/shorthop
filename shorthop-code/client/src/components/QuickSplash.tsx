import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function QuickSplash({ onComplete }: { onComplete: () => void }) {
  const [visible, setVisible] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onComplete, 400);
    }, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[200] bg-white flex items-center justify-center"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          data-testid="quick-splash"
        >
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            muted
            playsInline
            onEnded={() => {
              setVisible(false);
              setTimeout(onComplete, 400);
            }}
          >
            <source src="/quick-splash.mov" type="video/quicktime" />
            <source src="/quick-splash.mov" type="video/mp4" />
          </video>
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
