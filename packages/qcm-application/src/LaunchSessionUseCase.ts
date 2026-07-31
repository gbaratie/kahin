import type { Session } from '@kahin/qcm-domain';
import type {
  QuizRepository,
  SessionRepository,
  RealtimeTransport,
  ClassRepository,
} from '@kahin/qcm-domain';

function generateSessionCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export type LaunchSessionInput = {
  quizId: string;
  /**
   * Classe à utiliser pour cette session.
   * - `string` : liste de cette classe
   * - `null` / `undefined` : inscription libre
   */
  classId?: string | null;
};

export class LaunchSessionUseCase {
  constructor(
    private readonly quizRepository: QuizRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly realtimeTransport: RealtimeTransport,
    private readonly classRepository?: ClassRepository
  ) {}

  async execute(input: LaunchSessionInput | string): Promise<Session> {
    const quizId = typeof input === 'string' ? input : input.quizId;
    const classId = typeof input === 'string' ? null : (input.classId ?? null);

    const quiz = await this.quizRepository.getById(quizId);
    if (!quiz) {
      throw new Error('Quiz not found');
    }

    let resolvedClassId: string | null = null;
    if (classId) {
      if (!this.classRepository) {
        throw new Error('Class not found');
      }
      const schoolClass = await this.classRepository.getById(classId);
      if (!schoolClass) {
        throw new Error('Class not found');
      }
      resolvedClassId = schoolClass.id;
    }

    const session: Session = {
      id: crypto.randomUUID(),
      quizId,
      code: generateSessionCode(),
      status: 'waiting',
      classId: resolvedClassId,
      currentQuestionIndex: -1,
      questionShownAtTimestamps: Array.from(
        { length: quiz.questions.length },
        () => null
      ),
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
