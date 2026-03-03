import { useCallback } from 'react';
import type { SubmitAnswerInput } from '@kahin/qcm-application';
import { useQcmDependencies } from '../QcmDependenciesContext';
import { useAsyncCall } from '@/hooks/useAsyncCall';

export function useSubmitAnswer() {
  const { submitAnswer } = useQcmDependencies();
  const { execute, loading, error } = useAsyncCall(
    useCallback(
      (input: SubmitAnswerInput) => submitAnswer.execute(input),
      [submitAnswer]
    ),
    { clearResultOnExecute: false }
  );
  return { execute, loading, error };
}
