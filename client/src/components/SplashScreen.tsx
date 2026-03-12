import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [fadingOut, setFadingOut] = useState(false);
  const doneRef = useRef(false);
  const [needsTap, setNeedsTap] = useState(false);

  const handleFinish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setFadingOut(true);
    setTimeout(onComplete, 600);
  }, [onComplete]);

  useEffect(() => {
    const fallback = setTimeout(handleFinish, 8000);
    return () => clearTimeout(fallback);
  }, [handleFinish]);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    vid.muted = false;
    const playAttempt = vid.play();
    if (playAttempt) {
      playAttempt.catch(() => {
        vid.muted = true;
        vid.play().then(() => {
          setNeedsTap(true);
        }).catch(() => {
          handleFinish();
        });
      });
    }
  }, [handleFinish]);

  const handleTap = () => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.muted = false;
    vid.currentTime = 0;
    vid.play().catch(() => {});
    setNeedsTap(false);
  };

  return (
    <motion.div
      className="fixed inset-0 z-[200] bg-black flex items-center justify-center"
      animate={{ opacity: fadingOut ? 0 : 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      onClick={needsTap ? handleTap : undefined}
      data-testid="splash-screen"
    >
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        playsInline
        preload="auto"
        onEnded={handleFinish}
        onError={handleFinish}
        data-testid="splash-video"
      >
        <source src="/splash-screen.mp4" type="video/mp4" />
        <source src="/splash-screen.mov" type="video/quicktime" />
      </video>

      {needsTap && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="bg-white/15 backdrop-blur-sm rounded-full px-6 py-3 text-white text-sm font-medium animate-pulse">
            Tap to play with sound
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
