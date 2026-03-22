import type { QuizRepository, QuizSummary } from '@kahin/qcm-domain';

export class ListQuizzesUseCase {
  constructor(private readonly quizRepository: QuizRepository) {}

  async execute(): Promise<QuizSummary[]> {
    return this.quizRepository.list();
  }
}
