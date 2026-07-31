import type { ClassRepository, SchoolClass } from '@kahin/qcm-domain';

/**
 * Infos publiques pour rejoindre une session à partir du code :
 * liste de noms de la classe, ou inscription libre.
 */
export type SessionJoinInfo = {
  sessionId: string;
  code: string;
  classId: string | null;
  className: string | null;
  /** Noms à choisir ; vide = inscription libre. */
  names: string[];
  freeRegistration: boolean;
};

export class GetSessionJoinInfoUseCase {
  constructor(
    private readonly sessionRepository: {
      getByCode(code: string): Promise<{
        id: string;
        code: string;
        status: string;
        classId?: string | null;
      } | null>;
    },
    private readonly classRepository?: ClassRepository
  ) {}

  async execute(code: string): Promise<SessionJoinInfo> {
    const session = await this.sessionRepository.getByCode(
      code.trim().toUpperCase()
    );
    if (!session) {
      throw new Error('Session not found');
    }
    if (session.status === 'finished') {
      throw new Error('Session is already finished');
    }

    const classId = session.classId ?? null;
    if (!classId || !this.classRepository) {
      return {
        sessionId: session.id,
        code: session.code,
        classId: null,
        className: null,
        names: [],
        freeRegistration: true,
      };
    }

    const schoolClass: SchoolClass | null =
      await this.classRepository.getById(classId);
    if (!schoolClass) {
      return {
        sessionId: session.id,
        code: session.code,
        classId: null,
        className: null,
        names: [],
        freeRegistration: true,
      };
    }

    const freeRegistration = schoolClass.names.length === 0;
    return {
      sessionId: session.id,
      code: session.code,
      classId: schoolClass.id,
      className: schoolClass.name,
      names: [...schoolClass.names],
      freeRegistration,
    };
  }
}
