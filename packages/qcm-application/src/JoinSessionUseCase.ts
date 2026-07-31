import type { Session, Participant } from '@kahin/qcm-domain';
import type {
  SessionRepository,
  RealtimeTransport,
  ClassRepository,
} from '@kahin/qcm-domain';

export type JoinSessionInput = {
  code: string;
  participantName: string;
};

export type JoinSessionResult = {
  session: Session;
  participant: Participant;
};

function namesMatch(a: string, b: string): boolean {
  return a.trim().toLocaleLowerCase('fr') === b.trim().toLocaleLowerCase('fr');
}

export class JoinSessionUseCase {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly realtimeTransport: RealtimeTransport,
    private readonly classRepository?: ClassRepository
  ) {}

  async execute(input: JoinSessionInput): Promise<JoinSessionResult> {
    const session = await this.sessionRepository.getByCode(input.code);
    if (!session) {
      throw new Error('Session not found');
    }
    if (session.status === 'finished') {
      throw new Error('Session is already finished');
    }

    const participantName = input.participantName.trim() || 'Participant';

    let canonicalName = participantName;
    if (session.classId && this.classRepository) {
      const schoolClass = await this.classRepository.getById(session.classId);
      if (!schoolClass) {
        throw new Error('Class not found');
      }
      if (schoolClass.names.length > 0) {
        const match = schoolClass.names.find((n) =>
          namesMatch(n, participantName)
        );
        if (!match) {
          throw new Error('Name not in student roster');
        }
        canonicalName = match;
      }
    }

    // Reconnexion : si ce nom est déjà dans la session, réutiliser le participant.
    const existing = session.participants.find((p) =>
      namesMatch(p.name, canonicalName)
    );
    if (existing) {
      await this.realtimeTransport.joinChannel?.(session.id);
      return { session, participant: existing };
    }

    const participant: Participant = {
      id: crypto.randomUUID(),
      name: canonicalName,
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
