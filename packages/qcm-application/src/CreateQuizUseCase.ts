import type { Quiz, Question, Choice } from '@kahin/qcm-domain';
import type { QuizRepository } from '@kahin/qcm-domain';

export type CreateQuizInput = {
  title: string;
  questions: Array<{
    label: string;
    choices: Array<{ label: string }>;
    correctChoiceIndex?: number;
    timerSeconds?: number;
  }>;
};

export class CreateQuizUseCase {
  constructor(private readonly quizRepository: QuizRepository) {}

  async execute(input: CreateQuizInput): Promise<Quiz> {
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
      id: crypto.randomUUID(),
      title: input.title,
      questions,
    };

    await this.quizRepository.save(quiz);
    return quiz;
  }
}
