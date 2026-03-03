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

    await this.realtimeTransport.joinChannel?.(sessionId);

    // 1) Session en attente : clic "Lancer la session" → afficher la première question
    if (session.status === 'waiting') {
      const timestamps: (Date | null)[] = Array.from(
        { length: quiz.questions.length },
        (_, i) => (i === 0 ? new Date() : null)
      );
      const updatedSession = {
        ...session,
        status: 'in_progress' as const,
        currentQuestionIndex: 0,
        showingResult: false,
        questionShownAtTimestamps: timestamps,
      };
      await this.sessionRepository.save(updatedSession);
      const question = quiz.questions[0];
      if (question) {
        const shownAt = timestamps[0];
        await this.realtimeTransport.publish('question_show', {
          sessionId,
          questionIndex: 0,
          question,
          questionShownAt: shownAt instanceof Date ? shownAt.toISOString() : undefined,
        });
      }
      return { finished: false };
    }

    // 2) En cours, on affiche la question : clic "Voir les résultats" → passer en phase résultat
    if (session.status === 'in_progress' && session.showingResult !== true) {
      const updatedSession = {
        ...session,
        showingResult: true,
      };
      await this.sessionRepository.save(updatedSession);
      await this.realtimeTransport.publish('question_result', {
        sessionId,
        questionIndex: session.currentQuestionIndex,
      });
      return { finished: false };
    }

    // 3) En cours, on affiche le résultat : clic "Continuer" → question suivante (ou terminer)
    const nextIndex = session.currentQuestionIndex + 1;

    if (nextIndex >= quiz.questions.length) {
      const updatedSession = {
        ...session,
        status: 'finished' as const,
        currentQuestionIndex: quiz.questions.length - 1,
        showingResult: true,
      };
      await this.sessionRepository.save(updatedSession);
      await this.realtimeTransport.publish('session_finished', {
        sessionId,
      });
      return { finished: true };
    }

    const existingTimestamps = session.questionShownAtTimestamps ?? [];
    const timestamps = [...existingTimestamps];
    while (timestamps.length <= nextIndex) {
      timestamps.push(null);
    }
    timestamps[nextIndex] = new Date();

    const updatedSession = {
      ...session,
      currentQuestionIndex: nextIndex,
      showingResult: false,
      questionShownAtTimestamps: timestamps,
    };
    await this.sessionRepository.save(updatedSession);

    const question = quiz.questions[nextIndex];
    const shownAt = timestamps[nextIndex];
    await this.realtimeTransport.publish('question_show', {
      sessionId,
      questionIndex: nextIndex,
      question,
      questionShownAt: shownAt instanceof Date ? shownAt.toISOString() : undefined,
    });

    return { finished: false };
  }
}
