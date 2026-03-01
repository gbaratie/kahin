import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#7c9ce0', contrastText: '#0a0a0f' },
    secondary: { main: '#a8b8e0' },
    background: { default: '#0f1116', paper: '#161a22' },
    text: { primary: '#e8eaef', secondary: '#a0a8b8' },
    divider: 'rgba(255,255,255,0.08)',
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily:
      'Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h1: { fontSize: '2.5rem', fontWeight: 700 },
    h2: { fontSize: '2rem', fontWeight: 600 },
    h3: { fontSize: '1.5rem', fontWeight: 600 },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { border: '1px solid rgba(255,255,255,0.08)' },
      },
    },
  },
});

export default theme;
