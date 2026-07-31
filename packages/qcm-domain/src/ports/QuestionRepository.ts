import type { Question } from '../entities/Question';

export type QuestionSummary = {
  id: string;
  label: string;
  type?: Question['type'];
  themeId?: string;
  timerSeconds?: number;
  choiceCount: number;
};

export interface QuestionRepository {
  list(filters?: { themeId?: string | null }): Promise<Question[]>;
  listSummaries(filters?: {
    themeId?: string | null;
  }): Promise<QuestionSummary[]>;
  getById(id: string): Promise<Question | null>;
  save(question: Question): Promise<void>;
  delete(id: string): Promise<void>;
}
