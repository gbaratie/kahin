/**
 * Client API pour l'admin : createQuiz, launchSession, getSession, nextQuestion.
 * Utilisé quand NEXT_PUBLIC_API_URL est défini pour partager l'état avec le participant via l'API.
 */
import type { CreateQuizInput } from '@kahin/qcm-application';
import type { Quiz, Session } from '@kahin/qcm-domain';

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

export type QuizSummary = { id: string; title: string };

/** List quizzes via API */
export const apiListQuizzes = {
  async execute(): Promise<QuizSummary[]> {
    const { data, error } = await apiFetch<QuizSummary[]>('/api/quiz');
    if (error) throw new Error(error);
    return Array.isArray(data) ? data : [];
  },
};

/** Get quiz by ID via API */
export const apiGetQuiz = {
  async execute(quizId: string): Promise<Quiz | null> {
    const { data, error } = await apiFetch<Quiz>(
      `/api/quiz/${encodeURIComponent(quizId)}`
    );
    if (error && error !== 'Quiz not found') throw new Error(error);
    return data ?? null;
  },
};

/** Create quiz via API */
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

/** Launch session via API */
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

/** Get session via API */
export const apiGetSession = {
  async execute(sessionId: string): Promise<Session | null> {
    const { data, error } = await apiFetch<Session>(
      `/api/session/${encodeURIComponent(sessionId)}`
    );
    if (error && error !== 'Session not found') throw new Error(error);
    return data ?? null;
  },
};

/** Next question via API */
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

export function isApiMode(): boolean {
  return Boolean(getApiUrl());
}
