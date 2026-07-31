import type { Quiz, Question, QuestionType, Theme } from '@kahin/qcm-domain';
import type {
  QuizRepository,
  QuestionRepository,
  QuestionSummary,
  ThemeRepository,
} from '@kahin/qcm-domain';

function parseQuestionType(raw: string | null | undefined): QuestionType {
  return raw === 'word_cloud' ? 'word_cloud' : 'qcm';
}

type PgPool = {
  connect(): Promise<PgClient>;
  query<T = any>(
    text: string,
    params?: unknown[]
  ): Promise<{ rows: T[]; rowCount: number }>;
};

type PgClient = {
  query<T = any>(
    text: string,
    params?: unknown[]
  ): Promise<{ rows: T[]; rowCount: number }>;
  release(): void;
};

// eslint-disable-next-line @typescript-eslint/no-var-requires,@typescript-eslint/no-require-imports
const { Pool } = require('pg') as { Pool: new (config: unknown) => PgPool };

let sharedPool: PgPool | null = null;

export function getPostgresPool(): PgPool {
  if (sharedPool) return sharedPool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL must be set to use Postgres repositories.');
  }

  sharedPool = new Pool({
    connectionString,
    ssl:
      process.env.PGSSLMODE === 'disable'
        ? false
        : { rejectUnauthorized: false },
  });

  return sharedPool;
}

async function upsertQuestion(
  client: PgClient,
  question: Question
): Promise<void> {
  const timerSeconds = question.timerSeconds ?? 10;
  const questionType = parseQuestionType(question.type);
  await client.query(
    `
    INSERT INTO questions (id, label, timer_seconds, question_type, theme_id)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (id) DO UPDATE SET
      label = EXCLUDED.label,
      timer_seconds = EXCLUDED.timer_seconds,
      question_type = EXCLUDED.question_type,
      theme_id = EXCLUDED.theme_id
    `,
    [
      question.id,
      question.label,
      timerSeconds,
      questionType,
      question.themeId ?? null,
    ]
  );

  await client.query('DELETE FROM choices WHERE question_id = $1', [
    question.id,
  ]);

  for (let choiceIndex = 0; choiceIndex < question.choices.length; choiceIndex++) {
    const choice = question.choices[choiceIndex];
    await client.query(
      `
      INSERT INTO choices (id, question_id, label, sort_order)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO UPDATE SET
        label = EXCLUDED.label,
        sort_order = EXCLUDED.sort_order,
        question_id = EXCLUDED.question_id
      `,
      [choice.id, question.id, choice.label, choiceIndex]
    );
  }

  const correctId =
    question.correctChoiceId != null &&
    question.choices.some((c) => c.id === question.correctChoiceId)
      ? question.correctChoiceId
      : null;
  await client.query(
    `UPDATE questions SET correct_choice_id = $1 WHERE id = $2`,
    [correctId, question.id]
  );
}

async function loadQuestionById(
  client: PgClient,
  id: string
): Promise<Question | null> {
  const result = await client.query<{
    id: string;
    label: string;
    timer_seconds: number | null;
    question_type: string | null;
    correct_choice_id: string | null;
    theme_id: string | null;
    choice_id: string | null;
    choice_label: string | null;
  }>(
    `
    SELECT q.id,
           q.label,
           q.timer_seconds,
           q.question_type,
           q.correct_choice_id,
           q.theme_id,
           c.id AS choice_id,
           c.label AS choice_label
    FROM questions q
    LEFT JOIN choices c ON c.question_id = q.id
    WHERE q.id = $1
    ORDER BY c.sort_order ASC NULLS LAST, c.id ASC
    `,
    [id]
  );

  if (result.rowCount === 0) return null;

  const first = result.rows[0];
  const question: Question = {
    id: first.id,
    label: first.label,
    type: parseQuestionType(first.question_type),
    timerSeconds: first.timer_seconds ?? undefined,
    correctChoiceId: first.correct_choice_id ?? undefined,
    themeId: first.theme_id ?? undefined,
    choices: [],
  };

  for (const row of result.rows) {
    if (row.choice_id && row.choice_label) {
      question.choices.push({ id: row.choice_id, label: row.choice_label });
    }
  }
  return question;
}

export class PostgresQuizRepository implements QuizRepository {
  private readonly pool: PgPool;

