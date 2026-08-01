import type {
  GradeAnswerDetail,
  GradeAttempt,
  GradeAttemptScore,
  GradeRepository,
  GradeAttemptWithScores,
  GradeAttemptSource,
} from '@kahin/qcm-domain';
import { getPostgresPool } from './PostgresQuizRepository';

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

function parseSource(raw: string | null | undefined): GradeAttemptSource {
  return raw === 'manual' ? 'manual' : 'session';
}

function toAttempt(row: {
  id: string;
  class_id: string;
  quiz_id: string;
  session_id: string | null;
  completed_at: Date | string;
  source: string;
}): GradeAttempt {
  return {
    id: row.id,
    classId: row.class_id,
    quizId: row.quiz_id,
    sessionId: row.session_id,
    completedAt: new Date(row.completed_at),
    source: parseSource(row.source),
  };
}

export class PostgresGradeRepository implements GradeRepository {
  private readonly pool: PgPool;

  constructor(customPool?: PgPool) {
    this.pool = customPool ?? getPostgresPool();
  }

  async findBySessionId(sessionId: string): Promise<GradeAttempt | null> {
    const result = await this.pool.query<{
      id: string;
      class_id: string;
      quiz_id: string;
      session_id: string | null;
      completed_at: Date | string;
      source: string;
    }>(
      `SELECT id, class_id, quiz_id, session_id, completed_at, source
       FROM grade_attempts WHERE session_id = $1 LIMIT 1`,
      [sessionId]
    );
    if (result.rowCount === 0) return null;
    return toAttempt(result.rows[0]);
  }

