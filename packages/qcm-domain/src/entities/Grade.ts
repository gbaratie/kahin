export type GradeAttemptSource = 'session' | 'manual';

export type GradeAttempt = {
  id: string;
  classId: string;
  quizId: string;
  sessionId?: string | null;
  completedAt: Date;
  source: GradeAttemptSource;
};

export type GradeAttemptScore = {
  attemptId: string;
  studentName: string;
  courseCorrect: number;
  courseTotal: number;
};

export type GradeAnswerDetail = {
  attemptId: string;
  studentName: string;
  questionId: string;
  isCorrect: boolean;
  points: number;
};
