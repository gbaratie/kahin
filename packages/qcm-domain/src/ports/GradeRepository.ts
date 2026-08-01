import type {
  GradeAnswerDetail,
  GradeAttempt,
  GradeAttemptScore,
} from '../entities/Grade';

export type GradeAttemptWithScores = GradeAttempt & {
  scores: GradeAttemptScore[];
  details: GradeAnswerDetail[];
};

export interface GradeRepository {
  findBySessionId(sessionId: string): Promise<GradeAttempt | null>;

  saveAttempt(input: {
    attempt: GradeAttempt;
    scores: GradeAttemptScore[];
    details: GradeAnswerDetail[];
  }): Promise<void>;

  /** Dernière tentative par quiz pour une classe. */
  listLatestByClass(classId: string): Promise<GradeAttemptWithScores[]>;

  getAttempt(attemptId: string): Promise<GradeAttemptWithScores | null>;

  /** Dernière tentative d’un QCM pour une classe, ou une tentative précise. */
  getLatestForClassQuiz(
    classId: string,
    quizId: string,
    attemptId?: string
  ): Promise<GradeAttemptWithScores | null>;

  updateAnswerDetails(
    attemptId: string,
    updates: Array<{
      studentName: string;
      questionId: string;
      isCorrect: boolean;
      points: number;
    }>
  ): Promise<GradeAttemptWithScores | null>;
}
