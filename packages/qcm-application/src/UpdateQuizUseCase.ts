import type { Quiz, Question, Choice } from '@kahin/qcm-domain';
import type { QuizRepository } from '@kahin/qcm-domain';

export type UpdateQuizInput = {
  title: string;
  questions: Array<{
    label: string;
    choices: Array<{ label: string }>;
    correctChoiceIndex?: number;
    timerSeconds?: number;
  }>;
};

export class UpdateQuizUseCase {
  constructor(private readonly quizRepository: QuizRepository) {}

  async execute(quizId: string, input: UpdateQuizInput): Promise<Quiz> {
    const existing = await this.quizRepository.getById(quizId);
    if (!existing) {
      const err = new Error('Quiz not found');
      (err as Error & { code?: string }).code = 'QUIZ_NOT_FOUND';
      throw err;
    }

    const questions: Question[] = input.questions.map((q, qIndex) => {
      const choices: Choice[] = q.choices.map((c) => ({
        id: crypto.randomUUID(),
        label: c.label,
      }));
      return {
        id: crypto.randomUUID(),
        label: q.label,
        choices,
        correctChoiceId:
          q.correctChoiceIndex !== undefined
            ? choices[q.correctChoiceIndex]?.id
            : undefined,
        timerSeconds: q.timerSeconds ?? 10,
      };
    });

    const quiz: Quiz = {
      id: quizId,
      title: input.title,
      questions,
    };

    await this.quizRepository.save(quiz);
    return quiz;
  }
}
