/**
 * Client API pour le front unifié : quiz, sessions, join, answer, etc.
 * Utilisé quand NEXT_PUBLIC_API_URL est défini.
 */
import type { CreateQuizInput, UpdateQuizInput } from '@kahin/qcm-application';
import type {
  JoinSessionInput,
  JoinSessionResult,
} from '@kahin/qcm-application';
import type { Quiz, Session } from '@kahin/qcm-domain';

export const getApiUrl = () =>
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';

const ADMIN_TOKEN_KEY = 'kahin_admin_token';

let onAdminUnauthorized: (() => void) | null = null;

export function setAdminUnauthorizedHandler(handler: (() => void) | null) {
  onAdminUnauthorized = handler;
}

export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAdminToken() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
}

/** Mode démo local : débloque l’UI animateur sans API (non sécurisé). */
export function isAdminBypassMode(): boolean {
  return process.env.NEXT_PUBLIC_BYPASS_ADMIN_AUTH === 'true';
}

type ApiFetchOptions = RequestInit & { requireAdminAuth?: boolean };

async function apiFetch<T>(
  path: string,
  options?: ApiFetchOptions
): Promise<{ data?: T; error?: string; status?: number }> {
  const base = getApiUrl();
  if (!base) return { error: 'NEXT_PUBLIC_API_URL non configuré' };
  const { requireAdminAuth, ...init } = options ?? {};
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };
  if (requireAdminAuth) {
    const t = getAdminToken();
    if (t) headers.Authorization = `Bearer ${t}`;
  }
  const url = `${base}${path}`;
  const res = await fetch(url, { ...init, headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && requireAdminAuth) {
      clearAdminToken();
      onAdminUnauthorized?.();
    }
    return {
      error: (body as { error?: string }).error ?? res.statusText,
      status: res.status,
    };
  }
  return { data: body as T };
}

export type QuizSummary = { id: string; title: string };

export const apiAuthLogin = {
  async execute(
    username: string,
    password: string
  ): Promise<{ token: string }> {
    const { data, error } = await apiFetch<{
      token: string;
      expiresIn: number;
    }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    if (error) throw new Error(error);
    if (!data?.token) throw new Error('Login failed');
    return { token: data.token };
  },
};

export const apiListQuizzes = {
  async execute(): Promise<QuizSummary[]> {
    const { data, error } = await apiFetch<QuizSummary[]>('/api/quiz', {
      requireAdminAuth: true,
    });
    if (error) throw new Error(error);
    return Array.isArray(data) ? data : [];
  },
};

export const apiGetQuiz = {
  async execute(quizId: string): Promise<Quiz | null> {
    const { data, error } = await apiFetch<Quiz>(
      `/api/quiz/${encodeURIComponent(quizId)}`,
      { requireAdminAuth: true }
    );
    if (error && error !== 'Quiz not found') throw new Error(error);
    return data ?? null;
  },
};

/** Quiz pour la session, sans bonnes réponses encore secrètes (participants, pas d’auth). */
export const apiGetSessionQuizForParticipant = {
  async execute(sessionId: string): Promise<Quiz | null> {
    const { data, error } = await apiFetch<Quiz>(
      `/api/session/${encodeURIComponent(sessionId)}/quiz`
    );
    if (error && error !== 'Session not found' && error !== 'Quiz not found') {
      throw new Error(error);
    }
    return data ?? null;
  },
};

export const apiDeleteQuiz = {
  async execute(quizId: string): Promise<void> {
    const { error } = await apiFetch(
      `/api/quiz/${encodeURIComponent(quizId)}`,
      { method: 'DELETE', requireAdminAuth: true }
    );
    if (error) throw new Error(error);
  },
};

export const apiCreateQuiz = {
  async execute(input: CreateQuizInput): Promise<Quiz> {
    const { data, error } = await apiFetch<Quiz>('/api/quiz', {
      method: 'POST',
      requireAdminAuth: true,
      body: JSON.stringify({
        title: input.title,
        questions: input.questions.map((q) => ({
          label: q.label,
          type: q.type,
          choices: (q.choices ?? []).map((c) => ({ label: c.label })),
          correctChoiceIndex: q.correctChoiceIndex,
          timerSeconds: q.timerSeconds,
        })),
      }),
    });
    if (error) throw new Error(error);
    if (!data) throw new Error('Create quiz failed');
    return data;
  },
};

export const apiUpdateQuiz = {
  async execute(quizId: string, input: UpdateQuizInput): Promise<Quiz> {
    const { data, error } = await apiFetch<Quiz>(
      `/api/quiz/${encodeURIComponent(quizId)}`,
      {
        method: 'PUT',
        requireAdminAuth: true,
        body: JSON.stringify({
          title: input.title,
          questions: input.questions.map((q) => ({
            label: q.label,
            type: q.type,
            choices: (q.choices ?? []).map((c) => ({ label: c.label })),
            correctChoiceIndex: q.correctChoiceIndex,
            timerSeconds: q.timerSeconds,
          })),
        }),
      }
    );
    if (error) throw new Error(error);
    if (!data) throw new Error('Update quiz failed');
    return data;
  },
};

export const apiLaunchSession = {
  async execute(quizId: string): Promise<Session> {
    const { data, error } = await apiFetch<Session>(
      `/api/quiz/${encodeURIComponent(quizId)}/launch`,
      { method: 'POST', requireAdminAuth: true }
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
      { method: 'POST', requireAdminAuth: true }
    );
    if (error) throw new Error(error);
    if (!data) throw new Error('Next question failed');
    return data;
  },
};

export const apiAdvanceIfTimeUp = {
  async execute(sessionId: string): Promise<{ advanced: boolean }> {
    const { data, error } = await apiFetch<{ advanced: boolean }>(
      `/api/session/${encodeURIComponent(sessionId)}/advance-if-time-up`,
      { method: 'POST' }
    );
    if (error) throw new Error(error);
    return data ?? { advanced: false };
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
    choiceId?: string;
    word?: string;
  }): Promise<void> {
    const body: {
      participantId: string;
      questionId: string;
      choiceId?: string;
      word?: string;
    } = {
      participantId: input.participantId,
      questionId: input.questionId,
    };
    if (input.choiceId != null) body.choiceId = input.choiceId;
    if (input.word != null) body.word = input.word;
    const { error } = await apiFetch(`/api/session/${input.sessionId}/answer`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (error) throw new Error(error);
  },
};

export function isApiMode(): boolean {
  return Boolean(getApiUrl());
}
