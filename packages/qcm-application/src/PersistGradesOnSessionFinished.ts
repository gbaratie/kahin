import type {
  GradeRepository,
  QuizRepository,
  Session,
  Quiz,
} from '@kahin/qcm-domain';
import {
  coursePointsForAnswer,
  isGradableCourseQuestion,
} from './courseScoring';

export class PersistGradesOnSessionFinished {
  constructor(
    private readonly gradeRepository: GradeRepository,
    private readonly quizRepository: QuizRepository
  ) {}

  async execute(session: Session, quiz?: Quiz | null): Promise<void> {
    if (!session.classId) return;
    if (session.status !== 'finished') return;

    const existing = await this.gradeRepository.findBySessionId(session.id);
    if (existing) return;

    const resolvedQuiz =
      quiz ?? (await this.quizRepository.getById(session.quizId));
    if (!resolvedQuiz) return;

    const courseQuestions = resolvedQuiz.questions.filter((q) =>
      isGradableCourseQuestion(q)
    );
    if (courseQuestions.length === 0) return;

    const attemptId = crypto.randomUUID();
    const details = [];
    const scores = [];

    for (const participant of session.participants) {
      let courseCorrect = 0;
      for (const question of courseQuestions) {
        const answer = session.answers.find(
          (a) =>
            a.participantId === participant.id && a.questionId === question.id
        );
        const { isCorrect, points } = coursePointsForAnswer(question, answer);
        if (points > 0) courseCorrect += 1;
        details.push({
          attemptId,
          studentName: participant.name,
          questionId: question.id,
          isCorrect,
          points,
        });
      }
      scores.push({
        attemptId,
        studentName: participant.name,
        courseCorrect,
        courseTotal: courseQuestions.length,
      });
    }

    await this.gradeRepository.saveAttempt({
      attempt: {
        id: attemptId,
        classId: session.classId,
        quizId: session.quizId,
        sessionId: session.id,
        completedAt: new Date(),
        source: 'session',
      },
      scores,
      details,
    });
  }
}