  async saveAttempt(input: {
    attempt: GradeAttempt;
    scores: GradeAttemptScore[];
    details: GradeAnswerDetail[];
  }): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `
        INSERT INTO grade_attempts (id, class_id, quiz_id, session_id, completed_at, source)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO UPDATE SET
          class_id = EXCLUDED.class_id,
          quiz_id = EXCLUDED.quiz_id,
          session_id = EXCLUDED.session_id,
          completed_at = EXCLUDED.completed_at,
          source = EXCLUDED.source
        `,
        [
          input.attempt.id,
          input.attempt.classId,
          input.attempt.quizId,
          input.attempt.sessionId ?? null,
          new Date(input.attempt.completedAt),
          input.attempt.source,
        ]
      );

      await client.query(
        `DELETE FROM grade_attempt_scores WHERE attempt_id = $1`,
        [input.attempt.id]
      );
      await client.query(
        `DELETE FROM grade_answer_details WHERE attempt_id = $1`,
        [input.attempt.id]
      );

      for (const score of input.scores) {
        await client.query(
          `
          INSERT INTO grade_attempt_scores
            (attempt_id, student_name, course_correct, course_total)
          VALUES ($1, $2, $3, $4)
          `,
          [
            input.attempt.id,
            score.studentName,
            score.courseCorrect,
            score.courseTotal,
          ]
        );
      }

      for (const detail of input.details) {
        await client.query(
          `
          INSERT INTO grade_answer_details
            (attempt_id, student_name, question_id, is_correct, points)
          VALUES ($1, $2, $3, $4, $5)
          `,
          [
            input.attempt.id,
            detail.studentName,
            detail.questionId,
            detail.isCorrect,
            detail.points,
          ]
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

  async listLatestByClass(classId: string): Promise<GradeAttemptWithScores[]> {
    const result = await this.pool.query<{
      id: string;
      class_id: string;
      quiz_id: string;
      session_id: string | null;
      completed_at: Date | string;
      source: string;
    }>(
      `
      SELECT DISTINCT ON (quiz_id)
        id, class_id, quiz_id, session_id, completed_at, source
      FROM grade_attempts
      WHERE class_id = $1
      ORDER BY quiz_id, completed_at DESC
      `,
      [classId]
    );
    const out: GradeAttemptWithScores[] = [];
    for (const row of result.rows) {
      const full = await this.loadWithScores(row.id);
      if (full) out.push(full);
    }
    out.sort(
      (a, b) =>
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    );
    return out;
  }

  async getAttempt(attemptId: string): Promise<GradeAttemptWithScores | null> {
    return this.loadWithScores(attemptId);
  }

  async getLatestForClassQuiz(
    classId: string,
    quizId: string,
    attemptId?: string
  ): Promise<GradeAttemptWithScores | null> {
    if (attemptId) {
      const attempt = await this.loadWithScores(attemptId);
      if (!attempt) return null;
      if (attempt.classId !== classId || attempt.quizId !== quizId) return null;
      return attempt;
    }
    const result = await this.pool.query<{ id: string }>(
      `
      SELECT id FROM grade_attempts
      WHERE class_id = $1 AND quiz_id = $2
      ORDER BY completed_at DESC
      LIMIT 1
      `,
      [classId, quizId]
    );
    if (result.rowCount === 0) return null;
    return this.loadWithScores(result.rows[0].id);
  }

  async updateAnswerDetails(
    attemptId: string,
    updates: Array<{
      studentName: string;
      questionId: string;
      isCorrect: boolean;
      points: number;
    }>
  ): Promise<GradeAttemptWithScores | null> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const exists = await client.query(
        `SELECT id FROM grade_attempts WHERE id = $1`,
        [attemptId]
      );
      if (exists.rowCount === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      for (const update of updates) {
        await client.query(
          `
          INSERT INTO grade_answer_details
            (attempt_id, student_name, question_id, is_correct, points)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (attempt_id, student_name, question_id) DO UPDATE SET
            is_correct = EXCLUDED.is_correct,
            points = EXCLUDED.points
          `,
          [
            attemptId,
            update.studentName,
            update.questionId,
            update.isCorrect,
            update.points,
          ]
        );
      }

      await client.query(
        `DELETE FROM grade_attempt_scores WHERE attempt_id = $1`,
        [attemptId]
      );
      await client.query(
        `
        INSERT INTO grade_attempt_scores
          (attempt_id, student_name, course_correct, course_total)
        SELECT
          attempt_id,
          student_name,
          COUNT(*) FILTER (WHERE points > 0)::int,
          COUNT(*)::int
        FROM grade_answer_details
        WHERE attempt_id = $1
        GROUP BY attempt_id, student_name
        `,
        [attemptId]
      );

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
    return this.loadWithScores(attemptId);
  }

  private async loadWithScores(
    attemptId: string
  ): Promise<GradeAttemptWithScores | null> {
    const attemptResult = await this.pool.query<{
      id: string;
      class_id: string;
      quiz_id: string;
      session_id: string | null;
      completed_at: Date | string;
      source: string;
    }>(
      `SELECT id, class_id, quiz_id, session_id, completed_at, source
       FROM grade_attempts WHERE id = $1`,
      [attemptId]
    );
    if (attemptResult.rowCount === 0) return null;
    const attempt = toAttempt(attemptResult.rows[0]);

    const scoresResult = await this.pool.query<{
      attempt_id: string;
      student_name: string;
      course_correct: number;
      course_total: number;
    }>(
      `SELECT attempt_id, student_name, course_correct, course_total
       FROM grade_attempt_scores WHERE attempt_id = $1
       ORDER BY student_name ASC`,
      [attemptId]
    );

    const detailsResult = await this.pool.query<{
      attempt_id: string;
      student_name: string;
      question_id: string;
      is_correct: boolean;
      points: number | string;
    }>(
      `SELECT attempt_id, student_name, question_id, is_correct, points
       FROM grade_answer_details WHERE attempt_id = $1
       ORDER BY student_name ASC, question_id ASC`,
      [attemptId]
    );

    return {
      ...attempt,
      scores: scoresResult.rows.map((row) => ({
        attemptId: row.attempt_id,
        studentName: row.student_name,
        courseCorrect: Number(row.course_correct) || 0,
        courseTotal: Number(row.course_total) || 0,
      })),
      details: detailsResult.rows.map((row) => ({
        attemptId: row.attempt_id,
        studentName: row.student_name,
        questionId: row.question_id,
        isCorrect: Boolean(row.is_correct),
        points: Number(row.points) || 0,
      })),
    };
  }
}
