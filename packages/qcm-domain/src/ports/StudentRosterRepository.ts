import type { StudentRoster } from '../entities/StudentRoster';

export interface StudentRosterRepository {
  get(): Promise<StudentRoster>;
  save(roster: StudentRoster): Promise<void>;
}
