import type { Question } from '@kahin/qcm-domain';
import type {
  QuestionRepository,
  QuestionSummary,
  QuestionSort,
} from '@kahin/qcm-domain';

export class ListQuestionsUseCase {
  constructor(private readonly questionRepository: QuestionRepository) {}

  async execute(filters?: {
    themeId?: string | null;
    sort?: QuestionSort;
    summaries?: boolean;
  }): Promise<Question[] | QuestionSummary[]> {
    const listFilters = {
      themeId: filters?.themeId,
      sort: filters?.sort ?? 'label',
    };
    if (filters?.summaries) {
      return this.questionRepository.listSummaries(listFilters);
    }
    return this.questionRepository.list(listFilters);
  }
}
