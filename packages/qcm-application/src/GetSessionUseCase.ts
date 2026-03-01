import type { Session } from '@kahin/qcm-domain';
import type { SessionRepository } from '@kahin/qcm-domain';

export class GetSessionUseCase {
  constructor(private readonly sessionRepository: SessionRepository) {}

  async execute(sessionId: string): Promise<Session | null> {
    return this.sessionRepository.getById(sessionId);
  }
}
