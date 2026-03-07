import type { Participant } from './Participant';
import type { Answer } from './Answer';

export type SessionStatus = 'waiting' | 'in_progress' | 'finished';

export type Session = {
  id: string;
  quizId: string;
  code: string;
  status: SessionStatus;
  /** Index de la question affichée (ou de la dernière question dont on affiche le résultat). -1 = pas encore démarré. */
  currentQuestionIndex: number;
  /** true = on affiche la page résultat (scores) ; false = on affiche la question (réponses acceptées). */
  showingResult?: boolean;
  /** Pour chaque index i, date d’affichage de la question i (pour timer et score pondéré). */
  questionShownAtTimestamps?: (Date | null)[];
  participants: Participant[];
  answers: Answer[];
};
