import type { Quiz, Question, Theme } from '@kahin/qcm-domain';
import type {
  QuizRepository,
  QuestionRepository,
  QuestionSummary,
  ThemeRepository,
} from '@kahin/qcm-domain';

/** Store partagé en mémoire pour quizzes / questions / thèmes (tests & démo). */
export class InMemoryBankStore {
  readonly themes = new Map<string, Theme>();
  readonly questions = new Map<string, Question>();
  readonly quizzes = new Map<
    string,
    { id: string; title: string; questionIds: string[] }
  >();
}

function hydrate(
  store: InMemoryBankStore,
  quizId: string
): Quiz | null {
  const row = store.quizzes.get(quizId);
  if (!row) return null;
  const questions = row.questionIds
    .map((id) => store.questions.get(id))
    .filter((q): q is Question => Boolean(q))
    .map((q) => ({ ...q, choices: [...q.choices] }));
  return { id: row.id, title: row.title, questions };
}

export class InMemoryQuizRepository implements QuizRepository {
  constructor(private readonly store = new InMemoryBankStore()) {}

  async save(quiz: Quiz): Promise<void> {
    for (const q of quiz.questions) {
      this.store.questions.set(q.id, { ...q, choices: [...q.choices] });
    }
    this.store.quizzes.set(quiz.id, {
      id: quiz.id,
      title: quiz.title,
      questionIds: quiz.questions.map((q) => q.id),
    });
  }

  async getById(id: string): Promise<Quiz | null> {
    return hydrate(this.store, id);
  }

  async list(): Promise<{ id: string; title: string }[]> {
    return Array.from(this.store.quizzes.values()).map((q) => ({
      id: q.id,
      title: q.title,
    }));
  }

  async delete(id: string): Promise<void> {
    this.store.quizzes.delete(id);
  }
}

export class InMemoryQuestionRepository implements QuestionRepository {
  constructor(private readonly store = new InMemoryBankStore()) {}

  async list(filters?: { themeId?: string | null }): Promise<Question[]> {
    return Array.from(this.store.questions.values())
      .filter((q) => {
        if (filters?.themeId === undefined) return true;
        if (filters.themeId === null) return !q.themeId;
        return q.themeId === filters.themeId;
      })
      .sort((a, b) => a.label.localeCompare(b.label))
      .map((q) => ({ ...q, choices: [...q.choices] }));
  }

  async listSummaries(filters?: {
    themeId?: string | null;
  }): Promise<QuestionSummary[]> {
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
    this.store.questions.set(question.id, {
      ...question,
      choices: [...question.choices],
    });
  }

  async delete(id: string): Promise<void> {
    this.store.questions.delete(id);
    for (const quiz of this.store.quizzes.values()) {
      quiz.questionIds = quiz.questionIds.filter((qid) => qid !== id);
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
