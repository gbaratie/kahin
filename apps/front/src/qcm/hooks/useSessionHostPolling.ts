import { useEffect } from 'react';
import {
  PARTICIPANTS_POLL_INTERVAL_MS,
  WORD_CLOUD_POLL_INTERVAL_MS,
} from '../sessionHostConstants';

type Params = {
  sessionId: string;
  isWaiting: boolean;
  refetch: () => void;
  lastAnswer: unknown;
  isDisplayedQuestionWordCloud: boolean;
  isApi: boolean;
};

/**
 * Rafraîchissements périodiques de la session (participants, nuage de mots, mode local).
 */
export function useSessionHostPolling({
  sessionId,
  isWaiting,
  refetch,
  lastAnswer,
  isDisplayedQuestionWordCloud,
  isApi,
}: Params): void {
  useEffect(() => {
    if (!sessionId || !isWaiting) return;
    const interval = setInterval(
      () => refetch(),
      PARTICIPANTS_POLL_INTERVAL_MS
    );
    return () => clearInterval(interval);
  }, [sessionId, isWaiting, refetch]);

  useEffect(() => {
    if (!sessionId || !lastAnswer || !isDisplayedQuestionWordCloud) return;
    refetch();
  }, [sessionId, lastAnswer, isDisplayedQuestionWordCloud, refetch]);

  useEffect(() => {
    if (!isApi || !sessionId || !isDisplayedQuestionWordCloud) return;
    const interval = setInterval(() => refetch(), WORD_CLOUD_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isApi, sessionId, isDisplayedQuestionWordCloud, refetch]);
}
