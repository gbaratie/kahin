import type { Participant } from './Participant';
import type { Answer } from './Answer';

export type SessionStatus = 'waiting' | 'in_progress' | 'finished';

export type Session = {
  id: string;
  quizId: string;
  code: string;
  status: SessionStatus;
  /**
   * Classe liée à la session.
   * - `string` : les participants doivent choisir un nom de cette classe.
   * - `null` / absent : inscription libre (saisie du nom).
   */
  classId?: string | null;
  /** Index de la question affichée (ou de la dernière question dont on affiche le résultat). -1 = pas encore démarré. */
  currentQuestionIndex: number;
  /** true = phase après la question (réponses fermées, bonne réponse révélable) ; false = question en cours. */
  showingResult?: boolean;
  /**
   * Sous-étape quand `showingResult` est true :
   * - `false` (explicite) : résultat de la question seul (répartition, pas encore le classement cumulé).
   * - `true` ou absent : classement cumulé (comportement historique si absent).
   */
  showingCumulativeRanking?: boolean;
  /** Pour chaque index i, date d’affichage de la question i (pour timer et score pondéré). */
  questionShownAtTimestamps?: (Date | null)[];
  participants: Participant[];
  answers: Answer[];
};
