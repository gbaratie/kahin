import type { StudentRoster, StudentRosterRepository } from '@kahin/qcm-domain';

export class GetStudentRosterUseCase {
  constructor(private readonly rosterRepository: StudentRosterRepository) {}

  async execute(): Promise<StudentRoster> {
    return this.rosterRepository.get();
  }
}
