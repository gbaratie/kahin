import type { StudentRoster, StudentRosterRepository } from '@kahin/qcm-domain';

export type UpdateStudentRosterInput = {
  names: string[];
};

/**
 * Normalise une liste de noms : trim, ignore vides, déduplique (casse insensible),
 * conserve l’ordre de première apparition.
 */
export function normalizeRosterNames(raw: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const entry of raw) {
    const name = String(entry ?? '').trim();
    if (!name) continue;
    const key = name.toLocaleLowerCase('fr');
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(name);
  }
  return result;
}

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
