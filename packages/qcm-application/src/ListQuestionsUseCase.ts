import type { Question } from '@kahin/qcm-domain';
import type { QuestionRepository, QuestionSummary } from '@kahin/qcm-domain';

export class ListQuestionsUseCase {
  constructor(private readonly questionRepository: QuestionRepository) {}

  async execute(filters?: {
    themeId?: string | null;
    summaries?: boolean;
  }): Promise<Question[] | QuestionSummary[]> {
    if (filters?.summaries) {
      return this.questionRepository.listSummaries({
        themeId: filters.themeId,
      });
    }
    return this.questionRepository.list({ themeId: filters?.themeId });
  }
}
