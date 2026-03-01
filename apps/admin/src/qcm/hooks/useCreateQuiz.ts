import { useState, useCallback } from 'react';
import type { Quiz } from '@kahin/qcm-domain';
import type { CreateQuizInput } from '@kahin/qcm-application';
import { useQcmDependencies } from '../QcmDependenciesContext';

export function useCreateQuiz() {
  const { createQuiz } = useQcmDependencies();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);

  const execute = useCallback(
    async (input: CreateQuizInput) => {
      setLoading(true);
      setError(null);
      setQuiz(null);
      try {
        const result = await createQuiz.execute(input);
        setQuiz(result);
        return result;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [createQuiz]
  );

  return { execute, loading, error, quiz };
}
