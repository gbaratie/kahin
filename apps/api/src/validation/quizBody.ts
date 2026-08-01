import type { CreateQuizInput } from '@kahin/qcm-application';
import type { QuestionType, PlayMode } from '@kahin/qcm-domain';
import { parsePlayMode } from '@kahin/qcm-domain';

type RawQuestion = {
  id?: string;
  label?: string;
  type?: string;
  choices?: Array<{ label?: string }>;
  correctChoiceIndex?: number;
  expectedNumber?: number;
  scoringRange?: number;
  timerSeconds?: number;
  themeId?: string | null;
  playMode?: string;
};

type RawBody = {
  title?: unknown;
  coefficient?: unknown;
  questions?: unknown;
};

function parseQuestionType(v: unknown): QuestionType | undefined {
  if (v === 'qcm' || v === 'word_cloud' || v === 'closest') return v;
  return undefined;
}

function parseOptionalNumber(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

export function validateQuizBody(body: RawBody): CreateQuizInput {
  const { title, questions, coefficient } = body;
  if (!title || !Array.isArray(questions)) {
    throw new Error('title and questions required');
  }
  const coef = parseOptionalNumber(coefficient);
  return {
    title: String(title),
    coefficient: coef !== undefined && coef > 0 ? coef : undefined,
    questions: (questions as RawQuestion[]).map((q) => {
      const type = parseQuestionType(q?.type) ?? 'qcm';
      const choices =
        type === 'word_cloud' || type === 'closest'
          ? []
          : (q?.choices ?? []).map((c) => ({
              label: String(c?.label ?? ''),
            }));
      const expectedNumber = parseOptionalNumber(q?.expectedNumber);
      const scoringRange = parseOptionalNumber(q?.scoringRange);
      if (type === 'closest' && expectedNumber === undefined) {
        throw new Error('expectedNumber required for closest question');
      }
      const playMode: PlayMode = parsePlayMode(q?.playMode);
      return {
        id: typeof q?.id === 'string' && q.id.trim() ? q.id.trim() : undefined,
        label: String(q?.label ?? ''),
        type,
        choices,
        correctChoiceIndex:
          type === 'qcm' && typeof q?.correctChoiceIndex === 'number'
            ? q.correctChoiceIndex
            : undefined,
        expectedNumber: type === 'closest' ? expectedNumber : undefined,
        scoringRange:
          type === 'closest' && scoringRange !== undefined && scoringRange > 0
            ? scoringRange
            : undefined,
        timerSeconds:
          typeof q?.timerSeconds === 'number' && q.timerSeconds >= 1
            ? Math.min(300, Math.floor(q.timerSeconds))
            : undefined,
        themeId:
          q?.themeId === null
            ? null
            : typeof q?.themeId === 'string'
              ? q.themeId
              : undefined,
        playMode,
      };
    }),
  };
}
