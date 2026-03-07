import type { Quiz } from '@kahin/qcm-domain';
import type { QuizRepository } from '@kahin/qcm-domain';
// Types très lâches pour éviter d'avoir besoin de @types/pg
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

type DbQuizRow = {
  id: string;
  title: string;
};

let sharedPool: PgPool | null = null;

function getPool(): PgPool {
  if (sharedPool) return sharedPool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL must be set to use PostgresQuizRepository.');
  }

  sharedPool = new Pool({
    connectionString,
    // Support for environments like Render/Heroku that require SSL
    ssl:
      process.env.PGSSLMODE === 'disable'
        ? false
        : { rejectUnauthorized: false },
  });

  return sharedPool;
}

export class PostgresQuizRepository implements QuizRepository {
  private readonly pool: PgPool;

  constructor(customPool?: PgPool) {
    this.pool = customPool ?? getPool();
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

      await client.query('DELETE FROM questions WHERE quiz_id = $1', [quiz.id]);

      for (const question of quiz.questions) {
        const timerSeconds = question.timerSeconds ?? 10;
        await client.query(
          `
          INSERT INTO questions (id, quiz_id, label, timer_seconds)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, timer_seconds = EXCLUDED.timer_seconds
          `,
          [question.id, quiz.id, question.label, timerSeconds]
        );

        await client.query('DELETE FROM choices WHERE question_id = $1', [
          question.id,
        ]);

        for (const choice of question.choices) {
          await client.query(
            `
            INSERT INTO choices (id, question_id, label)
            VALUES ($1, $2, $3)
            ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label
            `,
            [choice.id, question.id, choice.label]
          );
        }
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
      const quizResult = await client.query<DbQuizRow>(
        'SELECT id, title FROM quizzes WHERE id = $1',
        [id]
      );

      if (quizResult.rowCount === 0) return null;

      const quizRow = quizResult.rows[0];

      const questionsResult = await client.query<{
        id: string;
        label: string;
        timer_seconds: number | null;
        choice_id: string | null;
        choice_label: string | null;
      }>(
        `
        SELECT q.id,
               q.label,
               q.timer_seconds,
               c.id   AS choice_id,
               c.label AS choice_label
        FROM questions q
        LEFT JOIN choices c ON c.question_id = q.id
        WHERE q.quiz_id = $1
        ORDER BY q.id, c.id
        `,
        [id]
      );

      const questionsMap = new Map<
        string,
        {
          id: string;
          label: string;
          timerSeconds?: number;
          choices: { id: string; label: string }[];
        }
      >();

      for (const row of questionsResult.rows) {
        let question = questionsMap.get(row.id);
        if (!question) {
          question = {
            id: row.id,
            label: row.label,
            timerSeconds:
              row.timer_seconds != null ? row.timer_seconds : undefined,
            choices: [],
          };
          questionsMap.set(row.id, question);
        }

        if (row.choice_id && row.choice_label) {
          question.choices.push({
            id: row.choice_id,
            label: row.choice_label,
          });
        }
      }

      const questions = Array.from(questionsMap.values());

      const quiz: Quiz = {
        id: quizRow.id,
        title: quizRow.title,
        questions,
      };

      return quiz;
    } finally {
      client.release();
    }
  }

  async list(): Promise<{ id: string; title: string }[]> {
    const result = await this.pool.query<DbQuizRow>(
      'SELECT id, title FROM quizzes ORDER BY title ASC'
    );
    return result.rows.map((row) => ({ id: row.id, title: row.title }));
  }

  async delete(id: string): Promise<void> {
    await this.pool.query('DELETE FROM quizzes WHERE id = $1', [id]);
  }
}
