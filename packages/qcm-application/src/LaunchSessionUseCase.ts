import type { Session } from '@kahin/qcm-domain';
import type {
  QuizRepository,
  SessionRepository,
  RealtimeTransport,
} from '@kahin/qcm-domain';

function generateSessionCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export class LaunchSessionUseCase {
  constructor(
    private readonly quizRepository: QuizRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly realtimeTransport: RealtimeTransport
  ) {}

  async execute(quizId: string): Promise<Session> {
    const quiz = await this.quizRepository.getById(quizId);
    if (!quiz) {
      throw new Error('Quiz not found');
    }

    const session: Session = {
      id: crypto.randomUUID(),
      quizId,
      code: generateSessionCode(),
      status: 'waiting',
      currentQuestionIndex: -1,
      participants: [],
      answers: [],
    };

    await this.sessionRepository.save(session);

    await this.realtimeTransport.joinChannel?.(session.id);
    await this.realtimeTransport.publish('session_started', {
      sessionId: session.id,
      code: session.code,
      quizTitle: quiz.title,
    });

    return session;
  }
}
