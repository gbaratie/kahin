import type { Question } from '@kahin/qcm-domain';
import type { QuestionRepository } from '@kahin/qcm-domain';

export class GetQuestionUseCase {
  constructor(private readonly questionRepository: QuestionRepository) {}

  async execute(questionId: string): Promise<Question> {
    const question = await this.questionRepository.getById(questionId);
    if (!question) {
      const err = new Error('Question not found');
      (err as Error & { code?: string }).code = 'QUESTION_NOT_FOUND';
      throw err;
    }
    return question;
  }
}
