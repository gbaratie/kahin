import type { Quiz, Question, Theme } from '@kahin/qcm-domain';
import type {
  QuizRepository,
  QuestionRepository,
  QuestionSummary,
  ThemeRepository,
} from '@kahin/qcm-domain';
import fs from 'fs/promises';
import path from 'path';

const defaultEncoding = 'utf-8' as const;

export type JsonBankFile = {
  themes: Record<string, Theme>;
  questions: Record<string, Question>;
  quizzes: Record<string, { id: string; title: string; questionIds: string[] }>;
};

type LegacyJsonFile = {
  quizzes?: Record<string, Quiz>;
  themes?: Record<string, Theme>;
  questions?: Record<string, Question>;
};

function emptyBank(): JsonBankFile {
  return { themes: {}, questions: {}, quizzes: {} };
}

/** Convertit l’ancien format imbriqué vers banque + questionIds. */
export function migrateLegacyQuizzes(
  legacy: Record<string, Quiz>
): JsonBankFile {
  const bank = emptyBank();
  for (const quiz of Object.values(legacy)) {
    const questionIds: string[] = [];
    for (const q of quiz.questions ?? []) {
      bank.questions[q.id] = { ...q, choices: [...(q.choices ?? [])] };
      questionIds.push(q.id);
    }
    bank.quizzes[quiz.id] = {
      id: quiz.id,
      title: quiz.title,
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
      if (data.questions || data.themes || (data.quizzes && !isLegacyQuizzes(data.quizzes))) {
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

function isLegacyQuizzes(
  quizzes: Record<string, unknown>
): boolean {
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
      questionIds?: string[];
      questions?: Question[];
    };
    if (Array.isArray(q.questionIds)) {
      out[id] = {
        id: q.id ?? id,
        title: q.title ?? '',
        questionIds: q.questionIds,
      };
    } else if (Array.isArray(q.questions)) {
      const questionIds: string[] = [];
      for (const question of q.questions) {
        questions[question.id] = question;
        questionIds.push(question.id);
      }
      out[id] = {
        id: q.id ?? id,
        title: q.title ?? '',
        questionIds,
      };
    }
  }
  return out;
}

function hydrateQuiz(
  bank: JsonBankFile,
  quizId: string
): Quiz | null {
  const row = bank.quizzes[quizId];
  if (!row) return null;
  const questions = row.questionIds
    .map((qid) => bank.questions[qid])
    .filter((q): q is Question => Boolean(q))
    .map((q) => ({ ...q, choices: [...(q.choices ?? [])] }));
  return { id: row.id, title: row.title, questions };
}

export class JsonFileQuizRepository implements QuizRepository {
  private readonly store: JsonFileBankStore;

  constructor(filePath: string) {
    this.store = new JsonFileBankStore(filePath);
  }

  async save(quiz: Quiz): Promise<void> {
    const bank = await this.store.read();
    for (const question of quiz.questions) {
      bank.questions[question.id] = {
        ...question,
        choices: [...question.choices],
      };
    }
    bank.quizzes[quiz.id] = {
      id: quiz.id,
      title: quiz.title,
      questionIds: quiz.questions.map((q) => q.id),
    };
    await this.store.write(bank);
  }

  async getById(id: string): Promise<Quiz | null> {
    const bank = await this.store.read();
    return hydrateQuiz(bank, id);
  }

  async list(): Promise<{ id: string; title: string }[]> {
    const bank = await this.store.read();
    return Object.values(bank.quizzes).map((q) => ({
      id: q.id,
      title: q.title,
    }));
  }

  async delete(id: string): Promise<void> {
    const bank = await this.store.read();
    if (!(id in bank.quizzes)) return;
    delete bank.quizzes[id];
    await this.store.write(bank);
  }
}

export class JsonFileQuestionRepository implements QuestionRepository {
  private readonly store: JsonFileBankStore;

  constructor(filePath: string) {
    this.store = new JsonFileBankStore(filePath);
  }

  async list(filters?: { themeId?: string | null }): Promise<Question[]> {
    const bank = await this.store.read();
    return Object.values(bank.questions)
      .filter((q) => matchesTheme(q, filters?.themeId))
      .sort((a, b) => a.label.localeCompare(b.label))
      .map((q) => ({ ...q, choices: [...(q.choices ?? [])] }));
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
    const bank = await this.store.read();
    const q = bank.questions[id];
    return q ? { ...q, choices: [...(q.choices ?? [])] } : null;
  }

  async save(question: Question): Promise<void> {
    const bank = await this.store.read();
    bank.questions[question.id] = {
      ...question,
      choices: [...question.choices],
    };
    await this.store.write(bank);
  }

  async delete(id: string): Promise<void> {
    const bank = await this.store.read();
    if (!(id in bank.questions)) return;
    delete bank.questions[id];
    for (const quiz of Object.values(bank.quizzes)) {
      quiz.questionIds = quiz.questionIds.filter((qid) => qid !== id);
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
