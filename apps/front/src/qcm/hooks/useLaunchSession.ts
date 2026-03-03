import { useCallback } from 'react';
import type { Session } from '@kahin/qcm-domain';
import { useQcmDependencies } from '../QcmDependenciesContext';
import { useAsyncCall } from '@/hooks/useAsyncCall';

export function useLaunchSession() {
  const { launchSession } = useQcmDependencies();
  const {
    execute,
    loading,
    error,
    result: session,
  } = useAsyncCall(
    useCallback(
      (quizId: string) => launchSession.execute(quizId),
      [launchSession]
    )
  );
  return { execute, loading, error, session: session as Session | null };
}
