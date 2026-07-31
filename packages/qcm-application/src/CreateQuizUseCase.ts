import type { Quiz, Question, Choice, QuestionType } from '@kahin/qcm-domain';
import type { QuizRepository } from '@kahin/qcm-domain';

export type QuizQuestionInput = {
  /** Si fourni : réutilise l’identité en banque (partage entre QCM). */
  id?: string;
  label: string;
  type?: QuestionType;
  choices: Array<{ label: string }>;
  correctChoiceIndex?: number;
  timerSeconds?: number;
  themeId?: string | null;
};

export type CreateQuizInput = {
  title: string;
  questions: QuizQuestionInput[];
};

const DEFAULT_QCM_TIMER = 10;
const DEFAULT_WORD_CLOUD_TIMER = 180;

export function buildQuestionFromInput(
  input: QuizQuestionInput,
  options?: {
    existing?: Question | null;
  }
): Question {
  const type = input.type ?? 'qcm';
  const existing = options?.existing ?? null;
  const choices: Choice[] =
    type === 'word_cloud'
      ? []
      : input.choices.map((c) => {
          const same = existing?.choices.find((bc) => bc.label === c.label);
          return { id: same?.id ?? crypto.randomUUID(), label: c.label };
        });
  const defaultTimer =
    type === 'word_cloud' ? DEFAULT_WORD_CLOUD_TIMER : DEFAULT_QCM_TIMER;
  const themeId =
    input.themeId === null
      ? undefined
      : (input.themeId ?? existing?.themeId);

  return {
    id: existing?.id ?? input.id ?? crypto.randomUUID(),
    label: input.label,
    type,
    choices,
    correctChoiceId:
      type === 'qcm' && input.correctChoiceIndex !== undefined
        ? choices[input.correctChoiceIndex]?.id
        : undefined,
    timerSeconds: input.timerSeconds ?? existing?.timerSeconds ?? defaultTimer,
    themeId,
  };
}

export class CreateQuizUseCase {
  constructor(private readonly quizRepository: QuizRepository) {}

  async execute(input: CreateQuizInput): Promise<Quiz> {
    const questions: Question[] = input.questions.map((q) =>
      buildQuestionFromInput(q)
    );

    const quiz: Quiz = {
      id: crypto.randomUUID(),
      title: input.title,
      questions,
    };

    await this.quizRepository.save(quiz);
    return quiz;
  }
}
