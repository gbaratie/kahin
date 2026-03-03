import type { Choice } from './Choice';

export type Question = {
  id: string;
  label: string;
  choices: Choice[];
  correctChoiceId?: string;
  /** Durée en secondes pour répondre (défaut 10). */
  timerSeconds?: number;
};
