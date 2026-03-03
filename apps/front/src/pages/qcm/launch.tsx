import React, { useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Box, Typography, Alert } from '@mui/material';
import Layout from '@/components/Layout';
import LoadingScreen from '@/components/common/LoadingScreen';
import ErrorAlert from '@/components/common/ErrorAlert';
import { useLaunchSession } from '@/qcm/hooks/useLaunchSession';
import { SessionHostView } from '@/qcm/components/SessionHostView';
import { layout } from '@/config/layout';

export default function QcmLaunchPage() {
  const router = useRouter();
  const quizId =
    typeof router.query.quizId === 'string' ? router.query.quizId : null;
  const {
    execute: launchSession,
    loading,
    error,
    session,
  } = useLaunchSession();

  useEffect(() => {
    if (quizId && !session && !loading && !error) {
      launchSession(quizId).catch(() => {});
    }
  }, [quizId, session, loading, error, launchSession]);

  if (!quizId) {
    return (
      <Layout>
        <Head>
          <title>Lancer une session</title>
        </Head>
        <Box sx={{ ...layout.pagePaddingAuto }}>
          <Alert severity="warning">Aucun quiz sélectionné.</Alert>
          <Typography sx={{ mt: 2 }}>
            Créez un QCM puis cliquez sur &quot;Créer et lancer&quot;.
          </Typography>
        </Box>
      </Layout>
    );
  }

  if (loading && !session) {
    return <LoadingScreen title="Lancement…" />;
  }

  if (error && !session) {
    return (
      <Layout>
        <Head>
          <title>Erreur</title>
        </Head>
        <ErrorAlert message={error.message} />
      </Layout>
    );
  }

  if (!session) return null;

  return (
    <Layout>
      <Head>
        <title>Session — {session.code}</title>
      </Head>
      <SessionHostView sessionId={session.id} sessionCode={session.code} />
    </Layout>
  );
}
