import { useCallback } from 'react';
import { useQcmDependencies } from '../QcmDependenciesContext';
import { useAsyncCall } from '@/hooks/useAsyncCall';

export function useNextQuestion() {
  const { nextQuestion } = useQcmDependencies();
  const { execute, loading, error, result } = useAsyncCall(
    useCallback(
      (sessionId: string) => nextQuestion.execute(sessionId),
      [nextQuestion]
    )
  );
  return {
    execute,
    loading,
    error,
    finished: result?.finished ?? false,
  };
}
