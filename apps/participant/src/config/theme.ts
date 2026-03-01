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
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: { border: '1px solid rgba(255,255,255,0.08)' },
      },
    },
  },
});

export default theme;
