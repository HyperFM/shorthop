// ============================================================
// SHORTHOP ICON ROTATION LOGIC
// Icons switch on the 27th of each month. No surprises before then.
// December 27th always shows a birthday icon.
// Other months use the configured seasonal icon (if probability hit).
// ============================================================

import { useEffect } from "react";
import { Platform } from "react-native";
import * as Application from "expo-application";
import { SEASONAL_CONFIG, BIRTHDAY_MONTH, BIRTHDAY_ICONS, DEFAULT_ICON } from "./iconConfig";

// Seeded random -- deterministic per year+month so app opens consistently
// show the same icon all month. No storage needed.
function seededRandom(seed) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function pickRandom(array, seed) {
  if (!array || array.length === 0) return null;
  const idx = Math.floor(seededRandom(seed) * array.length);
  return array[idx];
}

function getTargetIcon() {
  const now = new Date();
  const day   = now.getDate();
  const month = now.getMonth() + 1; // 1-12
  const year  = now.getFullYear();

  // Only switch on or after the 27th
  if (day < 27) return DEFAULT_ICON;

  // Unique seed per year+month
  const seed = year * 100 + month;

  // December 27th is always birthday -- override Christmas icons
  if (month === BIRTHDAY_MONTH && day >= 27 && BIRTHDAY_ICONS.length > 0) {
    return pickRandom(BIRTHDAY_ICONS, seed) || DEFAULT_ICON;
  }

  // Other months: check probability then pick an icon
  const config = SEASONAL_CONFIG[month];
  if (!config || config.icons.length === 0) return DEFAULT_ICON;

  const rand = seededRandom(seed);
  if (rand > config.probability) return DEFAULT_ICON;

  // Avoid repeating last year's same-month icon (when multiple variants exist)
  if (config.icons.length > 1) {
    const prevSeed  = (year - 1) * 100 + month;
    const prevIcon  = pickRandom(config.icons, prevSeed);
    const eligible  = config.icons.filter(i => i !== prevIcon);
    return pickRandom(eligible.length > 0 ? eligible : config.icons, seed + 1) || DEFAULT_ICON;
  }

  return config.icons[0];
}

export default function useIconRotation() {
  useEffect(() => {
    if (Platform.OS !== "ios") return;
    if (!Application.setAlternateIconNameAsync) return;

    const target = getTargetIcon();

    Application.setAlternateIconNameAsync(target).catch(() => {
      // Silently ignore -- icon switching is non-critical
    });
  }, []);
}
