import type { Question } from '../entities/Question';

export type QuestionSort = 'label' | 'theme';

export type QuestionListFilters = {
  themeId?: string | null;
  sort?: QuestionSort;
};

export type QuestionSummary = {
  id: string;
  label: string;
  type?: Question['type'];
  themeId?: string;
  timerSeconds?: number;
  choiceCount: number;
};

export interface QuestionRepository {
  list(filters?: QuestionListFilters): Promise<Question[]>;
  listSummaries(filters?: QuestionListFilters): Promise<QuestionSummary[]>;
  getById(id: string): Promise<Question | null>;
  save(question: Question): Promise<void>;
  delete(id: string): Promise<void>;
}
