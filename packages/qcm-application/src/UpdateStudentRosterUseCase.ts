import type { StudentRoster, StudentRosterRepository } from '@kahin/qcm-domain';
import { normalizeRosterNames } from './normalizeRosterNames';

export type UpdateStudentRosterInput = {
  names: string[];
};

export { normalizeRosterNames };

/** @deprecated Préférer UpdateClassUseCase — conservé pour compat. */
export class UpdateStudentRosterUseCase {
  constructor(private readonly rosterRepository: StudentRosterRepository) {}

  async execute(input: UpdateStudentRosterInput): Promise<StudentRoster> {
    if (!Array.isArray(input.names)) {
      throw new Error('names required');
    }
    const roster: StudentRoster = {
      names: normalizeRosterNames(input.names),
    };
    await this.rosterRepository.save(roster);
    return roster;
  }
}