  constructor(customPool?: PgPool) {
    this.pool = customPool ?? getPostgresPool();
  }

  async save(quiz: Quiz): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `
        INSERT INTO quizzes (id, title)
        VALUES ($1, $2)
        ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title
        `,
        [quiz.id, quiz.title]
      );

      for (const question of quiz.questions) {
        await upsertQuestion(client, question);
      }

      await client.query('DELETE FROM quiz_questions WHERE quiz_id = $1', [
        quiz.id,
      ]);

      for (let i = 0; i < quiz.questions.length; i++) {
        const question = quiz.questions[i];
        await client.query(
          `
          INSERT INTO quiz_questions (quiz_id, question_id, sort_order)
          VALUES ($1, $2, $3)
          ON CONFLICT (quiz_id, question_id) DO UPDATE SET
            sort_order = EXCLUDED.sort_order
          `,
          [quiz.id, question.id, i]
        );
      }

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async getById(id: string): Promise<Quiz | null> {
    const client = await this.pool.connect();
    try {
      const quizResult = await client.query<{ id: string; title: string }>(
        'SELECT id, title FROM quizzes WHERE id = $1',
        [id]
      );
      if (quizResult.rowCount === 0) return null;

      const quizRow = quizResult.rows[0];
      const questionsResult = await client.query<{
        id: string;
        label: string;
        timer_seconds: number | null;
        question_type: string | null;
        correct_choice_id: string | null;
        theme_id: string | null;
        choice_id: string | null;
        choice_label: string | null;
        qq_sort: number;
      }>(
        `
        SELECT q.id,
               q.label,
               q.timer_seconds,
               q.question_type,
               q.correct_choice_id,
               q.theme_id,
               c.id AS choice_id,
               c.label AS choice_label,
               qq.sort_order AS qq_sort
        FROM quiz_questions qq
        JOIN questions q ON q.id = qq.question_id
        LEFT JOIN choices c ON c.question_id = q.id
        WHERE qq.quiz_id = $1
        ORDER BY qq.sort_order ASC, q.id ASC, c.sort_order ASC NULLS LAST, c.id ASC
        `,
        [id]
      );

      const questionsMap = new Map<string, Question>();
      const order: string[] = [];

      for (const row of questionsResult.rows) {
        let question = questionsMap.get(row.id);
        if (!question) {
          question = {
            id: row.id,
            label: row.label,
            type: parseQuestionType(row.question_type),
            timerSeconds: row.timer_seconds ?? undefined,
            correctChoiceId: row.correct_choice_id ?? undefined,
            themeId: row.theme_id ?? undefined,
            choices: [],
          };
          questionsMap.set(row.id, question);
          order.push(row.id);
        }
        if (row.choice_id && row.choice_label) {
          question.choices.push({
            id: row.choice_id,
            label: row.choice_label,
          });
        }
      }

      return {
        id: quizRow.id,
        title: quizRow.title,
        questions: order.map((qid) => questionsMap.get(qid)!),
      };
    } finally {
      client.release();
    }
  }

  async list(): Promise<{ id: string; title: string }[]> {
    const result = await this.pool.query<{ id: string; title: string }>(
      'SELECT id, title FROM quizzes ORDER BY title ASC'
    );
    return result.rows.map((row) => ({ id: row.id, title: row.title }));
  }

  async delete(id: string): Promise<void> {
    await this.pool.query('DELETE FROM quizzes WHERE id = $1', [id]);
  }
}

export class PostgresQuestionRepository implements QuestionRepository {
  private readonly pool: PgPool;

  constructor(customPool?: PgPool) {
    this.pool = customPool ?? getPostgresPool();
  }

