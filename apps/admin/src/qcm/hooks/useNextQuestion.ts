import { useState, useCallback } from 'react';
import { useQcmDependencies } from '../QcmDependenciesContext';

export function useNextQuestion() {
  const { nextQuestion } = useQcmDependencies();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [finished, setFinished] = useState(false);

  const execute = useCallback(
    async (sessionId: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await nextQuestion.execute(sessionId);
        setFinished(result.finished);
        return result;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [nextQuestion]
  );

  return { execute, loading, error, finished };
}
