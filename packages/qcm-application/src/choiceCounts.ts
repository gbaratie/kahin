import type { Question, Session } from '@kahin/qcm-domain';

export type ChoiceCountEntry = {
  choiceId: string;
  label: string;
  count: number;
};

/**
 * Compte les réponses QCM par choix pour une question donnée.
 */
export function computeChoiceCounts(
  session: Session,
  question: Question
): ChoiceCountEntry[] {
  const choices = question.choices ?? [];
  const counts = new Map<string, number>();
  for (const c of choices) {
    counts.set(c.id, 0);
  }
  for (const a of session.answers) {
    if (a.questionId !== question.id) continue;
    if (typeof a.choiceId !== 'string' || !a.choiceId) continue;
    counts.set(a.choiceId, (counts.get(a.choiceId) ?? 0) + 1);
  }
  return choices.map((c) => ({
    choiceId: c.id,
    label: c.label,
    count: counts.get(c.id) ?? 0,
  }));
}
