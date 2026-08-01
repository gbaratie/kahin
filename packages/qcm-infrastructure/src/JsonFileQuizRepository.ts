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
import fs from 'fs/promises';
import path from 'path';

const defaultEncoding = 'utf-8' as const;

export type JsonQuizQuestionRef = {
  questionId: string;
  playMode?: PlayMode;
};

export type JsonBankFile = {
  themes: Record<string, Theme>;
  questions: Record<string, Question>;
  quizzes: Record<
    string,
    {
      id: string;
      title: string;
      coefficient?: number;
      /** Nouveau format avec playMode ; anciens fichiers : string[]. */
      questionIds: Array<string | JsonQuizQuestionRef>;
    }
  >;
};

type LegacyJsonFile = {
  quizzes?: Record<string, Quiz>;
  themes?: Record<string, Theme>;
  questions?: Record<string, Question>;
};

function emptyBank(): JsonBankFile {
  return { themes: {}, questions: {}, quizzes: {} };
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

function normalizeQuestionRefs(
  raw: Array<string | JsonQuizQuestionRef> | undefined
): JsonQuizQuestionRef[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    if (typeof item === 'string') {
      return { questionId: item, playMode: 'discovery' };
    }
    return {
      questionId: item.questionId,
      playMode: parsePlayMode(item.playMode),
    };
  });
}

/** Convertit l’ancien format imbriqué vers banque + questionIds. */
export function migrateLegacyQuizzes(
  legacy: Record<string, Quiz>
): JsonBankFile {
  const bank = emptyBank();
  for (const quiz of Object.values(legacy)) {
    const questionIds: JsonQuizQuestionRef[] = [];
    for (const q of quiz.questions ?? []) {
      const { playMode, ...rest } = q;
      bank.questions[q.id] = { ...rest, choices: [...(q.choices ?? [])] };
      questionIds.push({
        questionId: q.id,
        playMode: parsePlayMode(playMode),
      });
    }
    bank.quizzes[quiz.id] = {
      id: quiz.id,
      title: quiz.title,
      coefficient: normalizeCoefficient(quiz.coefficient),
      questionIds,
    };
  }
  return bank;
}

export class JsonFileBankStore {
  constructor(private readonly filePath: string) {}

  private async ensureDir(): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
  }

  async read(): Promise<JsonBankFile> {
    try {
      const raw = await fs.readFile(this.filePath, defaultEncoding);
      const data = JSON.parse(raw) as LegacyJsonFile;

      // Nouveau format
      if (
        data.questions ||
        data.themes ||
        (data.quizzes && !isLegacyQuizzes(data.quizzes))
      ) {
        return {
          themes: data.themes ?? {},
          questions: data.questions ?? {},
          quizzes: normalizeQuizzes(data.quizzes ?? {}, data.questions ?? {}),
        };
      }

      // Ancien format : quizzes avec questions imbriquées
      if (data.quizzes && isLegacyQuizzes(data.quizzes)) {
        return migrateLegacyQuizzes(data.quizzes as Record<string, Quiz>);
      }

      return emptyBank();
    } catch (err) {
      const code =
        err && typeof (err as NodeJS.ErrnoException).code === 'string'
          ? (err as NodeJS.ErrnoException).code
          : '';
      if (code === 'ENOENT') return emptyBank();
      throw err;
    }
  }

  async write(bank: JsonBankFile): Promise<void> {
    await this.ensureDir();
    await fs.writeFile(
      this.filePath,
      JSON.stringify(bank, null, 2),
      defaultEncoding
    );
  }
}

function isLegacyQuizzes(quizzes: Record<string, unknown>): boolean {
  const first = Object.values(quizzes)[0] as
    | { questions?: unknown; questionIds?: unknown }
    | undefined;
  if (!first) return false;
  return Array.isArray(first.questions) && !Array.isArray(first.questionIds);
}

function normalizeQuizzes(
  quizzes: Record<string, unknown>,
  questions: Record<string, Question>
): JsonBankFile['quizzes'] {
  const out: JsonBankFile['quizzes'] = {};
  for (const [id, raw] of Object.entries(quizzes)) {
    const q = raw as {
      id?: string;
      title?: string;
      coefficient?: number;
      questionIds?: Array<string | JsonQuizQuestionRef>;
      questions?: Question[];
    };
    if (Array.isArray(q.questionIds)) {
      out[id] = {
        id: q.id ?? id,
        title: q.title ?? '',
        coefficient: normalizeCoefficient(q.coefficient),
        questionIds: normalizeQuestionRefs(q.questionIds),
      };
    } else if (Array.isArray(q.questions)) {
      const questionIds: JsonQuizQuestionRef[] = [];
      for (const question of q.questions) {
        const { playMode, ...rest } = question;
        questions[question.id] = rest;
        questionIds.push({
          questionId: question.id,
          playMode: parsePlayMode(playMode),
        });
      }
      out[id] = {
        id: q.id ?? id,
        title: q.title ?? '',
        coefficient: normalizeCoefficient(q.coefficient),
        questionIds,
      };
    }
  }
  return out;
}

