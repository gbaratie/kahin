import type { CreateQuizInput } from '@kahin/qcm-application';

type RawQuestion = {
  label?: string;
  choices?: Array<{ label?: string }>;
  correctChoiceIndex?: number;
};

type RawBody = {
  title?: unknown;
  questions?: unknown;
};

export function validateQuizBody(body: RawBody): CreateQuizInput {
  const { title, questions } = body;
  if (!title || !Array.isArray(questions)) {
    throw new Error('title and questions required');
  }
  return {
    title: String(title),
    questions: (questions as RawQuestion[]).map((q) => ({
      label: String(q?.label ?? ''),
      choices: (q?.choices ?? []).map((c) => ({
        label: String(c?.label ?? ''),
      })),
      correctChoiceIndex:
        typeof q?.correctChoiceIndex === 'number'
          ? q.correctChoiceIndex
          : undefined,
    })),
  };
}
