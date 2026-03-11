function getSeasonalGreeting(username: string): { label: string; greeting: string; emoji: string; gradient: string; textColor: string } {
  const now = new Date();
  const month = now.getMonth();
  const day = now.getDate();

  if (month === 11 && day >= 20 || month === 0 && day <= 2) {
    return {
      label: "SHORTHOP",
      greeting: `Hoppy Christmas, ${username}`,
      emoji: "🎄",
      gradient: "from-red-500 via-green-600 to-red-500",
      textColor: "text-green-700 dark:text-green-400",
    };
  }

  if (month === 9) {
    return {
      label: "SHORTHOP",
      greeting: `Hoppy Halloween, ${username}`,
      emoji: "🎃",
      gradient: "from-orange-500 via-purple-600 to-orange-500",
      textColor: "text-orange-600 dark:text-orange-400",
    };
  }

  if (month === 1 && day >= 7 && day <= 14) {
    return {
      label: "SHORTHOP",
      greeting: `Hoppy Valentine's Day, ${username}`,
      emoji: "💝",
      gradient: "from-pink-500 via-red-500 to-pink-500",
      textColor: "text-pink-600 dark:text-pink-400",
    };
  }

  if (month === 2 || month === 3 || month === 4) {
    const springGreetings = [
      `Happy Hopping, ${username}`,
      `Spring into it, ${username}`,
      `Hey, ${username}`,
    ];
    return {
      label: "SHORTHOP",
      greeting: springGreetings[day % springGreetings.length],
      emoji: "🌱",
      gradient: "from-green-400 via-emerald-500 to-green-400",
      textColor: "text-green-600 dark:text-green-400",
    };
  }

  if (month === 5 || month === 6 || month === 7) {
    const summerGreetings = [
      `Happy Hopping, ${username}`,
      `Ride the wave, ${username}`,
      `Hey, ${username}`,
    ];
    return {
      label: "SHORTHOP",
      greeting: summerGreetings[day % summerGreetings.length],
      emoji: "☀️",
      gradient: "from-yellow-400 via-orange-500 to-yellow-400",
      textColor: "text-orange-600 dark:text-orange-400",
    };
  }

  if (month === 8 || month === 9) {
    if (month === 9) {
      return {
        label: "SHORTHOP",
        greeting: `Hoppy Halloween, ${username}`,
        emoji: "🎃",
        gradient: "from-orange-500 via-purple-600 to-orange-500",
        textColor: "text-orange-600 dark:text-orange-400",
      };
    }
    const fallGreetings = [
      `Happy Hopping, ${username}`,
      `Cozy rides, ${username}`,
      `Hey, ${username}`,
    ];
    return {
      label: "SHORTHOP",
      greeting: fallGreetings[day % fallGreetings.length],
      emoji: "🍂",
      gradient: "from-amber-500 via-orange-600 to-red-500",
      textColor: "text-amber-600 dark:text-amber-400",
    };
  }

  if (month === 10 || month === 11) {
    const winterGreetings = [
      `Happy Hopping, ${username}`,
      `Stay warm, ${username}`,
      `Hey, ${username}`,
    ];
    return {
      label: "SHORTHOP",
      greeting: winterGreetings[day % winterGreetings.length],
      emoji: "❄️",
      gradient: "from-blue-400 via-cyan-500 to-blue-400",
      textColor: "text-blue-600 dark:text-blue-400",
    };
  }

  return {
    label: "SHORTHOP",
    greeting: `Happy Hopping, ${username}`,
    emoji: "🚗",
    gradient: "from-primary via-secondary to-primary",
    textColor: "text-primary",
  };
}

export function SeasonalGreeting({ username, testId }: { username: string; testId: string }) {
  const { label, greeting, emoji, gradient, textColor } = getSeasonalGreeting(username);

  return (
    <div data-testid={testId}>
      <div className="flex items-center gap-1.5 mb-0.5">
        <p className={`text-[10px] uppercase tracking-[0.2em] font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
          {label}
        </p>
        <div className="h-px flex-1 bg-gradient-to-r from-border/60 to-transparent" />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-2xl leading-none" data-testid="seasonal-emoji">{emoji}</span>
        <h1 className={`text-lg font-display font-extrabold tracking-tight ${textColor}`}>
          {greeting}
        </h1>
      </div>
    </div>
  );
}
