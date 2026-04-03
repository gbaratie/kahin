import { useEffect } from 'react';
import { PARTICIPANTS_POLL_INTERVAL_MS } from '../sessionHostConstants';

type Params = {
  sessionId: string;
  isWaiting: boolean;
  refetch: () => void;
  lastAnswer: unknown;
  /** Question affichée, réponses ouvertes (QCM ou nuage de mots). */
  showLiveQuestion: boolean;
};

/**
 * Rafraîchissements périodiques de la session (participants, réponses pendant une question, mode local).
 */
export function useSessionHostPolling({
  sessionId,
  isWaiting,
  refetch,
  lastAnswer,
  showLiveQuestion,
}: Params): void {
  useEffect(() => {
    if (!sessionId || !isWaiting) return;
    const interval = setInterval(
      () => refetch(),
      PARTICIPANTS_POLL_INTERVAL_MS
    );
    return () => clearInterval(interval);
  }, [sessionId, isWaiting, refetch]);

  /** Réponses des participants (compteur animateur) + API sans événement temps réel. */
  useEffect(() => {
    if (!sessionId || !showLiveQuestion) return;
    const interval = setInterval(
      () => refetch(),
      PARTICIPANTS_POLL_INTERVAL_MS
    );
    return () => clearInterval(interval);
  }, [sessionId, showLiveQuestion, refetch]);

  useEffect(() => {
    if (!sessionId || !lastAnswer || !showLiveQuestion) return;
    refetch();
  }, [sessionId, lastAnswer, showLiveQuestion, refetch]);
}
