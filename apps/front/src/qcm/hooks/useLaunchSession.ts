import { useState, useCallback } from 'react';
import type { Session } from '@kahin/qcm-domain';
import { useQcmDependencies } from '../QcmDependenciesContext';

export function useLaunchSession() {
  const { launchSession } = useQcmDependencies();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  const execute = useCallback(
    async (quizId: string) => {
      setLoading(true);
      setError(null);
      setSession(null);
      try {
        const result = await launchSession.execute(quizId);
        setSession(result);
        return result;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [launchSession]
  );

  return { execute, loading, error, session };
}
