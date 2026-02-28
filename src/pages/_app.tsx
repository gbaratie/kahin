import type { AppProps } from 'next/app';
import Head from 'next/head';
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from '@/src/config';

/**
 * Composant App personnalisé utilisé par Next.js pour initialiser les pages.
 * Enveloppe chaque page avec le ThemeProvider MUI et injecte les styles de base.
 * Le titre et la description du site peuvent être surchargés dans chaque page via Head.
 */
function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta name="viewport" content="initial-scale=1, width=device-width" />
      </Head>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Component {...pageProps} />
      </ThemeProvider>
    </>
  );
}

export default MyApp;
