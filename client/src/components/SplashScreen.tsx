import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [fadingOut, setFadingOut] = useState(false);
  const doneRef = useRef(false);

  const handleFinish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setFadingOut(true);
    setTimeout(onComplete, 600);
  }, [onComplete]);

  useEffect(() => {
    const fallback = setTimeout(handleFinish, 6000);
    return () => clearTimeout(fallback);
  }, [handleFinish]);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.play().catch(() => {
      handleFinish();
    });
  }, [handleFinish]);

  return (
    <motion.div
      className="fixed inset-0 z-[200] bg-black flex items-center justify-center"
      animate={{ opacity: fadingOut ? 0 : 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      data-testid="splash-screen"
    >
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        playsInline
        onEnded={handleFinish}
        onError={handleFinish}
        data-testid="splash-video"
      >
        <source src="/splash-screen.mov" type="video/quicktime" />
        <source src="/splash-screen.mov" type="video/mp4" />
      </video>
    </motion.div>
  );
}
