/**
 * Client API pour le participant : join, getSession, submitAnswer.
 * Utilisé quand NEXT_PUBLIC_API_URL est défini pour partager l'état avec l'admin via l'API.
 */
import type {
  JoinSessionInput,
  JoinSessionResult,
} from '@kahin/qcm-application';
import type { Session, Quiz } from '@kahin/qcm-domain';

const getApiUrl = () =>
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';

async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<{ data?: T; error?: string }> {
  const base = getApiUrl();
  if (!base) return { error: 'NEXT_PUBLIC_API_URL non configuré' };
  const url = `${base}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { error: (body as { error?: string }).error ?? res.statusText };
  }
  return { data: body as T };
}

/** Join session via API — même signature que JoinSessionUseCase.execute */
export const apiJoinSession = {
  async execute(input: JoinSessionInput): Promise<JoinSessionResult> {
    const { data, error } = await apiFetch<JoinSessionResult>(
      '/api/session/join',
      {
        method: 'POST',
        body: JSON.stringify({
          code: input.code.trim().toUpperCase(),
          participantName: input.participantName?.trim() || 'Participant',
        }),
      }
    );
    if (error) throw new Error(error);
    if (!data) throw new Error('Join failed');
    return data;
  },
};

/** Get session via API — même signature que GetSessionUseCase.execute */
export const apiGetSession = {
  async execute(sessionId: string): Promise<Session | null> {
    const { data, error } = await apiFetch<Session>(
      `/api/session/${sessionId}`
    );
    if (error && error !== 'Session not found') throw new Error(error);
    return data ?? null;
  },
};

/** Get quiz by ID via API (pour dériver la question courante en mode polling) */
export const apiGetQuiz = {
  async execute(quizId: string): Promise<Quiz | null> {
    const { data, error } = await apiFetch<Quiz>(
      `/api/quiz/${encodeURIComponent(quizId)}`
    );
    if (error && error !== 'Quiz not found') throw new Error(error);
    return data ?? null;
  },
};

/** Submit answer via API — même signature que SubmitAnswerUseCase.execute */
export const apiSubmitAnswer = {
  async execute(input: {
    sessionId: string;
    participantId: string;
    questionId: string;
    choiceId: string;
  }): Promise<void> {
    const { error } = await apiFetch(`/api/session/${input.sessionId}/answer`, {
      method: 'POST',
      body: JSON.stringify({
        participantId: input.participantId,
        questionId: input.questionId,
        choiceId: input.choiceId,
      }),
    });
    if (error) throw new Error(error);
  },
};

export function isApiMode(): boolean {
  return Boolean(getApiUrl());
}
