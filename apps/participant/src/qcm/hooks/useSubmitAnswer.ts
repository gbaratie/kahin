import { useState, useCallback } from 'react';
import type { SubmitAnswerInput } from '@kahin/qcm-application';
import { useQcmDependencies } from '../QcmDependenciesContext';

export function useSubmitAnswer() {
  const { submitAnswer } = useQcmDependencies();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async (input: SubmitAnswerInput) => {
      setLoading(true);
      setError(null);
      try {
        await submitAnswer.execute(input);
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [submitAnswer]
  );

  return { execute, loading, error };
}
