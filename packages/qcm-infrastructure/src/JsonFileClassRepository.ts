import type { SchoolClass, ClassRepository } from '@kahin/qcm-domain';
import fs from 'fs/promises';
import path from 'path';

const defaultEncoding = 'utf-8' as const;

type ClassesFile = {
  classes?: Record<string, SchoolClass>;
  /** Ancien format singleton (migration). */
  names?: string[];
};

/**
 * Persiste les classes dans un fichier JSON.
 * Format : { "classes": { "<id>": { id, name, names } } }
 * Migre automatiquement l’ancien fichier roster `{ names: [...] }` vers une classe « Classe ».
 */
export class JsonFileClassRepository implements ClassRepository {
  private readonly filePath: string;
  private readonly legacyRosterPath?: string;

  constructor(filePath: string, legacyRosterPath?: string) {
    this.filePath = filePath;
    this.legacyRosterPath = legacyRosterPath;
  }

  private async ensureDir(): Promise<void> {
    const dir = path.dirname(this.filePath);
    await fs.mkdir(dir, { recursive: true });
  }

  private async readAll(): Promise<Record<string, SchoolClass>> {
    try {
      const raw = await fs.readFile(this.filePath, defaultEncoding);
      const data = JSON.parse(raw) as ClassesFile;
      if (data.classes && typeof data.classes === 'object') {
        return data.classes;
      }
      // Ancien fichier classes.json au format roster
      if (Array.isArray(data.names) && data.names.length > 0) {
        return this.migrateLegacyNames(data.names);
      }
      return {};
    } catch (err) {
      const code =
        err && typeof (err as NodeJS.ErrnoException).code === 'string'
          ? (err as NodeJS.ErrnoException).code
          : '';
      if (code !== 'ENOENT') throw err;
    }

    if (this.legacyRosterPath) {
      try {
        const raw = await fs.readFile(this.legacyRosterPath, defaultEncoding);
        const data = JSON.parse(raw) as { names?: unknown };
        if (Array.isArray(data.names) && data.names.length > 0) {
          const names = data.names
            .filter((n): n is string => typeof n === 'string')
            .map((n) => n.trim())
            .filter(Boolean);
          if (names.length > 0) {
            const migrated = this.migrateLegacyNames(names);
            await this.writeAll(migrated);
            return migrated;
          }
        }
      } catch {
        // pas de legacy
      }
    }
    return {};
  }

  private migrateLegacyNames(names: string[]): Record<string, SchoolClass> {
    const id = crypto.randomUUID();
    return {
      [id]: {
        id,
        name: 'Classe',
        names: [...names],
      },
    };
  }

  private async writeAll(classes: Record<string, SchoolClass>): Promise<void> {
    await this.ensureDir();
    await fs.writeFile(
      this.filePath,
      JSON.stringify({ classes }, null, 2),
      defaultEncoding
    );
  }

  async list(): Promise<SchoolClass[]> {
    const all = await this.readAll();
    return Object.values(all).map((c) => ({ ...c, names: [...c.names] }));
  }

  async getById(id: string): Promise<SchoolClass | null> {
    const all = await this.readAll();
    const c = all[id];
    return c ? { ...c, names: [...c.names] } : null;
  }

  async save(schoolClass: SchoolClass): Promise<void> {
    const all = await this.readAll();
    all[schoolClass.id] = {
      ...schoolClass,
      names: [...schoolClass.names],
    };
    await this.writeAll(all);
  }

  async delete(id: string): Promise<void> {
    const all = await this.readAll();
    if (!(id in all)) return;
    delete all[id];
    await this.writeAll(all);
  }
}
