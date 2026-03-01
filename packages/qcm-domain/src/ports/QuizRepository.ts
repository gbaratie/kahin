import type { Quiz } from '../entities/Quiz';

export type QuizSummary = { id: string; title: string };

export interface QuizRepository {
  save(quiz: Quiz): Promise<void>;
  getById(id: string): Promise<Quiz | null>;
  list(): Promise<QuizSummary[]>;
  delete(id: string): Promise<void>;
}
