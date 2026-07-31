import type { PaletteMode } from '@mui/material';
import { createTheme, type Theme } from '@mui/material/styles';

const sharedTypography = {
  fontFamily:
    'Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  h1: { fontSize: '2.5rem', fontWeight: 700 },
  h2: { fontSize: '2rem', fontWeight: 600 },
  h3: { fontSize: '1.5rem', fontWeight: 600 },
} as const;

const darkPalette = {
  mode: 'dark' as const,
  primary: { main: '#7c9ce0', contrastText: '#0a0a0f' },
  secondary: { main: '#a8b8e0' },
  background: { default: '#0f1116', paper: '#161a22' },
  text: { primary: '#e8eaef', secondary: '#a0a8b8' },
  divider: 'rgba(255,255,255,0.08)',
};

const lightPalette = {
  mode: 'light' as const,
  primary: { main: '#3d5a9e', contrastText: '#ffffff' },
  secondary: { main: '#5a6b8c' },
  background: { default: '#f4f6fa', paper: '#ffffff' },
  text: { primary: '#1a1d26', secondary: '#5c6578' },
  divider: 'rgba(0,0,0,0.1)',
};

export function createAppTheme(mode: PaletteMode): Theme {
  const isDark = mode === 'dark';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  return createTheme({
    palette: isDark ? darkPalette : lightPalette,
    shape: { borderRadius: 8 },
    typography: sharedTypography,
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          html: { colorScheme: mode },
        },
      },
      // text-align: center so wrapped multi-line labels stay centered
      // (justify-content alone only centers the flex item as a whole).
      MuiButton: {
        styleOverrides: {
          root: {
            textAlign: 'center',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            border: `1px solid ${border}`,
            boxShadow: isDark
              ? '0 4px 20px rgba(0,0,0,0.25)'
              : '0 2px 12px rgba(0,0,0,0.08)',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { border: `1px solid ${border}` },
        },
      },
    },
  });
}

/** Thème sombre historique (rétrocompatibilité des imports). */
const theme = createAppTheme('dark');

export default theme;
