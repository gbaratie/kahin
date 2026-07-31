import type { StudentRoster, StudentRosterRepository } from '@kahin/qcm-domain';

export class InMemoryStudentRosterRepository implements StudentRosterRepository {
  private roster: StudentRoster = { names: [] };

  async get(): Promise<StudentRoster> {
    return { names: [...this.roster.names] };
  }

  async save(roster: StudentRoster): Promise<void> {
    this.roster = { names: [...roster.names] };
  }
}