function hydrateQuiz(bank: JsonBankFile, quizId: string): Quiz | null {
  const row = bank.quizzes[quizId];
  if (!row) return null;
  const refs = normalizeQuestionRefs(row.questionIds);
  const questions: Question[] = [];
  for (const ref of refs) {
    const q = bank.questions[ref.questionId];
    if (!q) continue;
    questions.push({
      ...q,
      choices: [...(q.choices ?? [])],
      playMode: parsePlayMode(ref.playMode),
    });
  }
  return {
    id: row.id,
    title: row.title,
    coefficient: normalizeCoefficient(row.coefficient),
    questions,
  };
}

function compareQuestionsBySort(
  a: Question,
  b: Question,
  themes: Record<string, Theme>,
  sort: QuestionListFilters['sort']
): number {
  if (sort === 'theme') {
    const ta = a.themeId ? themes[a.themeId] : undefined;
    const tb = b.themeId ? themes[b.themeId] : undefined;
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

export class JsonFileQuizRepository implements QuizRepository {
  private readonly store: JsonFileBankStore;

  constructor(filePath: string) {
    this.store = new JsonFileBankStore(filePath);
  }

  async save(quiz: Quiz): Promise<void> {
    const bank = await this.store.read();
    for (const question of quiz.questions) {
      const { playMode: _playMode, ...bankQuestion } = question;
      bank.questions[question.id] = {
        ...bankQuestion,
        choices: [...question.choices],
      };
    }
    bank.quizzes[quiz.id] = {
      id: quiz.id,
      title: quiz.title,
      coefficient: normalizeCoefficient(quiz.coefficient),
      questionIds: quiz.questions.map((q) => ({
        questionId: q.id,
        playMode: parsePlayMode(q.playMode),
      })),
    };
    await this.store.write(bank);
  }

  async getById(id: string): Promise<Quiz | null> {
    const bank = await this.store.read();
    return hydrateQuiz(bank, id);
  }

  async list(): Promise<{ id: string; title: string; coefficient?: number }[]> {
    const bank = await this.store.read();
    return Object.values(bank.quizzes).map((q) => ({
      id: q.id,
      title: q.title,
      coefficient: normalizeCoefficient(q.coefficient),
    }));
  }

  async delete(id: string): Promise<void> {
    const bank = await this.store.read();
    if (!(id in bank.quizzes)) return;
    delete bank.quizzes[id];
    await this.store.write(bank);
  }

  async updateCoefficient(quizId: string, coefficient: number): Promise<void> {
    const bank = await this.store.read();
    const quiz = bank.quizzes[quizId];
    if (!quiz) {
      const err = new Error('Quiz not found');
      (err as Error & { code?: string }).code = 'QUIZ_NOT_FOUND';
      throw err;
    }
    quiz.coefficient = normalizeCoefficient(coefficient);
    await this.store.write(bank);
  }
}

export class JsonFileQuestionRepository implements QuestionRepository {
  private readonly store: JsonFileBankStore;

  constructor(filePath: string) {
    this.store = new JsonFileBankStore(filePath);
  }

  async list(filters?: QuestionListFilters): Promise<Question[]> {
    const bank = await this.store.read();
    return Object.values(bank.questions)
      .filter((q) => matchesTheme(q, filters?.themeId))
      .sort((a, b) =>
        compareQuestionsBySort(a, b, bank.themes, filters?.sort)
      )
      .map((q) => ({ ...q, choices: [...(q.choices ?? [])] }));
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
    const bank = await this.store.read();
    const q = bank.questions[id];
    return q ? { ...q, choices: [...(q.choices ?? [])] } : null;
  }

  async save(question: Question): Promise<void> {
    const bank = await this.store.read();
    const { playMode: _playMode, ...bankQuestion } = question;
    bank.questions[question.id] = {
      ...bankQuestion,
      choices: [...question.choices],
    };
    await this.store.write(bank);
  }

  async delete(id: string): Promise<void> {
    const bank = await this.store.read();
    if (!(id in bank.questions)) return;
    delete bank.questions[id];
    for (const quiz of Object.values(bank.quizzes)) {
      quiz.questionIds = normalizeQuestionRefs(quiz.questionIds).filter(
        (ref) => ref.questionId !== id
      );
    }
    await this.store.write(bank);
  }
}

export class JsonFileThemeRepository implements ThemeRepository {
  private readonly store: JsonFileBankStore;

  constructor(filePath: string) {
    this.store = new JsonFileBankStore(filePath);
  }

  async list(): Promise<Theme[]> {
    const bank = await this.store.read();
    return Object.values(bank.themes).sort(
      (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)
    );
  }

  async getById(id: string): Promise<Theme | null> {
    const bank = await this.store.read();
    return bank.themes[id] ?? null;
  }

  async save(theme: Theme): Promise<void> {
    const bank = await this.store.read();
    bank.themes[theme.id] = { ...theme };
    await this.store.write(bank);
  }

  async delete(id: string): Promise<void> {
    const bank = await this.store.read();
    if (!(id in bank.themes)) return;
    delete bank.themes[id];
    for (const q of Object.values(bank.questions)) {
      if (q.themeId === id) delete q.themeId;
    }
    await this.store.write(bank);
  }
}

function matchesTheme(
  q: Question,
  themeId: string | null | undefined
): boolean {
  if (themeId === undefined) return true;
  if (themeId === null) return !q.themeId;
  return q.themeId === themeId;
}
