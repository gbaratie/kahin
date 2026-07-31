/**
 * Client API pour le front unifié : quiz, sessions, join, answer, etc.
 * Utilisé quand NEXT_PUBLIC_API_URL est défini.
 */
import type { CreateQuizInput, UpdateQuizInput } from '@kahin/qcm-application';
import type {
  JoinSessionInput,
  JoinSessionResult,
} from '@kahin/qcm-application';
import type { Quiz, Session, Question } from '@kahin/qcm-domain';

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

type QuizWriteInput = CreateQuizInput | UpdateQuizInput;

function quizInputToApiBody(input: QuizWriteInput) {
  return {
    title: input.title,
    questions: input.questions.map((q) => ({
      id: (q as { id?: string }).id,
      label: q.label,
      type: q.type,
      choices: (q.choices ?? []).map((c) => ({ label: c.label })),
      correctChoiceIndex: q.correctChoiceIndex,
      timerSeconds: q.timerSeconds,
      themeId: (q as { themeId?: string | null }).themeId,
    })),
  };
}

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
      body: JSON.stringify(quizInputToApiBody(input)),
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
        body: JSON.stringify(quizInputToApiBody(input)),
      }
    );
    if (error) throw new Error(error);
    if (!data) throw new Error('Update quiz failed');
    return data;
  },
};

