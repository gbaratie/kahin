import { useState, useCallback } from 'react';
import { toError } from '@kahin/shared-utils';

export interface UseAsyncCallOptions {
  clearResultOnExecute?: boolean;
}

/**
 * Hook générique pour un appel async : gère loading, error et result.
 */
export function useAsyncCall<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  options: UseAsyncCallOptions = {}
): {
  execute: (...args: TArgs) => Promise<TResult | undefined>;
  loading: boolean;
  error: Error | null;
  result: TResult | null;
  setResult: (value: TResult | null) => void;
  clearError: () => void;
} {
  const { clearResultOnExecute = true } = options;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<TResult | null>(null);

  const execute = useCallback(
    async (...args: TArgs): Promise<TResult | undefined> => {
      setLoading(true);
      setError(null);
      if (clearResultOnExecute) setResult(null);
      try {
        const value = await fn(...args);
        setResult(value);
        return value;
      } catch (e) {
        const err = toError(e);
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fn, clearResultOnExecute]
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    execute,
    loading,
    error,
    result,
    setResult,
    clearError,
  };
}
