import type {
  QuizRepository,
  SessionRepository,
  RealtimeTransport,
} from '@kahin/qcm-domain';

export class NextQuestionUseCase {
  constructor(
    private readonly quizRepository: QuizRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly realtimeTransport: RealtimeTransport
  ) {}

  async execute(sessionId: string): Promise<{ finished: boolean }> {
    const session = await this.sessionRepository.getById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const quiz = await this.quizRepository.getById(session.quizId);
    if (!quiz) {
      throw new Error('Quiz not found');
    }

    const nextIndex = session.currentQuestionIndex + 1;

    if (nextIndex >= quiz.questions.length) {
      const updatedSession = {
        ...session,
        status: 'finished' as const,
        currentQuestionIndex: quiz.questions.length - 1,
      };
      await this.sessionRepository.save(updatedSession);
      await this.realtimeTransport.joinChannel?.(sessionId);
      await this.realtimeTransport.publish('session_finished', {
        sessionId,
      });
      return { finished: true };
    }

    const updatedSession = {
      ...session,
      status: 'in_progress' as const,
      currentQuestionIndex: nextIndex,
    };
    await this.sessionRepository.save(updatedSession);

    const question = quiz.questions[nextIndex];
    await this.realtimeTransport.joinChannel?.(sessionId);
    await this.realtimeTransport.publish('question_show', {
      sessionId,
      questionIndex: nextIndex,
      question,
    });

    return { finished: false };
  }
}
