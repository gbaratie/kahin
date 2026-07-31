import type { SaveQuestionInput } from '@kahin/qcm-application';
import type { QuestionType } from '@kahin/qcm-domain';

type RawBody = {
  id?: unknown;
  label?: unknown;
  type?: unknown;
  choices?: unknown;
  correctChoiceIndex?: unknown;
  expectedNumber?: unknown;
  scoringRange?: unknown;
  timerSeconds?: unknown;
  themeId?: unknown;
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

export function validateQuestionBody(body: RawBody): SaveQuestionInput {
  if (body.label == null || String(body.label).trim() === '') {
    throw new Error('label required');
  }
  const type = parseQuestionType(body.type) ?? 'qcm';
  const rawChoices = Array.isArray(body.choices) ? body.choices : [];
  const choices =
    type === 'word_cloud' || type === 'closest'
      ? []
      : rawChoices.map((c) => ({
          label: String(
            c && typeof c === 'object' && 'label' in c
              ? (c as { label?: unknown }).label ?? ''
              : ''
          ),
        }));

  const expectedNumber = parseOptionalNumber(body.expectedNumber);
  const scoringRange = parseOptionalNumber(body.scoringRange);

  if (type === 'closest' && expectedNumber === undefined) {
    throw new Error('expectedNumber required for closest question');
  }

  return {
    id: typeof body.id === 'string' && body.id.trim() ? body.id.trim() : undefined,
    label: String(body.label),
    type,
    choices,
    correctChoiceIndex:
      type === 'qcm' && typeof body.correctChoiceIndex === 'number'
        ? body.correctChoiceIndex
        : undefined,
    expectedNumber: type === 'closest' ? expectedNumber : undefined,
    scoringRange:
      type === 'closest' && scoringRange !== undefined && scoringRange > 0
        ? scoringRange
        : undefined,
    timerSeconds:
      typeof body.timerSeconds === 'number' && body.timerSeconds >= 1
        ? Math.min(300, Math.floor(body.timerSeconds))
        : undefined,
    themeId:
      body.themeId === null
        ? null
        : typeof body.themeId === 'string'
          ? body.themeId
          : undefined,
  };
}
