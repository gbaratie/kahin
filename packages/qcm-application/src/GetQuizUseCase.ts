import type { Quiz } from '@kahin/qcm-domain';
import type { QuizRepository } from '@kahin/qcm-domain';

export class GetQuizUseCase {
  constructor(private readonly quizRepository: QuizRepository) {}

  async execute(id: string): Promise<Quiz> {
    const quiz = await this.quizRepository.getById(id);
    if (!quiz) {
      const err = new Error('Quiz not found');
      (err as Error & { code?: string }).code = 'QUIZ_NOT_FOUND';
      throw err;
    }
    return quiz;
  }
}
