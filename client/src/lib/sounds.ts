let driverApproachingAudio: HTMLAudioElement | null = null;
let driverApproachingTimer: ReturnType<typeof setTimeout> | null = null;

const SOUND_DURATION_KEY = "sh-driver-sound-duration";

export type DriverSoundDuration = "full" | "short";

export function getDriverSoundDuration(): DriverSoundDuration {
  try {
    const val = localStorage.getItem(SOUND_DURATION_KEY);
    if (val === "short" || val === "full") return val;
  } catch {}
  return "full";
}

export function setDriverSoundDuration(duration: DriverSoundDuration) {
  try {
    localStorage.setItem(SOUND_DURATION_KEY, duration);
    window.dispatchEvent(new CustomEvent("sh-sound-duration-change", { detail: duration }));
  } catch {}
}

export function playDriverApproachingSound() {
  try {
    const prefs = localStorage.getItem("shorthop-notification-preferences");
    if (prefs) {
      const parsed = JSON.parse(prefs);
      if (parsed.driverApproachingSound === false) return;
    }

    if (!driverApproachingAudio) {
      driverApproachingAudio = new Audio("/driver-approaching-new.m4a");
      driverApproachingAudio.volume = 0.85;
    }

    if (driverApproachingTimer) {
      clearTimeout(driverApproachingTimer);
      driverApproachingTimer = null;
    }

    driverApproachingAudio.currentTime = 0;
    driverApproachingAudio.play().catch(() => {});

    const duration = getDriverSoundDuration();
    if (duration === "short") {
      driverApproachingTimer = setTimeout(() => {
        if (driverApproachingAudio) {
          driverApproachingAudio.pause();
          driverApproachingAudio.currentTime = 0;
        }
      }, 3000);
    }
  } catch {}
}

export function stopDriverApproachingSound() {
  try {
    if (driverApproachingTimer) {
      clearTimeout(driverApproachingTimer);
      driverApproachingTimer = null;
    }
    if (driverApproachingAudio) {
      driverApproachingAudio.pause();
      driverApproachingAudio.currentTime = 0;
    }
  } catch {}
}

export function isSoundEnabled(): boolean {
  try {
    const prefs = localStorage.getItem("shorthop-notification-preferences");
    if (prefs) {
      const parsed = JSON.parse(prefs);
      return parsed.driverApproachingSound !== false;
    }
  } catch {}
  return true;
}
