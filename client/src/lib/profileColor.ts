const TAILWIND_TO_HEX: Record<string, string> = {
  "text-orange-500": "#f97316",
  "text-violet-500": "#8b5cf6",
  "text-cyan-500": "#06b6d4",
  "text-rose-500": "#f43f5e",
  "text-lime-500": "#84cc16",
  "text-amber-400": "#fbbf24",
  "text-sky-500": "#0ea5e9",
  "text-fuchsia-500": "#d946ef",
};

export function getProfileColorHex(value: string | null | undefined, fallback = "#f97316"): string {
  if (!value) return fallback;
  const trimmed = value.trim();
  if (trimmed.startsWith("#")) return trimmed;
  if (TAILWIND_TO_HEX[trimmed]) return TAILWIND_TO_HEX[trimmed];
  return fallback;
}

export function isHexColor(value: string | null | undefined): boolean {
  if (!value) return false;
  return /^#[0-9a-fA-F]{6}$/.test(value.trim());
}

export function getStoredProfileColor(): string {
  try {
    return localStorage.getItem("sh-profile-tab-color") || "#f97316";
  } catch {
    return "#f97316";
  }
}
