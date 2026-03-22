import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import LoadingScreen from '@/components/common/LoadingScreen';
import { useAdminAuth } from '@/contexts/AdminAuthContext';

type AdminRouteGuardProps = {
  children: React.ReactNode;
};

/**
 * Redirige vers l’accueil si l’utilisateur n’a pas accès animateur.
 */
export default function AdminRouteGuard({ children }: AdminRouteGuardProps) {
  const router = useRouter();
  const { isAdmin, authResolved } = useAdminAuth();

  useEffect(() => {
    if (authResolved && !isAdmin) {
      void router.replace('/');
    }
  }, [authResolved, isAdmin, router]);

  if (!authResolved) {
    return (
      <Layout>
        <LoadingScreen title="Chargement…" />
      </Layout>
    );
  }

  if (!isAdmin) {
    return (
      <Layout>
        <LoadingScreen title="Redirection…" />
      </Layout>
    );
  }

  return <>{children}</>;
}
