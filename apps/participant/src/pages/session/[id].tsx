import Head from 'next/head';
import { useRouter } from 'next/router';
import { Box, Typography, Alert } from '@mui/material';
import Layout from '@/components/Layout';
import { SessionParticipantView } from '@/qcm/components/SessionParticipantView';

/**
 * Page session participant : vue participant (sessionId + participantId requis).
 */
export default function SessionPage() {
  const router = useRouter();
  const sessionId =
    typeof router.query.id === 'string' ? router.query.id : null;
  const participantId =
    typeof router.query.participantId === 'string'
      ? router.query.participantId
      : null;

  if (!sessionId || !participantId) {
    return (
      <Layout>
        <Head>
          <title>Session</title>
        </Head>
        <Box sx={{ p: 4 }}>
          <Alert severity="warning">
            Lien de session invalide. Rejoignez la session depuis la page
            d&apos;accueil avec le code et votre nom.
          </Alert>
          <Typography color="text.secondary" sx={{ mt: 2 }}>
            Session ou participant manquant.
          </Typography>
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Participer au QCM</title>
      </Head>
      <SessionParticipantView
        sessionId={sessionId}
        participantId={participantId}
      />
    </Layout>
  );
}
