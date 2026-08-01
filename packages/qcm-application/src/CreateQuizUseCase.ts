import type {
  Quiz,
  Question,
  Choice,
  QuestionType,
  PlayMode,
} from '@kahin/qcm-domain';
import type { QuizRepository } from '@kahin/qcm-domain';
import { parsePlayMode } from '@kahin/qcm-domain';

export type QuizQuestionInput = {
  /** Si fourni : réutilise l’identité en banque (partage entre QCM). */
  id?: string;
  label: string;
  type?: QuestionType;
  choices: Array<{ label: string }>;
  correctChoiceIndex?: number;
  expectedNumber?: number;
  scoringRange?: number;
  timerSeconds?: number;
  themeId?: string | null;
  /** Mode dans ce QCM uniquement. */
  playMode?: PlayMode;
};

export type CreateQuizInput = {
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

const DEFAULT_QCM_TIMER = 10;
const DEFAULT_WORD_CLOUD_TIMER = 180;
const DEFAULT_CLOSEST_TIMER = 15;

export function buildQuestionFromInput(
  input: QuizQuestionInput,
  options?: {
    existing?: Question | null;
  }
): Question {
  const type = input.type ?? 'qcm';
  const existing = options?.existing ?? null;
  const choices: Choice[] =
    type === 'word_cloud' || type === 'closest'
      ? []
      : input.choices.map((c) => {
          const same = existing?.choices.find((bc) => bc.label === c.label);
          return { id: same?.id ?? crypto.randomUUID(), label: c.label };
        });
  const defaultTimer =
    type === 'word_cloud'
      ? DEFAULT_WORD_CLOUD_TIMER
      : type === 'closest'
        ? DEFAULT_CLOSEST_TIMER
        : DEFAULT_QCM_TIMER;
  const themeId =
    input.themeId === null
      ? undefined
      : (input.themeId ?? existing?.themeId);

  const expectedNumber =
    type === 'closest' && typeof input.expectedNumber === 'number'
      ? input.expectedNumber
      : type === 'closest'
        ? existing?.expectedNumber
        : undefined;
  if (type === 'closest' && typeof expectedNumber !== 'number') {
    throw new Error('expectedNumber required for closest question');
  }
  const scoringRange =
    type === 'closest' &&
    typeof input.scoringRange === 'number' &&
    input.scoringRange > 0
      ? input.scoringRange
      : type === 'closest'
        ? existing?.scoringRange
        : undefined;

  return {
    id: existing?.id ?? input.id ?? crypto.randomUUID(),
    label: input.label,
    type,
    choices,
    correctChoiceId:
      type === 'qcm' && input.correctChoiceIndex !== undefined
        ? choices[input.correctChoiceIndex]?.id
        : undefined,
    expectedNumber,
    scoringRange,
    timerSeconds: input.timerSeconds ?? existing?.timerSeconds ?? defaultTimer,
    themeId,
    playMode: parsePlayMode(input.playMode ?? existing?.playMode),
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
      coefficient: normalizeCoefficient(input.coefficient),
      questions,
    };

    await this.quizRepository.save(quiz);
    return quiz;
  }
}
