import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import LoadingScreen from '@/components/common/LoadingScreen';

/** Ancienne URL `/qcm/roster` → `/qcm/classes`. */
export default function RosterRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    void router.replace('/qcm/classes');
  }, [router]);
  return (
    <Layout>
      <LoadingScreen title="Redirection…" />
    </Layout>
  );
}
