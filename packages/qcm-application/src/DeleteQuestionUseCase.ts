import type { QuestionRepository } from '@kahin/qcm-domain';

export class DeleteQuestionUseCase {
  constructor(private readonly questionRepository: QuestionRepository) {}

  async execute(questionId: string): Promise<void> {
    const existing = await this.questionRepository.getById(questionId);
    if (!existing) {
      const err = new Error('Question not found');
      (err as Error & { code?: string }).code = 'QUESTION_NOT_FOUND';
      throw err;
    }
    await this.questionRepository.delete(questionId);
  }
}
