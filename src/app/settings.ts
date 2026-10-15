export interface Settings {
  sfxOn: boolean;
  musicOn: boolean;
  sfxVolume: number;
  musicVolume: number;
  reducedMotion: boolean;
}

const KEY = 'lww.settings.v1';

export function defaultSettings(): Settings {
  const prefersReduced = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  return { sfxOn: true, musicOn: true, sfxVolume: 0.8, musicVolume: 0.35, reducedMotion: prefersReduced };
}

/** Settings are small per-device preferences, so localStorage is appropriate (wrapped: it can throw). */
export function loadSettings(): Settings {
  const d = defaultSettings();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return d;
    const v = JSON.parse(raw) as Partial<Settings>;
    return {
      sfxOn: typeof v.sfxOn === 'boolean' ? v.sfxOn : d.sfxOn,
      musicOn: typeof v.musicOn === 'boolean' ? v.musicOn : d.musicOn,
      sfxVolume: typeof v.sfxVolume === 'number' ? Math.max(0, Math.min(1, v.sfxVolume)) : d.sfxVolume,
      musicVolume: typeof v.musicVolume === 'number' ? Math.max(0, Math.min(1, v.musicVolume)) : d.musicVolume,
      reducedMotion: typeof v.reducedMotion === 'boolean' ? v.reducedMotion : d.reducedMotion,
    };
  } catch {
    return d;
  }
}

export function storeSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* preferences simply won't persist */
  }
}
