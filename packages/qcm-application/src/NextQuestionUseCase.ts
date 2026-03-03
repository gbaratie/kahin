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
      const updatedSession = {
        ...session,
        status: 'in_progress' as const,
        currentQuestionIndex: 0,
        showingResult: false,
      };
      await this.sessionRepository.save(updatedSession);
      const question = quiz.questions[0];
      if (question) {
        await this.realtimeTransport.publish('question_show', {
          sessionId,
          questionIndex: 0,
          question,
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

    const updatedSession = {
      ...session,
      currentQuestionIndex: nextIndex,
      showingResult: false,
    };
    await this.sessionRepository.save(updatedSession);

    const question = quiz.questions[nextIndex];
    await this.realtimeTransport.publish('question_show', {
      sessionId,
      questionIndex: nextIndex,
      question,
    });

    return { finished: false };
  }
}
