import type { Quiz } from '../entities/Quiz';

export type QuizSummary = { id: string; title: string; coefficient?: number };

export interface QuizRepository {
  save(quiz: Quiz): Promise<void>;
  getById(id: string): Promise<Quiz | null>;
  list(): Promise<QuizSummary[]>;
  delete(id: string): Promise<void>;
  /** Met à jour uniquement le coefficient (sans toucher aux questions). */
  updateCoefficient?(quizId: string, coefficient: number): Promise<void>;
}
