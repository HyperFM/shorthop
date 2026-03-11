import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Cloud, CloudRain, CloudSnow, Sun, CloudLightning, CloudFog } from "lucide-react";

type WeatherData = {
  temp: number;
  feelsLike: number;
  condition: "clear" | "cloudy" | "rain" | "snow" | "storm" | "fog";
  description: string;
  humidity: number;
  windMph: number;
};

type SeasonInfo = {
  greeting: string;
  emoji: string;
  gradient: string;
};

function getSeasonInfo(username: string): SeasonInfo {
  const now = new Date();
  const month = now.getMonth();
  const day = now.getDate();

  if ((month === 11 && day >= 20) || (month === 0 && day <= 2)) {
    return { greeting: `Hoppy Christmas, ${username}`, emoji: "🎄", gradient: "from-red-500 via-green-600 to-red-500" };
  }
  if (month === 9) {
    return { greeting: `Hoppy Halloween, ${username}`, emoji: "🎃", gradient: "from-orange-500 via-purple-600 to-orange-500" };
  }
  if (month === 1 && day >= 7 && day <= 14) {
    return { greeting: `Hoppy Valentine's Day, ${username}`, emoji: "💝", gradient: "from-pink-500 via-red-500 to-pink-500" };
  }

  const greetings: Record<string, { pool: string[]; emoji: string; gradient: string }> = {
    spring: { pool: [`Happy Hopping, ${username}`, `Spring into it, ${username}`, `Hey, ${username}`], emoji: "🌱", gradient: "from-green-400 via-emerald-500 to-green-400" },
    summer: { pool: [`Happy Hopping, ${username}`, `Ride the wave, ${username}`, `Hey, ${username}`], emoji: "☀️", gradient: "from-yellow-400 via-orange-500 to-yellow-400" },
    fall:   { pool: [`Happy Hopping, ${username}`, `Cozy rides, ${username}`, `Hey, ${username}`], emoji: "🍂", gradient: "from-amber-500 via-orange-600 to-red-500" },
    winter: { pool: [`Happy Hopping, ${username}`, `Stay warm, ${username}`, `Hey, ${username}`], emoji: "❄️", gradient: "from-blue-400 via-cyan-500 to-blue-400" },
  };

  let season = "spring";
  if (month >= 2 && month <= 4) season = "spring";
  else if (month >= 5 && month <= 7) season = "summer";
  else if (month >= 8 && month <= 9) season = "fall";
  else season = "winter";

  const s = greetings[season];
  return { greeting: s.pool[day % s.pool.length], emoji: s.emoji, gradient: s.gradient };
}

function getRoleColors(role: "driver" | "rider") {
  if (role === "driver") {
    return {
      nameColor: "text-green-600 dark:text-green-400",
      labelAccent: "text-green-500",
      dotColor: "bg-green-500",
    };
  }
  return {
    nameColor: "text-blue-600 dark:text-blue-400",
    labelAccent: "text-blue-500",
    dotColor: "bg-blue-500",
  };
}

function WeatherIcon({ condition, className }: { condition: string; className?: string }) {
  const c = className || "w-4 h-4";
  switch (condition) {
    case "snow": return <CloudSnow className={`${c} text-blue-400`} />;
    case "rain": return <CloudRain className={`${c} text-blue-500`} />;
    case "storm": return <CloudLightning className={`${c} text-yellow-500`} />;
    case "fog": return <CloudFog className={`${c} text-gray-400`} />;
    case "cloudy": return <Cloud className={`${c} text-gray-400`} />;
    default: return <Sun className={`${c} text-yellow-500`} />;
  }
}

function Particles({ condition }: { condition: string }) {
  const count = condition === "snow" ? 35 : condition === "rain" || condition === "storm" ? 40 : 0;
  const particles = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 3,
      duration: condition === "snow" ? 3 + Math.random() * 4 : 0.6 + Math.random() * 0.6,
      size: condition === "snow" ? 3 + Math.random() * 5 : 1.5,
      drift: condition === "snow" ? (Math.random() - 0.5) * 30 : 0,
      opacity: 0.4 + Math.random() * 0.5,
    })),
  [condition, count]);

  if (count === 0) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-xl" data-testid="weather-particles">
      {particles.map(p => (
        <div
          key={p.id}
          className={condition === "snow" ? "weather-snow" : "weather-rain"}
          style={{
            position: "absolute",
            left: `${p.left}%`,
            top: "-8px",
            width: condition === "snow" ? `${p.size}px` : `${p.size}px`,
            height: condition === "snow" ? `${p.size}px` : `${p.size * 6}px`,
            opacity: p.opacity,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            ...(condition === "snow"
              ? { ["--drift" as any]: `${p.drift}px` }
              : {}
            ),
          }}
        />
      ))}
    </div>
  );
}

function getWeatherTip(condition: string, temp: number): string | null {
  if (condition === "storm") return "Storms in Lex — maybe wait this one out";
  if (condition === "snow") return "Snow in Lexington — hop carefully today";
  if (condition === "rain") return "Rain today — good time for a covered hop";
  if (temp >= 100) return "Triple digits — stay cool out there";
  if (temp <= 20) return "Freezing — bundle up before you hop";
  return null;
}

export function SeasonalGreeting({
  username,
  testId,
  role = "rider",
}: {
  username: string;
  testId: string;
  role?: "driver" | "rider";
}) {
  const { greeting, emoji, gradient } = getSeasonInfo(username);
  const { nameColor, dotColor } = getRoleColors(role);

  const { data: weather } = useQuery<WeatherData>({
    queryKey: ["/api/weather"],
    refetchInterval: 15 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });

  const condition = weather?.condition || "clear";
  const tip = weather ? getWeatherTip(condition, weather.temp) : null;

  return (
    <div data-testid={testId} className="relative">
      <div className="relative overflow-hidden rounded-xl px-3 py-2.5">
        <Particles condition={condition} />

        <div className="relative z-10">
          <div className="flex items-center gap-1.5 mb-1">
            <div className={`w-1.5 h-1.5 rounded-full ${dotColor} animate-pulse`} />
            <p className={`text-[10px] uppercase tracking-[0.2em] font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
              SHORTHOP
            </p>
            <div className="h-px flex-1 bg-gradient-to-r from-border/60 to-transparent" />
            {weather && (
              <div className="flex items-center gap-1" data-testid="weather-badge">
                <WeatherIcon condition={condition} className="w-3.5 h-3.5" />
                <span className="text-[11px] font-bold text-foreground/80">{weather.temp}°</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-2xl leading-none" data-testid="seasonal-emoji">{emoji}</span>
            <h1 className={`text-lg font-display font-extrabold tracking-tight ${nameColor}`}>
              {greeting}
            </h1>
          </div>

          {tip && (
            <div className="flex items-center gap-1.5 mt-1.5 pl-0.5" data-testid="weather-tip">
              <WeatherIcon condition={condition} className="w-3 h-3" />
              <p className="text-[10px] text-muted-foreground font-medium">{tip}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
