import type { JoinSessionInput } from '@kahin/qcm-application';

export type AnswerBodyPayload = {
  sessionId: string;
  participantId: string;
  questionId: string;
  choiceId?: string;
  word?: string;
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

export function validateAnswerBody(
  sessionId: string,
  body: unknown
): AnswerBodyPayload {
  const b = body as {
    participantId?: unknown;
    questionId?: unknown;
    choiceId?: unknown;
    word?: unknown;
  };
  const { participantId, questionId, choiceId, word } = b;
  if (!participantId || !questionId) {
    throw new Error('participantId and questionId required');
  }
  if (choiceId != null && word != null) {
    throw new Error(
      'provide either choiceId (QCM) or word (nuage de mots), not both'
    );
  }
  if (choiceId == null && word == null) {
    throw new Error('choiceId (QCM) or word (nuage de mots) required');
  }
  const payload: AnswerBodyPayload = {
    sessionId,
    participantId: String(participantId),
    questionId: String(questionId),
  };
  if (choiceId != null) payload.choiceId = String(choiceId);
  if (word != null) payload.word = String(word).trim();
  return payload;
}
