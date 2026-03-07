import type { CreateQuizInput } from '@kahin/qcm-application';
import type { QuestionType } from '@kahin/qcm-domain';

type RawQuestion = {
  label?: string;
  type?: string;
  choices?: Array<{ label?: string }>;
  correctChoiceIndex?: number;
  timerSeconds?: number;
};

type RawBody = {
  title?: unknown;
  questions?: unknown;
};

function parseQuestionType(v: unknown): QuestionType | undefined {
  if (v === 'qcm' || v === 'word_cloud') return v;
  return undefined;
}

export function validateQuizBody(body: RawBody): CreateQuizInput {
  const { title, questions } = body;
  if (!title || !Array.isArray(questions)) {
    throw new Error('title and questions required');
  }
  return {
    title: String(title),
    questions: (questions as RawQuestion[]).map((q) => {
      const type = parseQuestionType(q?.type) ?? 'qcm';
      const choices =
        type === 'word_cloud'
          ? []
          : (q?.choices ?? []).map((c) => ({
              label: String(c?.label ?? ''),
            }));
      return {
        label: String(q?.label ?? ''),
        type,
        choices,
        correctChoiceIndex:
          type === 'qcm' && typeof q?.correctChoiceIndex === 'number'
            ? q.correctChoiceIndex
            : undefined,
        timerSeconds:
          typeof q?.timerSeconds === 'number' && q.timerSeconds >= 1
            ? Math.min(300, Math.floor(q.timerSeconds))
            : undefined,
      };
    }),
  };
}
