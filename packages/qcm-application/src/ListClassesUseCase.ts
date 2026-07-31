import type {
  ClassRepository,
  SchoolClass,
  SchoolClassSummary,
} from '@kahin/qcm-domain';

export class ListClassesUseCase {
  constructor(private readonly classRepository: ClassRepository) {}

  async execute(): Promise<SchoolClassSummary[]> {
    const classes = await this.classRepository.list();
    return classes.map((c) => ({
      id: c.id,
      name: c.name,
      studentCount: c.names.length,
    }));
  }
}

export class GetClassUseCase {
  constructor(private readonly classRepository: ClassRepository) {}

  async execute(classId: string): Promise<SchoolClass> {
    const schoolClass = await this.classRepository.getById(classId);
    if (!schoolClass) {
      throw new Error('Class not found');
    }
    return schoolClass;
  }
}
