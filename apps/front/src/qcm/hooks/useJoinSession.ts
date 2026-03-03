import { useState, useCallback } from 'react';
import type {
  JoinSessionResult,
  JoinSessionInput,
} from '@kahin/qcm-application';
import { useQcmDependencies } from '../QcmDependenciesContext';

export function useJoinSession() {
  const { joinSession } = useQcmDependencies();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<JoinSessionResult | null>(null);

  const execute = useCallback(
    async (input: JoinSessionInput) => {
      setLoading(true);
      setError(null);
      setResult(null);
      try {
        const res = await joinSession.execute(input);
        setResult(res);
        return res;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        return undefined;
      } finally {
        setLoading(false);
      }
    },
    [joinSession]
  );

  const clearError = useCallback(() => setError(null), []);

  return { execute, loading, error, result, clearError };
}
