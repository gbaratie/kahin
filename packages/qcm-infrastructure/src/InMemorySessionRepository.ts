import type { Session } from '@kahin/qcm-domain';
import type { SessionRepository } from '@kahin/qcm-domain';

export class InMemorySessionRepository implements SessionRepository {
  private readonly byId = new Map<string, Session>();
  private readonly byCode = new Map<string, Session>();

  async save(session: Session): Promise<void> {
    const copy = { ...session };
    this.byId.set(session.id, copy);
    this.byCode.set(session.code.toLowerCase(), copy);
  }

  async getByCode(code: string): Promise<Session | null> {
    const session = this.byCode.get(code.toLowerCase());
    return session ? { ...session } : null;
  }

  async getById(id: string): Promise<Session | null> {
    const session = this.byId.get(id);
    return session ? { ...session } : null;
  }
}
