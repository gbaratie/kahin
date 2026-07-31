import type { SchoolClass } from '../entities/SchoolClass';

export interface ClassRepository {
  list(): Promise<SchoolClass[]>;
  getById(id: string): Promise<SchoolClass | null>;
  save(schoolClass: SchoolClass): Promise<void>;
  delete(id: string): Promise<void>;
}
