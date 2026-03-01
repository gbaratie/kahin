import type { Session } from '../entities/Session';

export interface SessionRepository {
  save(session: Session): Promise<void>;
  getByCode(code: string): Promise<Session | null>;
  getById(id: string): Promise<Session | null>;
}
