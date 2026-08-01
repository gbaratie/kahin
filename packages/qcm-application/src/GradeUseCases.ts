import type {
  ClassRepository,
  GradeRepository,
  QuizRepository,
  GradeAttemptWithScores,
} from '@kahin/qcm-domain';

export type ClassGradesMacroQuiz = {
  quizId: string;
  quizTitle: string;
  coefficient: number;
  attemptId: string;
  completedAt: string;
  scoresByStudent: Record<
    string,
    { courseCorrect: number; courseTotal: number; ratio: number }
  >;
};

export type ClassGradesMacro = {
  classId: string;
  className: string;
  students: string[];
  quizzes: ClassGradesMacroQuiz[];
  averagesByStudent: Record<string, number | null>;
};

export type ClassQuizGradeDetail = {
  classId: string;
  quizId: string;
  quizTitle: string;
  coefficient: number;
  attempt: GradeAttemptWithScores;
  questions: Array<{ id: string; label: string }>;
};

function ratio(correct: number, total: number): number {
  if (total <= 0) return 0;
  return correct / total;
}

export class GetClassGradesMacroUseCase {
  constructor(
    private readonly gradeRepository: GradeRepository,
    private readonly classRepository: ClassRepository,
    private readonly quizRepository: QuizRepository
  ) {}

  async execute(classId: string): Promise<ClassGradesMacro> {
    const schoolClass = await this.classRepository.getById(classId);
    if (!schoolClass) {
      const err = new Error('Class not found');
      (err as Error & { code?: string }).code = 'CLASS_NOT_FOUND';
      throw err;
    }

    const attempts = await this.gradeRepository.listLatestByClass(classId);
    const quizzes: ClassGradesMacroQuiz[] = [];

    for (const attempt of attempts) {
      const quiz = await this.quizRepository.getById(attempt.quizId);
      if (!quiz) continue;
      const scoresByStudent: ClassGradesMacroQuiz['scoresByStudent'] = {};
      for (const score of attempt.scores) {
        scoresByStudent[score.studentName] = {
          courseCorrect: score.courseCorrect,
          courseTotal: score.courseTotal,
          ratio: ratio(score.courseCorrect, score.courseTotal),
        };
      }
      quizzes.push({
        quizId: attempt.quizId,
        quizTitle: quiz.title,
        coefficient:
          typeof quiz.coefficient === 'number' && quiz.coefficient > 0
            ? quiz.coefficient
            : 1,
        attemptId: attempt.id,
        completedAt: new Date(attempt.completedAt).toISOString(),
        scoresByStudent,
      });
    }

    const averagesByStudent: Record<string, number | null> = {};
    for (const student of schoolClass.names) {
      let weighted = 0;
      let coefSum = 0;
      for (const q of quizzes) {
        const score = q.scoresByStudent[student];
        if (!score || score.courseTotal <= 0) continue;
        weighted += score.ratio * q.coefficient;
        coefSum += q.coefficient;
      }
      averagesByStudent[student] = coefSum > 0 ? weighted / coefSum : null;
    }

    return {
      classId: schoolClass.id,
      className: schoolClass.name,
      students: [...schoolClass.names],
      quizzes,
      averagesByStudent,
    };
  }
}

export class GetClassQuizGradeDetailUseCase {
  constructor(
    private readonly gradeRepository: GradeRepository,
    private readonly quizRepository: QuizRepository
  ) {}

  async execute(
    classId: string,
    quizId: string,
    attemptId?: string
  ): Promise<ClassQuizGradeDetail> {
    const attempt = await this.gradeRepository.getLatestForClassQuiz(
      classId,
      quizId,
      attemptId
    );
    if (!attempt) {
      const err = new Error('Grade attempt not found');
      (err as Error & { code?: string }).code = 'GRADE_NOT_FOUND';
      throw err;
    }
    const quiz = await this.quizRepository.getById(quizId);
    if (!quiz) {
      const err = new Error('Quiz not found');
      (err as Error & { code?: string }).code = 'QUIZ_NOT_FOUND';
      throw err;
    }
    const questionIds = new Set(attempt.details.map((d) => d.questionId));
    const questions = quiz.questions
      .filter((q) => questionIds.has(q.id))
      .map((q) => ({ id: q.id, label: q.label }));

    return {
      classId,
      quizId,
      quizTitle: quiz.title,
      coefficient:
        typeof quiz.coefficient === 'number' && quiz.coefficient > 0
          ? quiz.coefficient
          : 1,
      attempt,
      questions,
    };
  }
}

export class UpdateGradeAnswersUseCase {
  constructor(private readonly gradeRepository: GradeRepository) {}

  async execute(
    attemptId: string,
    updates: Array<{
      studentName: string;
      questionId: string;
      isCorrect?: boolean;
      points?: number;
    }>
  ): Promise<GradeAttemptWithScores> {
    const normalized = updates.map((u) => {
      const points =
        typeof u.points === 'number' && Number.isFinite(u.points)
          ? Math.max(0, Math.min(1, u.points))
          : u.isCorrect
            ? 1
            : 0;
      const isCorrect =
        typeof u.isCorrect === 'boolean' ? u.isCorrect : points > 0;
      return {
        studentName: u.studentName,
        questionId: u.questionId,
        isCorrect,
        points,
      };
    });
    const result = await this.gradeRepository.updateAnswerDetails(
      attemptId,
      normalized
    );
    if (!result) {
      const err = new Error('Grade attempt not found');
      (err as Error & { code?: string }).code = 'GRADE_NOT_FOUND';
      throw err;
    }
    return result;
  }
}

export class UpdateQuizCoefficientUseCase {
  constructor(private readonly quizRepository: QuizRepository) {}

  async execute(quizId: string, coefficient: number): Promise<void> {
    if (!Number.isFinite(coefficient) || coefficient <= 0) {
      throw new Error('coefficient must be a positive number');
    }
    if (!this.quizRepository.updateCoefficient) {
      const quiz = await this.quizRepository.getById(quizId);
      if (!quiz) {
        const err = new Error('Quiz not found');
        (err as Error & { code?: string }).code = 'QUIZ_NOT_FOUND';
        throw err;
      }
      await this.quizRepository.save({ ...quiz, coefficient });
      return;
    }
    await this.quizRepository.updateCoefficient(quizId, coefficient);
  }
}
