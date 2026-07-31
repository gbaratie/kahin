import type { Question, Choice, QuestionType } from '@kahin/qcm-domain';
import type { QuestionRepository } from '@kahin/qcm-domain';

export type SaveQuestionInput = {
  id?: string;
  label: string;
  type?: QuestionType;
  choices: Array<{ label: string }>;
  correctChoiceIndex?: number;
  expectedNumber?: number;
  scoringRange?: number;
  timerSeconds?: number;
  themeId?: string | null;
};

const DEFAULT_QCM_TIMER = 10;
const DEFAULT_WORD_CLOUD_TIMER = 180;
const DEFAULT_CLOSEST_TIMER = 15;

export class SaveQuestionUseCase {
  constructor(private readonly questionRepository: QuestionRepository) {}

  async execute(input: SaveQuestionInput): Promise<Question> {
    const label = input.label.trim();
    if (!label) {
      const err = new Error('Question label required');
      (err as Error & { code?: string }).code = 'QUESTION_LABEL_REQUIRED';
      throw err;
    }

    const existing = input.id
      ? await this.questionRepository.getById(input.id)
      : null;
    if (input.id && !existing) {
      const err = new Error('Question not found');
      (err as Error & { code?: string }).code = 'QUESTION_NOT_FOUND';
      throw err;
    }

    const type = input.type ?? 'qcm';
    if (type === 'closest' && typeof input.expectedNumber !== 'number') {
      const err = new Error('expectedNumber required for closest question');
      (err as Error & { code?: string }).code = 'EXPECTED_NUMBER_REQUIRED';
      throw err;
    }

    const choices: Choice[] =
      type === 'word_cloud' || type === 'closest'
        ? []
        : input.choices.map((c) => {
            const same = existing?.choices.find((bc) => bc.label === c.label);
            return {
              id: same?.id ?? crypto.randomUUID(),
              label: c.label,
            };
          });
    const defaultTimer =
      type === 'word_cloud'
        ? DEFAULT_WORD_CLOUD_TIMER
        : type === 'closest'
          ? DEFAULT_CLOSEST_TIMER
          : DEFAULT_QCM_TIMER;

    const question: Question = {
      id: existing?.id ?? crypto.randomUUID(),
      label,
      type,
      choices,
      correctChoiceId:
        type === 'qcm' && input.correctChoiceIndex !== undefined
          ? choices[input.correctChoiceIndex]?.id
          : undefined,
      expectedNumber:
        type === 'closest' ? input.expectedNumber : undefined,
      scoringRange:
        type === 'closest' &&
        typeof input.scoringRange === 'number' &&
        input.scoringRange > 0
          ? input.scoringRange
          : undefined,
      timerSeconds: input.timerSeconds ?? defaultTimer,
      themeId:
        input.themeId === null
          ? undefined
          : (input.themeId ?? existing?.themeId),
    };

    await this.questionRepository.save(question);
    return question;
  }
}
