import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type {
  ClassRepository,
  GradeRepository,
  GradeAttempt,
  GradeAttemptScore,
  GradeAnswerDetail,
  GradeAttemptWithScores,
  Quiz,
  QuizRepository,
  SchoolClass,
  Session,
} from '@kahin/qcm-domain';
import { PersistGradesOnSessionFinished } from './PersistGradesOnSessionFinished.js';
import {
  GetClassGradesMacroUseCase,
  UpdateQuizCoefficientUseCase,
} from './GradeUseCases.js';

class FakeQuizRepo implements QuizRepository {
  constructor(private quiz: Quiz) {}
  async save(quiz: Quiz): Promise<void> {
    this.quiz = quiz;
  }
  async getById(id: string): Promise<Quiz | null> {
    return this.quiz.id === id ? this.quiz : null;
  }
  async list() {
    return [
      {
        id: this.quiz.id,
        title: this.quiz.title,
        coefficient: this.quiz.coefficient,
      },
    ];
  }
  async delete(): Promise<void> {}
  async updateCoefficient(quizId: string, coefficient: number): Promise<void> {
    if (this.quiz.id !== quizId) throw new Error('Quiz not found');
    this.quiz = { ...this.quiz, coefficient };
  }
}

class FakeClassRepo implements ClassRepository {
  constructor(private schoolClass: SchoolClass) {}
  async list() {
    return [this.schoolClass];
  }
  async getById(id: string) {
    return this.schoolClass.id === id ? this.schoolClass : null;
  }
  async save(): Promise<void> {}
  async delete(): Promise<void> {}
}

class FakeGradeRepo implements GradeRepository {
  private attempts = new Map<string, GradeAttemptWithScores>();

  async findBySessionId(sessionId: string) {
    for (const a of this.attempts.values()) {
      if (a.sessionId === sessionId) return a;
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
      scores: input.scores,
      details: input.details,
    });
  }

  async listLatestByClass(classId: string) {
    return Array.from(this.attempts.values()).filter(
      (a) => a.classId === classId
    );
  }

  async getAttempt(attemptId: string) {
    return this.attempts.get(attemptId) ?? null;
  }

  async getLatestForClassQuiz(
    classId: string,
    quizId: string,
    attemptId?: string
  ) {
    if (attemptId) return this.getAttempt(attemptId);
    return (
      Array.from(this.attempts.values()).find(
        (a) => a.classId === classId && a.quizId === quizId
      ) ?? null
    );
  }

  async updateAnswerDetails() {
    return null;
  }
}

describe('notes persistées + moyenne', () => {
  it('persiste les notes cours à la fin de session et calcule la moyenne pondérée', async () => {
    const quiz: Quiz = {
      id: 'quiz-1',
      title: 'Chapitre 1',
      coefficient: 2,
      questions: [
        {
          id: 'qd',
          label: 'Découverte',
          type: 'qcm',
          playMode: 'discovery',
          correctChoiceId: 'a',
          choices: [
            { id: 'a', label: 'A' },
            { id: 'b', label: 'B' },
          ],
        },
        {
          id: 'qc',
          label: 'Cours',
          type: 'qcm',
          playMode: 'course',
          correctChoiceId: 'c',
          choices: [
            { id: 'c', label: 'Oui' },
            { id: 'd', label: 'Non' },
          ],
        },
      ],
    };

    const quizRepo = new FakeQuizRepo(quiz);
    const gradeRepo = new FakeGradeRepo();
    const classRepo = new FakeClassRepo({
      id: 'class-1',
      name: '3A',
      names: ['Alice', 'Bob'],
    });

    const session: Session = {
      id: 'session-1',
      quizId: 'quiz-1',
      code: 'XYZ789',
      status: 'finished',
      classId: 'class-1',
      currentQuestionIndex: 1,
      participants: [
        { id: 'p1', name: 'Alice', joinedAt: new Date() },
        { id: 'p2', name: 'Bob', joinedAt: new Date() },
      ],
      answers: [
        {
          participantId: 'p1',
          questionId: 'qd',
          choiceId: 'a',
          answeredAt: new Date(),
        },
        {
          participantId: 'p1',
          questionId: 'qc',
          choiceId: 'c',
          answeredAt: new Date(),
        },
        {
          participantId: 'p2',
          questionId: 'qc',
          choiceId: 'd',
          answeredAt: new Date(),
        },
      ],
    };

    const persist = new PersistGradesOnSessionFinished(gradeRepo, quizRepo);
    await persist.execute(session);
    await persist.execute(session);

    const attempts = await gradeRepo.listLatestByClass('class-1');
    assert.equal(attempts.length, 1);
    assert.equal(attempts[0].details.length, 2);
    assert.equal(
      attempts[0].scores.find((s) => s.studentName === 'Alice')?.courseCorrect,
      1
    );
    assert.equal(
      attempts[0].scores.find((s) => s.studentName === 'Bob')?.courseCorrect,
      0
    );

    const macro = await new GetClassGradesMacroUseCase(
      gradeRepo,
      classRepo,
      quizRepo
    ).execute('class-1');
    assert.equal(macro.averagesByStudent.Alice, 1);
    assert.equal(macro.averagesByStudent.Bob, 0);
    assert.equal(macro.quizzes[0].coefficient, 2);

    await new UpdateQuizCoefficientUseCase(quizRepo).execute('quiz-1', 3);
    const macro2 = await new GetClassGradesMacroUseCase(
      gradeRepo,
      classRepo,
      quizRepo
    ).execute('class-1');
    assert.equal(macro2.quizzes[0].coefficient, 3);
  });
});
