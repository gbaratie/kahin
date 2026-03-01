import Head from 'next/head';
import { useRouter } from 'next/router';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import Layout from '@/components/Layout';
import { SessionHostView } from '@/qcm/components/SessionHostView';
import { useSession } from '@/qcm/hooks/useSession';

export default function QcmSessionPage() {
  const router = useRouter();
  const sessionId =
    typeof router.query.id === 'string' ? router.query.id : null;
  const { session, loading, error } = useSession(sessionId);

  if (!sessionId) {
    return (
      <Layout>
        <Head>
          <title>Session</title>
        </Head>
        <Box sx={{ p: 4 }}>
          <Typography color="text.secondary">Session introuvable.</Typography>
        </Box>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <Head>
          <title>Session</title>
        </Head>
        <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  if (error || !session) {
    return (
      <Layout>
        <Head>
          <title>Session</title>
        </Head>
        <Box sx={{ p: 4 }}>
          <Alert severity="error">
            {error?.message ?? 'Session introuvable.'}
          </Alert>
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Session — {session.code}</title>
      </Head>
      <SessionHostView sessionId={session.id} sessionCode={session.code} />
    </Layout>
  );
}
