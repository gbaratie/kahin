import type { Session } from '@kahin/qcm-domain';

/**
 * Phase « résultat de la question seul » : réponses fermées, répartition affichable,
 * pas encore le classement cumulé (voir `Session.showingResult` / `showingCumulativeRanking`).
 */
export function isPerQuestionFeedbackPhase(
  session: Session | null | undefined
): boolean {
  if (!session || session.status !== 'in_progress') return false;
  return (
    Boolean(session.showingResult) && session.showingCumulativeRanking === false
  );
}
