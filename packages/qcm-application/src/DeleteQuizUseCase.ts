import type { QuizRepository } from '@kahin/qcm-domain';

export class DeleteQuizUseCase {
  constructor(private readonly quizRepository: QuizRepository) {}

  async execute(id: string): Promise<void> {
    const existing = await this.quizRepository.getById(id);
    if (!existing) {
      const err = new Error('Quiz not found');
      (err as Error & { code?: string }).code = 'QUIZ_NOT_FOUND';
      throw err;
    }
    await this.quizRepository.delete(id);
  }
}
