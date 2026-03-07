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
