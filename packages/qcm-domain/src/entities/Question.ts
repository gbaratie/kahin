import type { Choice } from './Choice';

export type QuestionType = 'qcm' | 'word_cloud';

export type Question = {
  id: string;
  label: string;
  /** Type de question : QCM (choix) ou nuage de mots. Défaut 'qcm'. */
  type?: QuestionType;
  choices: Choice[];
  correctChoiceId?: string;
  /** Durée en secondes pour répondre (défaut 10 pour QCM, 180 pour word_cloud). */
  timerSeconds?: number;
};

/**
 * Détecte une question nuage de mots. Si `type` est absent (ex. anciennes données
 * Postgres sans colonne), seul un QCM valide a des choix : aucun choix ⇒ nuage.
 */
export function isWordCloudQuestion(
  q: Pick<Question, 'type' | 'choices'> | null | undefined
): boolean {
  if (!q) return false;
  if (q.type === 'word_cloud') return true;
  if (q.type === 'qcm') return false;
  return (q.choices?.length ?? 0) === 0;
}
