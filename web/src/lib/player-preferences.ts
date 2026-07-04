// Plain localStorage read/write — no cross-tab sync (each tab reads once on
// mount), that's not worth the complexity for a preference like this.
type PlayerPreferences = {
  volume: number;
  qualityHeight: number | null; // null = Auto
  playbackRate: number;
  autoplayEnabled: boolean;
};

const STORAGE_KEY = "yiyu:player-prefs";

const DEFAULT_PREFERENCES: PlayerPreferences = {
  volume: 1,
  qualityHeight: null,
  playbackRate: 1,
  autoplayEnabled: true,
};

export function loadPlayerPreferences(): PlayerPreferences {
  if (typeof window === "undefined") {
    return DEFAULT_PREFERENCES;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw
      ? { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) }
      : DEFAULT_PREFERENCES;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function savePlayerPreferences(patch: Partial<PlayerPreferences>) {
  if (typeof window === "undefined") {
    return;
  }
  const current = loadPlayerPreferences();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...patch }));
}
