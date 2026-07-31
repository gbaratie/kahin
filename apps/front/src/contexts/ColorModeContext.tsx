import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { ThemeProvider, CssBaseline, type PaletteMode } from '@mui/material';
import { createAppTheme } from '@/config/theme';

export type ColorModePreference = 'system' | 'light' | 'dark';

export type ColorModeContextValue = {
  /** Préférence utilisateur (ou « system » pour suivre l’OS). */
  preference: ColorModePreference;
  /** Mode effectif appliqué à l’UI. */
  resolvedMode: PaletteMode;
  setPreference: (preference: ColorModePreference) => void;
  /** Enchaîne system → light → dark → system. */
  cyclePreference: () => void;
};

const STORAGE_KEY = 'kahin-color-mode';

const ColorModeContext = createContext<ColorModeContextValue | null>(null);

function readStoredPreference(): ColorModePreference {
  if (typeof window === 'undefined') return 'system';
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
  } catch {
    /* ignore */
  }
  return 'system';
}

function getSystemMode(): PaletteMode {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function resolveMode(
  preference: ColorModePreference,
  systemMode: PaletteMode
): PaletteMode {
  return preference === 'system' ? systemMode : preference;
}

const CYCLE_ORDER: ColorModePreference[] = ['system', 'light', 'dark'];

export function ColorModeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] =
    useState<ColorModePreference>('system');
  const [systemMode, setSystemMode] = useState<PaletteMode>('dark');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setPreferenceState(readStoredPreference());
    setSystemMode(getSystemMode());
    setHydrated(true);

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event: MediaQueryListEvent) => {
      setSystemMode(event.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const setPreference = useCallback((next: ColorModePreference) => {
    setPreferenceState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const cyclePreference = useCallback(() => {
    setPreferenceState((current) => {
      const index = CYCLE_ORDER.indexOf(current);
      const next = CYCLE_ORDER[(index + 1) % CYCLE_ORDER.length];
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const resolvedMode = useMemo(
    () => resolveMode(preference, systemMode),
    [preference, systemMode]
  );

  const theme = useMemo(() => createAppTheme(resolvedMode), [resolvedMode]);

  const value = useMemo<ColorModeContextValue>(
    () => ({
      preference: hydrated ? preference : 'system',
      resolvedMode,
      setPreference,
      cyclePreference,
    }),
    [hydrated, preference, resolvedMode, setPreference, cyclePreference]
  );

  return (
    <ColorModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

export function useColorMode(): ColorModeContextValue {
  const ctx = useContext(ColorModeContext);
  if (!ctx) {
    throw new Error('useColorMode must be used within ColorModeProvider');
  }
  return ctx;
}
