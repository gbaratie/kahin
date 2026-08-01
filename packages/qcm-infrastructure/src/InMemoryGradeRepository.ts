import type {
  GradeAnswerDetail,
  GradeAttempt,
  GradeAttemptScore,
  GradeRepository,
  GradeAttemptWithScores,
} from '@kahin/qcm-domain';

export class InMemoryGradeRepository implements GradeRepository {
  private readonly attempts = new Map<string, GradeAttempt>();
  private readonly scores = new Map<string, GradeAttemptScore[]>();
  private readonly details = new Map<string, GradeAnswerDetail[]>();

  async findBySessionId(sessionId: string): Promise<GradeAttempt | null> {
    for (const attempt of this.attempts.values()) {
      if (attempt.sessionId === sessionId) return { ...attempt };
    }
    return null;
  }

  async saveAttempt(input: {
    attempt: GradeAttempt;
    scores: GradeAttemptScore[];
    details: GradeAnswerDetail[];
  }): Promise<void> {
    this.attempts.set(input.attempt.id, {
      ...input.attempt,
      completedAt: new Date(input.attempt.completedAt),
    });
    this.scores.set(
      input.attempt.id,
      input.scores.map((s) => ({ ...s }))
    );
    this.details.set(
      input.attempt.id,
      input.details.map((d) => ({ ...d }))
    );
  }

  async listLatestByClass(classId: string): Promise<GradeAttemptWithScores[]> {
    const byQuiz = new Map<string, GradeAttempt>();
    for (const attempt of this.attempts.values()) {
      if (attempt.classId !== classId) continue;
      const prev = byQuiz.get(attempt.quizId);
      if (
        !prev ||
        new Date(attempt.completedAt).getTime() >
          new Date(prev.completedAt).getTime()
      ) {
        byQuiz.set(attempt.quizId, attempt);
      }
    }
    return Array.from(byQuiz.values())
      .sort(
        (a, b) =>
          new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      )
      .map((a) => this.withScores(a));
  }

  async getAttempt(attemptId: string): Promise<GradeAttemptWithScores | null> {
    const attempt = this.attempts.get(attemptId);
    if (!attempt) return null;
    return this.withScores(attempt);
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
    let latest: GradeAttempt | null = null;
    for (const attempt of this.attempts.values()) {
      if (attempt.classId !== classId || attempt.quizId !== quizId) continue;
      if (
        !latest ||
        new Date(attempt.completedAt).getTime() >
          new Date(latest.completedAt).getTime()
      ) {
        latest = attempt;
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
    const attempt = this.attempts.get(attemptId);
    if (!attempt) return null;
    const details = [...(this.details.get(attemptId) ?? [])];
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
    this.details.set(attemptId, details);

    const byStudent = new Map<string, GradeAnswerDetail[]>();
    for (const d of details) {
      const list = byStudent.get(d.studentName) ?? [];
      list.push(d);
      byStudent.set(d.studentName, list);
    }
    const scores: GradeAttemptScore[] = [];
    for (const [studentName, list] of byStudent) {
      const courseTotal = list.length;
      const courseCorrect = list.filter((d) => d.points > 0).length;
      scores.push({
        attemptId,
        studentName,
        courseCorrect,
        courseTotal,
      });
    }
    this.scores.set(attemptId, scores);
    return this.withScores(attempt);
  }

  private withScores(attempt: GradeAttempt): GradeAttemptWithScores {
    return {
      ...attempt,
      completedAt: new Date(attempt.completedAt),
      scores: [...(this.scores.get(attempt.id) ?? [])],
      details: [...(this.details.get(attempt.id) ?? [])],
    };
  }
}
