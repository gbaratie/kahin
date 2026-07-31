import type { AppProps } from 'next/app';
import Head from 'next/head';
import { QcmDependenciesProvider } from '@/qcm/QcmDependenciesContext';
import { AdminAuthProvider } from '@/contexts/AdminAuthContext';
import { ColorModeProvider } from '@/contexts/ColorModeContext';

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta name="viewport" content="initial-scale=1, width=device-width" />
      </Head>
      <ColorModeProvider>
        <QcmDependenciesProvider>
          <AdminAuthProvider>
            <Component {...pageProps} />
          </AdminAuthProvider>
        </QcmDependenciesProvider>
      </ColorModeProvider>
    </>
  );
}
