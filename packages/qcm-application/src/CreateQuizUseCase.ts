import type { Quiz, Question, Choice, QuestionType } from '@kahin/qcm-domain';
import type { QuizRepository } from '@kahin/qcm-domain';

export type CreateQuizInput = {
  title: string;
  questions: Array<{
    label: string;
    type?: QuestionType;
    choices: Array<{ label: string }>;
    correctChoiceIndex?: number;
    timerSeconds?: number;
  }>;
};

const DEFAULT_QCM_TIMER = 10;
const DEFAULT_WORD_CLOUD_TIMER = 180;

export class CreateQuizUseCase {
  constructor(private readonly quizRepository: QuizRepository) {}

  async execute(input: CreateQuizInput): Promise<Quiz> {
    const questions: Question[] = input.questions.map((q) => {
      const type = q.type ?? 'qcm';
      const choices: Choice[] =
        type === 'word_cloud'
          ? []
          : q.choices.map((c) => ({
              id: crypto.randomUUID(),
              label: c.label,
            }));
      const defaultTimer =
        type === 'word_cloud' ? DEFAULT_WORD_CLOUD_TIMER : DEFAULT_QCM_TIMER;
      return {
        id: crypto.randomUUID(),
        label: q.label,
        type,
        choices,
        correctChoiceId:
          type === 'qcm' && q.correctChoiceIndex !== undefined
            ? choices[q.correctChoiceIndex]?.id
            : undefined,
        timerSeconds: q.timerSeconds ?? defaultTimer,
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
