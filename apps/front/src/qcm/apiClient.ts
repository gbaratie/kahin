/**
 * Client API pour le front unifié : quiz, sessions, join, answer, etc.
 * Utilisé quand NEXT_PUBLIC_API_URL est défini.
 */
import type { CreateQuizInput } from '@kahin/qcm-application';
import type {
  JoinSessionInput,
  JoinSessionResult,
} from '@kahin/qcm-application';
import type { Quiz, Session } from '@kahin/qcm-domain';

export const getApiUrl = () =>
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

export type QuizSummary = { id: string; title: string };

export const apiListQuizzes = {
  async execute(): Promise<QuizSummary[]> {
    const { data, error } = await apiFetch<QuizSummary[]>('/api/quiz');
    if (error) throw new Error(error);
    return Array.isArray(data) ? data : [];
  },
};

export const apiGetQuiz = {
  async execute(quizId: string): Promise<Quiz | null> {
    const { data, error } = await apiFetch<Quiz>(
      `/api/quiz/${encodeURIComponent(quizId)}`
    );
    if (error && error !== 'Quiz not found') throw new Error(error);
    return data ?? null;
  },
};

export const apiDeleteQuiz = {
  async execute(quizId: string): Promise<void> {
    const { error } = await apiFetch(
      `/api/quiz/${encodeURIComponent(quizId)}`,
      { method: 'DELETE' }
    );
    if (error) throw new Error(error);
  },
};

export const apiCreateQuiz = {
  async execute(input: CreateQuizInput): Promise<Quiz> {
    const { data, error } = await apiFetch<Quiz>('/api/quiz', {
      method: 'POST',
      body: JSON.stringify({
        title: input.title,
        questions: input.questions.map((q) => ({
          label: q.label,
          choices: (q.choices ?? []).map((c) => ({ label: c.label })),
        })),
      }),
    });
    if (error) throw new Error(error);
    if (!data) throw new Error('Create quiz failed');
    return data;
  },
};

export const apiLaunchSession = {
  async execute(quizId: string): Promise<Session> {
    const { data, error } = await apiFetch<Session>(
      `/api/quiz/${encodeURIComponent(quizId)}/launch`,
      { method: 'POST' }
    );
    if (error) throw new Error(error);
    if (!data) throw new Error('Launch failed');
    return data;
  },
};

export const apiGetSession = {
  async execute(sessionId: string): Promise<Session | null> {
    const { data, error } = await apiFetch<Session>(
      `/api/session/${encodeURIComponent(sessionId)}`
    );
    if (error && error !== 'Session not found') throw new Error(error);
    return data ?? null;
  },
};

export const apiNextQuestion = {
  async execute(sessionId: string): Promise<{ finished: boolean }> {
    const { data, error } = await apiFetch<{ finished: boolean }>(
      `/api/session/${encodeURIComponent(sessionId)}/next`,
      { method: 'POST' }
    );
    if (error) throw new Error(error);
    if (!data) throw new Error('Next question failed');
    return data;
  },
};

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
