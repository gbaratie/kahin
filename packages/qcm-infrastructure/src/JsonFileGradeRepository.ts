import type {
  GradeAnswerDetail,
  GradeAttempt,
  GradeAttemptScore,
  GradeRepository,
  GradeAttemptWithScores,
  GradeAttemptSource,
} from '@kahin/qcm-domain';
import fs from 'fs/promises';
import path from 'path';

type GradeFile = {
  attempts: Record<
    string,
    {
      id: string;
      classId: string;
      quizId: string;
      sessionId?: string | null;
      completedAt: string;
      source: GradeAttemptSource;
      scores: GradeAttemptScore[];
      details: GradeAnswerDetail[];
    }
  >;
};

const defaultEncoding = 'utf-8' as const;

function emptyFile(): GradeFile {
  return { attempts: {} };
}

export class JsonFileGradeRepository implements GradeRepository {
  constructor(private readonly filePath: string) {}

  private async ensureDir(): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
  }

  private async read(): Promise<GradeFile> {
    try {
      const raw = await fs.readFile(this.filePath, defaultEncoding);
      const data = JSON.parse(raw) as GradeFile;
      return { attempts: data.attempts ?? {} };
    } catch (err) {
      const code =
        err && typeof (err as NodeJS.ErrnoException).code === 'string'
          ? (err as NodeJS.ErrnoException).code
          : '';
      if (code === 'ENOENT') return emptyFile();
      throw err;
    }
  }

  private async write(file: GradeFile): Promise<void> {
    await this.ensureDir();
    await fs.writeFile(
      this.filePath,
      JSON.stringify(file, null, 2),
      defaultEncoding
    );
  }

  private toAttempt(row: GradeFile['attempts'][string]): GradeAttempt {
    return {
      id: row.id,
      classId: row.classId,
      quizId: row.quizId,
      sessionId: row.sessionId ?? null,
      completedAt: new Date(row.completedAt),
      source: row.source === 'manual' ? 'manual' : 'session',
    };
  }

  private withScores(
    row: GradeFile['attempts'][string]
  ): GradeAttemptWithScores {
    return {
      ...this.toAttempt(row),
      scores: (row.scores ?? []).map((s) => ({ ...s })),
      details: (row.details ?? []).map((d) => ({ ...d })),
    };
  }

  async findBySessionId(sessionId: string): Promise<GradeAttempt | null> {
    const file = await this.read();
    for (const row of Object.values(file.attempts)) {
      if (row.sessionId === sessionId) return this.toAttempt(row);
    }
    return null;
  }

  async saveAttempt(input: {
    attempt: GradeAttempt;
    scores: GradeAttemptScore[];
    details: GradeAnswerDetail[];
  }): Promise<void> {
    const file = await this.read();
    file.attempts[input.attempt.id] = {
      id: input.attempt.id,
      classId: input.attempt.classId,
      quizId: input.attempt.quizId,
      sessionId: input.attempt.sessionId ?? null,
      completedAt: new Date(input.attempt.completedAt).toISOString(),
      source: input.attempt.source,
      scores: input.scores.map((s) => ({ ...s })),
      details: input.details.map((d) => ({ ...d })),
    };
    await this.write(file);
  }

  async listLatestByClass(classId: string): Promise<GradeAttemptWithScores[]> {
    const file = await this.read();
    const byQuiz = new Map<string, GradeFile['attempts'][string]>();
    for (const row of Object.values(file.attempts)) {
      if (row.classId !== classId) continue;
      const prev = byQuiz.get(row.quizId);
      if (
        !prev ||
        new Date(row.completedAt).getTime() >
          new Date(prev.completedAt).getTime()
      ) {
        byQuiz.set(row.quizId, row);
      }
    }
    return Array.from(byQuiz.values())
      .sort(
        (a, b) =>
          new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      )
      .map((row) => this.withScores(row));
  }

  async getAttempt(attemptId: string): Promise<GradeAttemptWithScores | null> {
    const file = await this.read();
    const row = file.attempts[attemptId];
    return row ? this.withScores(row) : null;
  }

  async getLatestForClassQuiz(
    classId: string,
    quizId: string,
    attemptId?: string
  ): Promise<GradeAttemptWithScores | null> {
    if (attemptId) {
      const attempt = await this.getAttempt(attemptId);
      if (!attempt) return null;
      if (attempt.classId !== classId || attempt.quizId !== quizId) return null;
      return attempt;
    }
    const file = await this.read();
    let latest: GradeFile['attempts'][string] | null = null;
    for (const row of Object.values(file.attempts)) {
      if (row.classId !== classId || row.quizId !== quizId) continue;
      if (
        !latest ||
        new Date(row.completedAt).getTime() >
          new Date(latest.completedAt).getTime()
      ) {
        latest = row;
      }
    }
    return latest ? this.withScores(latest) : null;
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
    const file = await this.read();
    const row = file.attempts[attemptId];
    if (!row) return null;
    const details = [...(row.details ?? [])];
    for (const update of updates) {
      const idx = details.findIndex(
        (d) =>
          d.studentName === update.studentName &&
          d.questionId === update.questionId
      );
      const next: GradeAnswerDetail = {
        attemptId,
        studentName: update.studentName,
        questionId: update.questionId,
        isCorrect: update.isCorrect,
        points: update.points,
      };
      if (idx >= 0) details[idx] = next;
      else details.push(next);
    }
    row.details = details;

    const byStudent = new Map<string, GradeAnswerDetail[]>();
    for (const d of details) {
      const list = byStudent.get(d.studentName) ?? [];
      list.push(d);
      byStudent.set(d.studentName, list);
    }
    row.scores = Array.from(byStudent.entries()).map(
      ([studentName, list]) => ({
        attemptId,
        studentName,
        courseCorrect: list.filter((d) => d.points > 0).length,
        courseTotal: list.length,
      })
    );
    await this.write(file);
    return this.withScores(row);
  }
}
