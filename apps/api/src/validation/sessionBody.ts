import type { JoinSessionInput } from '@kahin/qcm-application';

export type AnswerBodyPayload = {
  sessionId: string;
  participantId: string;
  questionId: string;
  choiceId?: string;
  word?: string;
  numberValue?: number;
};

export function validateJoinBody(body: unknown): JoinSessionInput {
  const code = (body as { code?: unknown })?.code;
  const participantName = (body as { participantName?: unknown })
    ?.participantName;
  if (!code || !participantName) {
    throw new Error('code and participantName required');
  }
  return {
    code: String(code).trim().toUpperCase(),
    participantName: String(participantName).trim() || 'Participant',
  };
}

function parseNumberValue(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v.replace(',', '.'));
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

export function validateAnswerBody(
  sessionId: string,
  body: unknown
): AnswerBodyPayload {
  const b = body as {
    participantId?: unknown;
    questionId?: unknown;
    choiceId?: unknown;
    word?: unknown;
    numberValue?: unknown;
  };
  const { participantId, questionId, choiceId, word } = b;
  const numberValue = parseNumberValue(b.numberValue);
  if (!participantId || !questionId) {
    throw new Error('participantId and questionId required');
  }
  const provided = [
    choiceId != null,
    word != null,
    numberValue !== undefined,
  ].filter(Boolean).length;
  if (provided > 1) {
    throw new Error(
      'provide either choiceId (QCM), word (nuage de mots) or numberValue (au plus proche), not several'
    );
  }
  if (provided === 0) {
    throw new Error(
      'choiceId (QCM), word (nuage de mots) or numberValue (au plus proche) required'
    );
  }
  const payload: AnswerBodyPayload = {
    sessionId,
    participantId: String(participantId),
    questionId: String(questionId),
  };
  if (choiceId != null) payload.choiceId = String(choiceId);
  if (word != null) payload.word = String(word).trim();
  if (numberValue !== undefined) payload.numberValue = numberValue;
  return payload;
}
