import type { Choice } from './Choice';

export type QuestionType = 'qcm' | 'word_cloud' | 'closest';

export type Question = {
  id: string;
  label: string;
  /** Type de question : QCM, nuage de mots, ou au plus proche. Défaut 'qcm'. */
  type?: QuestionType;
  choices: Choice[];
  correctChoiceId?: string;
  /** Réponse attendue (type `closest`). */
  expectedNumber?: number;
  /**
   * Écart à partir duquel le score tombe à 0 (type `closest`).
   * Défaut : max(|expectedNumber|, 1).
   */
  scoringRange?: number;
  /** Durée en secondes pour répondre (défaut 10 pour QCM/closest, 180 pour word_cloud). */
  timerSeconds?: number;
  /** Thématique optionnelle dans la banque de questions. */
  themeId?: string;
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
  if (q.type === 'qcm' || q.type === 'closest') return false;
  return (q.choices?.length ?? 0) === 0;
}

/** Détecte une question « au plus proche » (réponse numérique). */
export function isClosestQuestion(
  q: Pick<Question, 'type'> | null | undefined
): boolean {
  return q?.type === 'closest';
}

/** Plage de scoring par défaut pour une question au plus proche. */
export function defaultClosestScoringRange(expectedNumber: number): number {
  return Math.max(Math.abs(expectedNumber), 1);
}
