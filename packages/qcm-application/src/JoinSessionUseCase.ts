import type { Session, Participant } from '@kahin/qcm-domain';
import type { SessionRepository, RealtimeTransport } from '@kahin/qcm-domain';

export type JoinSessionInput = {
  code: string;
  participantName: string;
};

export type JoinSessionResult = {
  session: Session;
  participant: Participant;
};

export class JoinSessionUseCase {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly realtimeTransport: RealtimeTransport
  ) {}

  async execute(input: JoinSessionInput): Promise<JoinSessionResult> {
    const session = await this.sessionRepository.getByCode(input.code);
    if (!session) {
      throw new Error('Session not found');
    }
    if (session.status === 'finished') {
      throw new Error('Session is already finished');
    }

    const participant: Participant = {
      id: crypto.randomUUID(),
      name: input.participantName,
      joinedAt: new Date(),
    };

    const updatedSession: Session = {
      ...session,
      participants: [...session.participants, participant],
    };

    await this.sessionRepository.save(updatedSession);

    await this.realtimeTransport.joinChannel?.(session.id);
    await this.realtimeTransport.publish('participant_joined', {
      sessionId: session.id,
      participant,
    });

    return { session: updatedSession, participant };
  }
}
