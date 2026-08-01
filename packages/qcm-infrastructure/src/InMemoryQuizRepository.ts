import type {
  Quiz,
  Question,
  Theme,
  PlayMode,
  QuestionListFilters,
} from '@kahin/qcm-domain';
import type {
  QuizRepository,
  QuestionRepository,
  QuestionSummary,
  ThemeRepository,
} from '@kahin/qcm-domain';
import { parsePlayMode } from '@kahin/qcm-domain';

type QuizRow = {
  id: string;
  title: string;
  coefficient: number;
  questionRefs: Array<{ questionId: string; playMode: PlayMode }>;
};

/** Store partagé en mémoire pour quizzes / questions / thèmes (tests & démo). */
export class InMemoryBankStore {
  readonly themes = new Map<string, Theme>();
  readonly questions = new Map<string, Question>();
  readonly quizzes = new Map<string, QuizRow>();
}

function normalizeCoefficient(value: unknown): number {
  const n =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : NaN;
  if (!Number.isFinite(n) || n <= 0) return 1;
  return n;
}

function hydrate(store: InMemoryBankStore, quizId: string): Quiz | null {
  const row = store.quizzes.get(quizId);
  if (!row) return null;
  const questions: Question[] = [];
  for (const ref of row.questionRefs) {
    const q = store.questions.get(ref.questionId);
    if (!q) continue;
    questions.push({
      ...q,
      choices: [...q.choices],
      playMode: ref.playMode,
    });
  }
  return {
    id: row.id,
    title: row.title,
    coefficient: row.coefficient,
    questions,
  };
}

function compareQuestionsBySort(
  a: Question,
  b: Question,
  themes: Map<string, Theme>,
  sort: QuestionListFilters['sort']
): number {
  if (sort === 'theme') {
    const ta = a.themeId ? themes.get(a.themeId) : undefined;
    const tb = b.themeId ? themes.get(b.themeId) : undefined;
    const aNoTheme = a.themeId ? 0 : 1;
    const bNoTheme = b.themeId ? 0 : 1;
    if (aNoTheme !== bNoTheme) return aNoTheme - bNoTheme;
    const orderA = ta?.sortOrder ?? Number.MAX_SAFE_INTEGER;
    const orderB = tb?.sortOrder ?? Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) return orderA - orderB;
    const nameCmp = (ta?.name ?? '').localeCompare(tb?.name ?? '');
    if (nameCmp !== 0) return nameCmp;
  }
  return a.label.localeCompare(b.label) || a.id.localeCompare(b.id);
}

export class InMemoryQuizRepository implements QuizRepository {
  constructor(private readonly store = new InMemoryBankStore()) {}

  async save(quiz: Quiz): Promise<void> {
    for (const q of quiz.questions) {
      const { playMode: _playMode, ...bankQuestion } = q;
      this.store.questions.set(q.id, {
        ...bankQuestion,
        choices: [...q.choices],
      });
    }
    this.store.quizzes.set(quiz.id, {
      id: quiz.id,
      title: quiz.title,
      coefficient: normalizeCoefficient(quiz.coefficient),
      questionRefs: quiz.questions.map((q) => ({
        questionId: q.id,
        playMode: parsePlayMode(q.playMode),
      })),
    });
  }

  async getById(id: string): Promise<Quiz | null> {
    return hydrate(this.store, id);
  }

  async list(): Promise<{ id: string; title: string; coefficient?: number }[]> {
    return Array.from(this.store.quizzes.values()).map((q) => ({
      id: q.id,
      title: q.title,
      coefficient: q.coefficient,
    }));
  }

  async delete(id: string): Promise<void> {
    this.store.quizzes.delete(id);
  }

  async updateCoefficient(quizId: string, coefficient: number): Promise<void> {
    const quiz = this.store.quizzes.get(quizId);
    if (!quiz) {
      const err = new Error('Quiz not found');
      (err as Error & { code?: string }).code = 'QUIZ_NOT_FOUND';
      throw err;
    }
    quiz.coefficient = normalizeCoefficient(coefficient);
  }
}

export class InMemoryQuestionRepository implements QuestionRepository {
  constructor(private readonly store = new InMemoryBankStore()) {}

  async list(filters?: QuestionListFilters): Promise<Question[]> {
    return Array.from(this.store.questions.values())
      .filter((q) => {
        if (filters?.themeId === undefined) return true;
        if (filters.themeId === null) return !q.themeId;
        return q.themeId === filters.themeId;
      })
      .sort((a, b) =>
        compareQuestionsBySort(a, b, this.store.themes, filters?.sort)
      )
      .map((q) => ({ ...q, choices: [...q.choices] }));
  }

  async listSummaries(
    filters?: QuestionListFilters
  ): Promise<QuestionSummary[]> {
    const list = await this.list(filters);
    return list.map((q) => ({
      id: q.id,
      label: q.label,
      type: q.type,
      themeId: q.themeId,
      timerSeconds: q.timerSeconds,
      choiceCount: q.choices.length,
    }));
  }

  async getById(id: string): Promise<Question | null> {
    const q = this.store.questions.get(id);
    return q ? { ...q, choices: [...q.choices] } : null;
  }

  async save(question: Question): Promise<void> {
    const { playMode: _playMode, ...bankQuestion } = question;
    this.store.questions.set(question.id, {
      ...bankQuestion,
      choices: [...question.choices],
    });
  }

  async delete(id: string): Promise<void> {
    this.store.questions.delete(id);
    for (const quiz of this.store.quizzes.values()) {
      quiz.questionRefs = quiz.questionRefs.filter(
        (ref) => ref.questionId !== id
      );
    }
  }
}

export class InMemoryThemeRepository implements ThemeRepository {
  constructor(private readonly store = new InMemoryBankStore()) {}

  async list(): Promise<Theme[]> {
    return Array.from(this.store.themes.values()).sort(
      (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)
    );
  }

  async getById(id: string): Promise<Theme | null> {
    return this.store.themes.get(id) ?? null;
  }

  async save(theme: Theme): Promise<void> {
    this.store.themes.set(theme.id, { ...theme });
  }

  async delete(id: string): Promise<void> {
    this.store.themes.delete(id);
    for (const q of this.store.questions.values()) {
      if (q.themeId === id) delete q.themeId;
    }
  }
}
