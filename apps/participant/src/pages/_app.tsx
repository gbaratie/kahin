import type { AppProps } from 'next/app';
import Head from 'next/head';
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from '@/config/theme';
import { QcmDependenciesProvider } from '@/qcm/QcmDependenciesContext';

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta name="viewport" content="initial-scale=1, width=device-width" />
      </Head>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <QcmDependenciesProvider>
          <Component {...pageProps} />
        </QcmDependenciesProvider>
      </ThemeProvider>
    </>
  );
}
