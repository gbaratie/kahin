import type { SchoolClass, ClassRepository } from '@kahin/qcm-domain';

export class InMemoryClassRepository implements ClassRepository {
  private classes = new Map<string, SchoolClass>();

  async list(): Promise<SchoolClass[]> {
    return Array.from(this.classes.values()).map((c) => ({
      ...c,
      names: [...c.names],
    }));
  }

  async getById(id: string): Promise<SchoolClass | null> {
    const c = this.classes.get(id);
    return c ? { ...c, names: [...c.names] } : null;
  }

  async save(schoolClass: SchoolClass): Promise<void> {
    this.classes.set(schoolClass.id, {
      ...schoolClass,
      names: [...schoolClass.names],
    });
  }

  async delete(id: string): Promise<void> {
    this.classes.delete(id);
  }
}
