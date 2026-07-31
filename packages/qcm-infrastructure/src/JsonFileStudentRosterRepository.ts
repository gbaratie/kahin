import type { StudentRoster, StudentRosterRepository } from '@kahin/qcm-domain';
import fs from 'fs/promises';
import path from 'path';

const defaultEncoding = 'utf-8' as const;

/**
 * Persiste la liste des élèves dans un fichier JSON.
 * Format : { "names": ["Alice", "Bob"] }
 */
export class JsonFileStudentRosterRepository implements StudentRosterRepository {
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  private async ensureDir(): Promise<void> {
    const dir = path.dirname(this.filePath);
    await fs.mkdir(dir, { recursive: true });
  }

  async get(): Promise<StudentRoster> {
    try {
      const raw = await fs.readFile(this.filePath, defaultEncoding);
      const data = JSON.parse(raw) as { names?: unknown };
      const names = Array.isArray(data.names)
        ? data.names
            .filter((n): n is string => typeof n === 'string')
            .map((n) => n.trim())
            .filter(Boolean)
        : [];
      return { names };
    } catch (err) {
      const code =
        err && typeof (err as NodeJS.ErrnoException).code === 'string'
          ? (err as NodeJS.ErrnoException).code
          : '';
      if (code === 'ENOENT') return { names: [] };
      throw err;
    }
  }

  async save(roster: StudentRoster): Promise<void> {
    await this.ensureDir();
    await fs.writeFile(
      this.filePath,
      JSON.stringify({ names: roster.names }, null, 2),
      defaultEncoding
    );
  }
}