export const apiLaunchSession = {
  async execute(
    input: { quizId: string; classId?: string | null } | string
  ): Promise<Session> {
    const quizId = typeof input === 'string' ? input : input.quizId;
    const classId = typeof input === 'string' ? null : (input.classId ?? null);
    const { data, error } = await apiFetch<Session>(
      `/api/quiz/${encodeURIComponent(quizId)}/launch`,
      {
        method: 'POST',
        requireAdminAuth: true,
        body: JSON.stringify({ classId }),
      }
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

export type StudentRosterDto = { names: string[] };

export type SchoolClassSummaryDto = {
  id: string;
  name: string;
  studentCount: number;
};

export type SchoolClassDto = {
  id: string;
  name: string;
  names: string[];
};

export type SessionJoinInfoDto = {
  sessionId: string;
  code: string;
  classId: string | null;
  className: string | null;
  names: string[];
  freeRegistration: boolean;
};

export const apiListClasses = {
  async execute(): Promise<SchoolClassSummaryDto[]> {
    const { data, error } =
      await apiFetch<SchoolClassSummaryDto[]>('/api/classes');
    if (error) throw new Error(error);
    return Array.isArray(data) ? data : [];
  },
};

export const apiGetClass = {
  async execute(classId: string): Promise<SchoolClassDto> {
    const { data, error } = await apiFetch<SchoolClassDto>(
      `/api/classes/${encodeURIComponent(classId)}`
    );
    if (error) throw new Error(error);
    if (!data) throw new Error('Class not found');
    return data;
  },
};

export const apiCreateClass = {
  async execute(input: {
    name: string;
    names?: string[];
  }): Promise<SchoolClassDto> {
    const { data, error } = await apiFetch<SchoolClassDto>('/api/classes', {
      method: 'POST',
      requireAdminAuth: true,
      body: JSON.stringify(input),
    });
    if (error) throw new Error(error);
    if (!data) throw new Error('Create class failed');
    return data;
  },
};

export const apiUpdateClass = {
  async execute(
    classId: string,
    input: { name: string; names: string[] }
  ): Promise<SchoolClassDto> {
    const { data, error } = await apiFetch<SchoolClassDto>(
      `/api/classes/${encodeURIComponent(classId)}`,
      {
        method: 'PUT',
        requireAdminAuth: true,
        body: JSON.stringify(input),
      }
    );
    if (error) throw new Error(error);
    if (!data) throw new Error('Update class failed');
    return data;
  },
};

export const apiDeleteClass = {
  async execute(classId: string): Promise<void> {
    const { error } = await apiFetch(
      `/api/classes/${encodeURIComponent(classId)}`,
      { method: 'DELETE', requireAdminAuth: true }
    );
    if (error) throw new Error(error);
  },
};

export const apiGetSessionJoinInfo = {
  async execute(code: string): Promise<SessionJoinInfoDto> {
    const q = new URLSearchParams({ code: code.trim().toUpperCase() });
    const { data, error } = await apiFetch<SessionJoinInfoDto>(
      `/api/session/join-info?${q.toString()}`
    );
    if (error) throw new Error(error);
    if (!data) throw new Error('Session not found');
    return data;
  },
};

/** @deprecated Utiliser apiListClasses / apiGetClass */
export const apiGetStudentRoster = {
  async execute(): Promise<StudentRosterDto> {
    const classes = await apiListClasses.execute();
    if (classes.length === 0) return { names: [] };
    const first = await apiGetClass.execute(classes[0].id);
    return { names: first.names };
  },
};

/** @deprecated */
export const apiUpdateStudentRoster = {
  async execute(names: string[]): Promise<StudentRosterDto> {
    const classes = await apiListClasses.execute();
    if (classes.length === 0) {
      const created = await apiCreateClass.execute({
        name: 'Classe',
        names,
      });
      return { names: created.names };
    }
    const updated = await apiUpdateClass.execute(classes[0].id, {
      name: classes[0].name,
      names,
    });
    return { names: updated.names };
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

function parseContentDispositionFilename(
  header: string | null,
  fallback: string
): string {
  if (!header) return fallback;
  const quoted = /filename="([^"]+)"/i.exec(header);
  if (quoted) return quoted[1];
  const unquoted = /filename=([^;\s]+)/i.exec(header);
  if (unquoted) return unquoted[1].replace(/["']/g, '');
  return fallback;
}

export const apiDownloadSessionResultsCsv = {
  async execute(sessionId: string): Promise<void> {
    const base = getApiUrl();
    if (!base) throw new Error('NEXT_PUBLIC_API_URL non configuré');
    const headers: Record<string, string> = {};
    const t = getAdminToken();
    if (t) headers.Authorization = `Bearer ${t}`;
    const url = `${base}/api/session/${encodeURIComponent(sessionId)}/results.csv`;
    const res = await fetch(url, { headers });
    if (res.status === 401) {
      clearAdminToken();
      onAdminUnauthorized?.();
      throw new Error('Non autorisé');
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg = (body as { error?: string }).error;
      throw new Error(typeof msg === 'string' ? msg : res.statusText);
    }
    const cd = res.headers.get('Content-Disposition');
    const fallback = `qcm-export-${sessionId}.csv`;
    const filename = parseContentDispositionFilename(cd, fallback);
    const text = await res.text();
    const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objUrl);
  },
};

export function isApiMode(): boolean {
  return Boolean(getApiUrl());
}

export type ThemeDto = { id: string; name: string; sortOrder: number };

export type QuestionSummaryDto = {
  id: string;
  label: string;
  type?: 'qcm' | 'word_cloud';
  themeId?: string;
  timerSeconds?: number;
  choiceCount: number;
};

export const apiListThemes = {
  async execute(): Promise<ThemeDto[]> {
    const { data, error } = await apiFetch<ThemeDto[]>('/api/themes', {
      requireAdminAuth: true,
    });
    if (error) throw new Error(error);
    return Array.isArray(data) ? data : [];
  },
};

export const apiCreateTheme = {
  async execute(name: string): Promise<ThemeDto> {
    const { data, error } = await apiFetch<ThemeDto>('/api/themes', {
      method: 'POST',
      requireAdminAuth: true,
      body: JSON.stringify({ name }),
    });
    if (error) throw new Error(error);
    if (!data) throw new Error('Create theme failed');
    return data;
  },
};

export const apiUpdateTheme = {
  async execute(
    themeId: string,
    input: { name: string; sortOrder?: number }
  ): Promise<ThemeDto> {
    const { data, error } = await apiFetch<ThemeDto>(
      `/api/themes/${encodeURIComponent(themeId)}`,
      {
        method: 'PUT',
        requireAdminAuth: true,
        body: JSON.stringify(input),
      }
    );
    if (error) throw new Error(error);
    if (!data) throw new Error('Update theme failed');
    return data;
  },
};

export const apiDeleteTheme = {
  async execute(themeId: string): Promise<void> {
    const { error } = await apiFetch(
      `/api/themes/${encodeURIComponent(themeId)}`,
      { method: 'DELETE', requireAdminAuth: true }
    );
    if (error) throw new Error(error);
  },
};

export const apiListQuestions = {
  async execute(opts?: {
    themeId?: string | null;
    summaries?: boolean;
  }): Promise<Question[] | QuestionSummaryDto[]> {
    const params = new URLSearchParams();
    if (opts?.themeId === null) params.set('themeId', 'null');
    else if (typeof opts?.themeId === 'string')
      params.set('themeId', opts.themeId);
    if (opts?.summaries) params.set('summaries', '1');
    const qs = params.toString();
    const { data, error } = await apiFetch<Question[] | QuestionSummaryDto[]>(
      `/api/questions${qs ? `?${qs}` : ''}`,
      { requireAdminAuth: true }
    );
    if (error) throw new Error(error);
    return Array.isArray(data) ? data : [];
  },
};

export const apiGetQuestion = {
  async execute(questionId: string): Promise<Question | null> {
    const { data, error } = await apiFetch<Question>(
      `/api/questions/${encodeURIComponent(questionId)}`,
      { requireAdminAuth: true }
    );
    if (error && error !== 'Question not found') throw new Error(error);
    return data ?? null;
  },
};

export const apiSaveQuestion = {
  async execute(input: {
    id?: string;
    label: string;
    type?: 'qcm' | 'word_cloud';
    choices: Array<{ label: string }>;
    correctChoiceIndex?: number;
    timerSeconds?: number;
    themeId?: string | null;
  }): Promise<Question> {
    const path = input.id
      ? `/api/questions/${encodeURIComponent(input.id)}`
      : '/api/questions';
    const { data, error } = await apiFetch<Question>(path, {
      method: input.id ? 'PUT' : 'POST',
      requireAdminAuth: true,
      body: JSON.stringify(input),
    });
    if (error) throw new Error(error);
    if (!data) throw new Error('Save question failed');
    return data;
  },
};

export const apiDeleteQuestion = {
  async execute(questionId: string): Promise<void> {
    const { error } = await apiFetch(
      `/api/questions/${encodeURIComponent(questionId)}`,
      { method: 'DELETE', requireAdminAuth: true }
    );
    if (error) throw new Error(error);
  },
};
