import { useCallback } from 'react';
import type { Quiz } from '@kahin/qcm-domain';
import type { CreateQuizInput } from '@kahin/qcm-application';
import { useQcmDependencies } from '../QcmDependenciesContext';
import { useAsyncCall } from '@/hooks/useAsyncCall';

export function useCreateQuiz() {
  const { createQuiz } = useQcmDependencies();
  const {
    execute,
    loading,
    error,
    result: quiz,
  } = useAsyncCall(
    useCallback(
      (input: CreateQuizInput) => createQuiz.execute(input),
      [createQuiz]
    )
  );
  return { execute, loading, error, quiz: quiz as Quiz | null };
}
