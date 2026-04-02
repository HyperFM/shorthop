import { createContext, useContext, useEffect, useState, useCallback } from "react";

type ThemeMode = "light" | "dark" | "auto";

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: "light",
  setMode: () => {},
  isDark: false,
});

export function useTheme() {
  return useContext(ThemeContext);
}

function getSunTimes(lat: number, lng: number): { sunrise: number; sunset: number } {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000);
  const radLat = (lat * Math.PI) / 180;
  const decl = 23.45 * Math.sin(((360 / 365) * (dayOfYear - 81) * Math.PI) / 180);
  const radDecl = (decl * Math.PI) / 180;
  const cosHA = -Math.tan(radLat) * Math.tan(radDecl);
  if (cosHA < -1) return { sunrise: 0, sunset: 24 };
  if (cosHA > 1) return { sunrise: 12, sunset: 12 };
  const hourAngle = Math.acos(cosHA) * (180 / Math.PI);
  const tzOffsetHours = -now.getTimezoneOffset() / 60;
  const solarNoon = 12 - lng / 15 + tzOffsetHours;
  const sunrise = solarNoon - hourAngle / 15;
  const sunset = solarNoon + hourAngle / 15;
  return { sunrise, sunset };
}

function shouldBeDark(lat?: number | null, lng?: number | null): boolean {
  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;

  if (lat != null && lng != null) {
    const { sunrise, sunset } = getSunTimes(lat, lng);
    return currentHour < sunrise || currentHour > sunset;
  }
  return currentHour < 6.5 || currentHour > 19.5;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem("sh_theme");
      if (saved === "light" || saved === "dark" || saved === "auto") return saved;
    } catch {}
    return "light";
  });

  const [isDark, setIsDark] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (mode !== "auto") return;
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 600000 }
    );
  }, [mode]);

  const applyTheme = useCallback(() => {
    let dark = false;
    if (mode === "dark") {
      dark = true;
    } else if (mode === "auto") {
      dark = shouldBeDark(coords?.lat, coords?.lng);
    }
    setIsDark(dark);
    if (dark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [mode, coords]);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    try {
      localStorage.setItem("sh_theme", newMode);
    } catch {}
  }, []);

  useEffect(() => {
    applyTheme();
  }, [applyTheme]);

  useEffect(() => {
    if (mode !== "auto") return;
    const interval = setInterval(applyTheme, 60000);
    return () => clearInterval(interval);
  }, [mode, applyTheme]);

  return (
    <ThemeContext.Provider value={{ mode, setMode, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}
