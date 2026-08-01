import type { Quiz, Question } from '@kahin/qcm-domain';
import type { QuizRepository, QuestionRepository } from '@kahin/qcm-domain';
import {
  buildQuestionFromInput,
  type QuizQuestionInput,
} from './CreateQuizUseCase';

export type UpdateQuizInput = {
  title: string;
  coefficient?: number;
  questions: QuizQuestionInput[];
};

function normalizeCoefficient(value: unknown): number {
  const n =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : NaN;
  if (!Number.isFinite(n) || n <= 0) return 1;
  return n;
}

export class UpdateQuizUseCase {
  constructor(
    private readonly quizRepository: QuizRepository,
    private readonly questionRepository?: QuestionRepository
  ) {}

  async execute(quizId: string, input: UpdateQuizInput): Promise<Quiz> {
    const existing = await this.quizRepository.getById(quizId);
    if (!existing) {
      const err = new Error('Quiz not found');
      (err as Error & { code?: string }).code = 'QUIZ_NOT_FOUND';
      throw err;
    }

    const questions: Question[] = [];
    for (const q of input.questions) {
      let bank: Question | null = null;
      if (q.id) {
        bank =
          (await this.questionRepository?.getById(q.id)) ??
          existing.questions.find((eq) => eq.id === q.id) ??
          null;
      }
      questions.push(buildQuestionFromInput(q, { existing: bank }));
    }

    const quiz: Quiz = {
      id: quizId,
      title: input.title,
      coefficient: normalizeCoefficient(
        input.coefficient ?? existing.coefficient
      ),
      questions,
    };

    await this.quizRepository.save(quiz);
    return quiz;
  }
}
