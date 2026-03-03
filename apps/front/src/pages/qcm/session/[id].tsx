import Head from 'next/head';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import LoadingScreen from '@/components/common/LoadingScreen';
import ErrorAlert from '@/components/common/ErrorAlert';
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
        <ErrorAlert message="Session introuvable." />
      </Layout>
    );
  }

  if (loading) {
    return <LoadingScreen title="Session" />;
  }

  if (error || !session) {
    return (
      <Layout>
        <Head>
          <title>Session</title>
        </Head>
        <ErrorAlert
          message={error?.message ?? 'Session introuvable.'}
          onRetry={() => window.location.reload()}
          retryLabel="Recharger"
        />
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
