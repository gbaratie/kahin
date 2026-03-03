import type {
  QuizRepository,
  SessionRepository,
  RealtimeTransport,
} from '@kahin/qcm-domain';

function getShownAtMs(shownAt: Date | string | null | undefined): number | null {
  if (shownAt == null) return null;
  if (shownAt instanceof Date) return shownAt.getTime();
  if (typeof shownAt === 'string') return new Date(shownAt).getTime();
  return null;
}

export class AdvanceIfTimeUpUseCase {
  constructor(
    private readonly quizRepository: QuizRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly realtimeTransport: RealtimeTransport
  ) {}

  async execute(sessionId: string): Promise<{ advanced: boolean }> {
    const session = await this.sessionRepository.getById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    if (session.status !== 'in_progress' || session.showingResult === true) {
      return { advanced: false };
    }

    const quiz = await this.quizRepository.getById(session.quizId);
    if (!quiz) return { advanced: false };

    const index = session.currentQuestionIndex;
    if (index < 0 || index >= quiz.questions.length) return { advanced: false };

    const shownAtRaw = session.questionShownAtTimestamps?.[index];
    const shownAtMs = getShownAtMs(
      shownAtRaw as Date | string | null | undefined
    );
    if (shownAtMs == null) return { advanced: false };

    const question = quiz.questions[index];
    const timerSeconds = question.timerSeconds ?? 10;
    const elapsedSeconds = (Date.now() - shownAtMs) / 1000;
    if (elapsedSeconds < timerSeconds) return { advanced: false };

    const updatedSession = {
      ...session,
      showingResult: true,
    };
    await this.sessionRepository.save(updatedSession);

    await this.realtimeTransport.joinChannel?.(sessionId);
    await this.realtimeTransport.publish('question_result', {
      sessionId,
      questionIndex: index,
    });

    return { advanced: true };
  }
}
