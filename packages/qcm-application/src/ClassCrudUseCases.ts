import type { ClassRepository, SchoolClass } from '@kahin/qcm-domain';
import { normalizeRosterNames } from './normalizeRosterNames';

export type CreateClassInput = {
  name: string;
  names?: string[];
};

export class CreateClassUseCase {
  constructor(private readonly classRepository: ClassRepository) {}

  async execute(input: CreateClassInput): Promise<SchoolClass> {
    const name = String(input.name ?? '').trim();
    if (!name) {
      throw new Error('class name required');
    }
    const schoolClass: SchoolClass = {
      id: crypto.randomUUID(),
      name,
      names: normalizeRosterNames(input.names ?? []),
    };
    await this.classRepository.save(schoolClass);
    return schoolClass;
  }
}

export type UpdateClassInput = {
  name: string;
  names: string[];
};

export class UpdateClassUseCase {
  constructor(private readonly classRepository: ClassRepository) {}

  async execute(
    classId: string,
    input: UpdateClassInput
  ): Promise<SchoolClass> {
    const existing = await this.classRepository.getById(classId);
    if (!existing) {
      throw new Error('Class not found');
    }
    const name = String(input.name ?? '').trim();
    if (!name) {
      throw new Error('class name required');
    }
    if (!Array.isArray(input.names)) {
      throw new Error('names required');
    }
    const schoolClass: SchoolClass = {
      id: classId,
      name,
      names: normalizeRosterNames(input.names),
    };
    await this.classRepository.save(schoolClass);
    return schoolClass;
  }
}

export class DeleteClassUseCase {
  constructor(private readonly classRepository: ClassRepository) {}

  async execute(classId: string): Promise<void> {
    const existing = await this.classRepository.getById(classId);
    if (!existing) {
      throw new Error('Class not found');
    }
    await this.classRepository.delete(classId);
  }
}
