import { useState, useRef, useCallback, useEffect } from "react";

const SESSION_KEY = "sh_splash_shown";

export function hasSplashBeenShown(): boolean {
  try { return sessionStorage.getItem(SESSION_KEY) === "1"; } catch { return true; }
}

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const vidRef = useRef<HTMLVideoElement | null>(null);
  const rafRef = useRef<number>(0);
  const [fadingOut, setFadingOut] = useState(false);
  const doneRef = useRef(false);

  const handleFinish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    cancelAnimationFrame(rafRef.current);
    try { sessionStorage.setItem(SESSION_KEY, "1"); } catch {}
    setFadingOut(true);
    setTimeout(onComplete, 500);
  }, [onComplete]);

  useEffect(() => {
    const vid = document.createElement("video");
    vid.muted = true;
    vid.playsInline = true;
    vid.preload = "auto";
    vid.setAttribute("playsinline", "");
    vid.setAttribute("webkit-playsinline", "");
    vid.src = "/intro.mp4";
    vidRef.current = vid;

    function paint() {
      const canvas = canvasRef.current;
      if (!canvas || vid.paused || vid.ended || doneRef.current) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const cw = canvas.width, ch = canvas.height;
      const vw = vid.videoWidth || cw, vh = vid.videoHeight || ch;
      const scale = Math.max(cw / vw, ch / vh);
      const dw = vw * scale, dh = vh * scale;
      ctx.drawImage(vid, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
      rafRef.current = requestAnimationFrame(paint);
    }

    function sizeCanvas() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    sizeCanvas();
    window.addEventListener("resize", sizeCanvas);

    vid.addEventListener("playing", () => {
      sizeCanvas();
      paint();
    });

    vid.addEventListener("ended", handleFinish);
    vid.addEventListener("error", handleFinish);

    vid.play().catch(() => {});

    const fallback = setTimeout(handleFinish, 6000);

    return () => {
      clearTimeout(fallback);
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", sizeCanvas);
      vid.pause();
      vid.src = "";
    };
  }, [handleFinish]);

  const handleTap = () => {
    const vid = vidRef.current;
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
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
        }}
        data-testid="splash-canvas"
      />
    </div>
  );
}
