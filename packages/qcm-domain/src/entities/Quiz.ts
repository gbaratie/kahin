import type { Question } from './Question';

export type Quiz = {
  id: string;
  title: string;
  /** Coefficient pour la moyenne annuelle (défaut 1). */
  coefficient?: number;
  questions: Question[];
};
