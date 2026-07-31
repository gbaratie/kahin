import type { SaveQuestionInput } from '@kahin/qcm-application';
import type { QuestionType } from '@kahin/qcm-domain';

type RawBody = {
  id?: unknown;
  label?: unknown;
  type?: unknown;
  choices?: unknown;
  correctChoiceIndex?: unknown;
  timerSeconds?: unknown;
  themeId?: unknown;
};

function parseQuestionType(v: unknown): QuestionType | undefined {
  if (v === 'qcm' || v === 'word_cloud') return v;
  return undefined;
}

export function validateQuestionBody(body: RawBody): SaveQuestionInput {
  if (body.label == null || String(body.label).trim() === '') {
    throw new Error('label required');
  }
  const type = parseQuestionType(body.type) ?? 'qcm';
  const rawChoices = Array.isArray(body.choices) ? body.choices : [];
  const choices =
    type === 'word_cloud'
      ? []
      : rawChoices.map((c) => ({
          label: String(
            c && typeof c === 'object' && 'label' in c
              ? (c as { label?: unknown }).label ?? ''
              : ''
          ),
        }));

  return {
    id: typeof body.id === 'string' && body.id.trim() ? body.id.trim() : undefined,
    label: String(body.label),
    type,
    choices,
    correctChoiceIndex:
      type === 'qcm' && typeof body.correctChoiceIndex === 'number'
        ? body.correctChoiceIndex
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
