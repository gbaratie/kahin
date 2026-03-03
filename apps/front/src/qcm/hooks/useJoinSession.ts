import { useCallback } from 'react';
import type {
  JoinSessionResult,
  JoinSessionInput,
} from '@kahin/qcm-application';
import { useQcmDependencies } from '../QcmDependenciesContext';
import { useAsyncCall } from '@/hooks/useAsyncCall';

export function useJoinSession() {
  const { joinSession } = useQcmDependencies();
  const { execute, loading, error, result, clearError } = useAsyncCall(
    useCallback(
      (input: JoinSessionInput) => joinSession.execute(input),
      [joinSession]
    ),
    { clearResultOnExecute: true }
  );
  return {
    execute,
    loading,
    error,
    result: result as JoinSessionResult | null,
    clearError,
  };
}
