import { useState, useEffect, useCallback } from 'react';
import type { Session } from '@kahin/qcm-domain';
import { toError } from '@kahin/shared-utils';
import { useQcmDependencies } from '../QcmDependenciesContext';

export function useSession(sessionId: string | null) {
  const { getSession } = useQcmDependencies();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!!sessionId);
  const [error, setError] = useState<Error | null>(null);

  const fetchSession = useCallback(() => {
    if (!sessionId) return Promise.resolve(null);
    setLoading(true);
    setError(null);
    return getSession
      .execute(sessionId)
      .then((s) => {
        setSession(s);
        return s;
      })
      .catch((e) => {
        const err = toError(e);
        setError(err);
        throw err;
      })
      .finally(() => setLoading(false));
  }, [sessionId, getSession]);

  useEffect(() => {
    if (!sessionId) {
      setSession(null);
      setLoading(false);
      return;
    }
    fetchSession();
  }, [sessionId, fetchSession]);

  return { session, loading, error, refetch: fetchSession };
}