  async list(filters?: { themeId?: string | null }): Promise<Question[]> {
    const client = await this.pool.connect();
    try {
      const params: unknown[] = [];
      let where = '';
      if (filters?.themeId === null) {
        where = 'WHERE q.theme_id IS NULL';
      } else if (typeof filters?.themeId === 'string') {
        params.push(filters.themeId);
        where = `WHERE q.theme_id = $${params.length}`;
      }

      const result = await client.query<{
        id: string;
        label: string;
        timer_seconds: number | null;
        question_type: string | null;
        correct_choice_id: string | null;
        theme_id: string | null;
        choice_id: string | null;
        choice_label: string | null;
      }>(
        `
        SELECT q.id,
               q.label,
               q.timer_seconds,
               q.question_type,
               q.correct_choice_id,
               q.theme_id,
               c.id AS choice_id,
               c.label AS choice_label
        FROM questions q
        LEFT JOIN choices c ON c.question_id = q.id
        ${where}
        ORDER BY q.label ASC, q.id ASC, c.sort_order ASC NULLS LAST, c.id ASC
        `,
        params
      );

      const map = new Map<string, Question>();
      const order: string[] = [];
      for (const row of result.rows) {
        let q = map.get(row.id);
        if (!q) {
          q = {
            id: row.id,
            label: row.label,
            type: parseQuestionType(row.question_type),
            timerSeconds: row.timer_seconds ?? undefined,
            correctChoiceId: row.correct_choice_id ?? undefined,
            themeId: row.theme_id ?? undefined,
            choices: [],
          };
          map.set(row.id, q);
          order.push(row.id);
        }
        if (row.choice_id && row.choice_label) {
          q.choices.push({ id: row.choice_id, label: row.choice_label });
        }
      }
      return order.map((id) => map.get(id)!);
    } finally {
      client.release();
    }
  }

  async listSummaries(filters?: {
    themeId?: string | null;
  }): Promise<QuestionSummary[]> {
    const params: unknown[] = [];
    let where = '';
    if (filters?.themeId === null) {
      where = 'WHERE q.theme_id IS NULL';
    } else if (typeof filters?.themeId === 'string') {
      params.push(filters.themeId);
      where = `WHERE q.theme_id = $${params.length}`;
    }

    const result = await this.pool.query<{
      id: string;
      label: string;
      question_type: string | null;
      theme_id: string | null;
      timer_seconds: number | null;
      choice_count: string;
    }>(
      `
      SELECT q.id,
             q.label,
             q.question_type,
             q.theme_id,
             q.timer_seconds,
             COUNT(c.id)::text AS choice_count
      FROM questions q
      LEFT JOIN choices c ON c.question_id = q.id
      ${where}
      GROUP BY q.id, q.label, q.question_type, q.theme_id, q.timer_seconds
      ORDER BY q.label ASC, q.id ASC
      `,
      params
    );

    return result.rows.map((row) => ({
      id: row.id,
      label: row.label,
      type: parseQuestionType(row.question_type),
      themeId: row.theme_id ?? undefined,
      timerSeconds: row.timer_seconds ?? undefined,
      choiceCount: Number(row.choice_count) || 0,
    }));
  }

  async getById(id: string): Promise<Question | null> {
    const client = await this.pool.connect();
    try {
      return loadQuestionById(client, id);
    } finally {
      client.release();
    }
  }

  async save(question: Question): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await upsertQuestion(client, question);
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async delete(id: string): Promise<void> {
    await this.pool.query('DELETE FROM questions WHERE id = $1', [id]);
  }
}

export class PostgresThemeRepository implements ThemeRepository {
  private readonly pool: PgPool;

  constructor(customPool?: PgPool) {
    this.pool = customPool ?? getPostgresPool();
  }

  async list(): Promise<Theme[]> {
    const result = await this.pool.query<{
      id: string;
      name: string;
      sort_order: number;
    }>('SELECT id, name, sort_order FROM themes ORDER BY sort_order ASC, name ASC');
    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      sortOrder: row.sort_order,
    }));
  }

  async getById(id: string): Promise<Theme | null> {
    const result = await this.pool.query<{
      id: string;
      name: string;
      sort_order: number;
    }>('SELECT id, name, sort_order FROM themes WHERE id = $1', [id]);
    if (result.rowCount === 0) return null;
    const row = result.rows[0];
    return { id: row.id, name: row.name, sortOrder: row.sort_order };
  }

  async save(theme: Theme): Promise<void> {
    await this.pool.query(
      `
      INSERT INTO themes (id, name, sort_order)
      VALUES ($1, $2, $3)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        sort_order = EXCLUDED.sort_order
      `,
      [theme.id, theme.name, theme.sortOrder]
    );
  }

  async delete(id: string): Promise<void> {
    await this.pool.query('DELETE FROM themes WHERE id = $1', [id]);
  }
}
