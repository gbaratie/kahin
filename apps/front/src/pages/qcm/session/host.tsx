import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import AdminRouteGuard from '@/components/AdminRouteGuard';
import LoadingScreen from '@/components/common/LoadingScreen';
import ErrorAlert from '@/components/common/ErrorAlert';
import { SessionHostView } from '@/qcm/components/SessionHostView';
import { useSession } from '@/qcm/hooks/useSession';

/** Page statique (export GitHub Pages) : `sessionId` en query, pas en segment dynamique. */
function QcmSessionPageContent() {
  const router = useRouter();
  const sessionId =
    typeof router.query.sessionId === 'string' ? router.query.sessionId : null;
  const { session, loading, error } = useSession(sessionId);

  if (!router.isReady) {
    return <LoadingScreen title="Session" />;
  }

  if (!sessionId) {
    return (
      <Layout>
        <Head>
          <title>Session</title>
        </Head>
        <ErrorAlert message="Paramètre sessionId manquant." />
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

export default function QcmSessionPage() {
  return (
    <AdminRouteGuard>
      <QcmSessionPageContent />
    </AdminRouteGuard>
  );
}
