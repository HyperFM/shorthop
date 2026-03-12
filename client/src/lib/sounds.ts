let driverApproachingAudio: HTMLAudioElement | null = null;

export function playDriverApproachingSound() {
  try {
    const prefs = localStorage.getItem("shorthop-notification-preferences");
    if (prefs) {
      const parsed = JSON.parse(prefs);
      if (parsed.driverApproachingSound === false) return;
    }
    if (!driverApproachingAudio) {
      driverApproachingAudio = new Audio("/driver-approaching-alert.m4a");
      driverApproachingAudio.volume = 0.8;
    }
    driverApproachingAudio.currentTime = 0;
    driverApproachingAudio.play().catch(() => {});
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
