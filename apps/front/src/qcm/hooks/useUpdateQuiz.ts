import { useCallback } from 'react';
import type { Quiz } from '@kahin/qcm-domain';
import type { UpdateQuizInput } from '@kahin/qcm-application';
import { apiUpdateQuiz } from '../apiClient';
import { useAsyncCall } from '@/hooks/useAsyncCall';

export function useUpdateQuiz() {
  const {
    execute,
    loading,
    error,
    result: quiz,
  } = useAsyncCall(
    useCallback(
      (quizId: string, input: UpdateQuizInput) =>
        apiUpdateQuiz.execute(quizId, input),
      []
    )
  );
  return { execute, loading, error, quiz: quiz as Quiz | null };
}
