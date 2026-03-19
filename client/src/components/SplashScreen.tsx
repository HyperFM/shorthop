import { useState, useRef, useCallback, useEffect } from "react";

const SESSION_KEY = "sh_splash_shown";

export function hasSplashBeenShown(): boolean {
  try { return sessionStorage.getItem(SESSION_KEY) === "1"; } catch { return true; }
}

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [fadingOut, setFadingOut] = useState(false);
  const doneRef = useRef(false);

  const handleFinish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    try { sessionStorage.setItem(SESSION_KEY, "1"); } catch {}
    setFadingOut(true);
    setTimeout(onComplete, 500);
  }, [onComplete]);

  useEffect(() => {
    const fallback = setTimeout(handleFinish, 6000);
    return () => clearTimeout(fallback);
  }, [handleFinish]);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.play().catch(() => {});
  }, []);

  const handleTap = () => {
    const vid = videoRef.current;
    if (!vid || doneRef.current) return;
    vid.currentTime = 0;
    vid.muted = false;
    vid.play().catch(() => {});
  };

  return (
    <div
      onClick={handleTap}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "#000",
        opacity: fadingOut ? 0 : 1,
        transition: "opacity 0.4s ease-out",
        pointerEvents: fadingOut ? "none" : "auto",
      }}
      data-testid="splash-screen"
    >
      <video
        ref={videoRef}
        muted
        playsInline
        autoPlay
        preload="auto"
        onEnded={handleFinish}
        onError={handleFinish}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
        data-testid="splash-video"
      >
        <source src="/intro.mp4" type="video/mp4" />
      </video>
    </div>
  );
}
