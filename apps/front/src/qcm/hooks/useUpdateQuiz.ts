import { useState, useCallback } from 'react';
import type { Quiz } from '@kahin/qcm-domain';
import type { UpdateQuizInput } from '@kahin/qcm-application';
import { apiUpdateQuiz } from '../apiClient';

export function useUpdateQuiz() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);

  const execute = useCallback(
    async (quizId: string, input: UpdateQuizInput) => {
      setLoading(true);
      setError(null);
      setQuiz(null);
      try {
        const result = await apiUpdateQuiz.execute(quizId, input);
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
    []
  );

  return { execute, loading, error, quiz };
}
