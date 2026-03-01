import type { Quiz } from '@kahin/qcm-domain';
import type { QuizRepository } from '@kahin/qcm-domain';
import fs from 'fs/promises';
import path from 'path';

const defaultEncoding = 'utf-8' as const;

/**
 * Persiste les quiz dans un fichier JSON.
 * Le fichier contient un objet { quizzes: Record<id, Quiz> }.
 */
export class JsonFileQuizRepository implements QuizRepository {
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  private async ensureDir(): Promise<void> {
    const dir = path.dirname(this.filePath);
    await fs.mkdir(dir, { recursive: true });
  }

  private async readAll(): Promise<Record<string, Quiz>> {
    try {
      const raw = await fs.readFile(this.filePath, defaultEncoding);
      const data = JSON.parse(raw) as { quizzes?: Record<string, Quiz> };
      return data.quizzes ?? {};
    } catch (err) {
      const code =
        err && typeof (err as NodeJS.ErrnoException).code === 'string'
          ? (err as NodeJS.ErrnoException).code
          : '';
      if (code === 'ENOENT') return {};
      throw err;
    }
  }

  private async writeAll(quizzes: Record<string, Quiz>): Promise<void> {
    await this.ensureDir();
    await fs.writeFile(
      this.filePath,
      JSON.stringify({ quizzes }, null, 2),
      defaultEncoding
    );
  }

  async save(quiz: Quiz): Promise<void> {
    const quizzes = await this.readAll();
    quizzes[quiz.id] = { ...quiz };
    await this.writeAll(quizzes);
  }

  async getById(id: string): Promise<Quiz | null> {
    const quizzes = await this.readAll();
    const quiz = quizzes[id];
    return quiz ? { ...quiz } : null;
  }

  async list(): Promise<{ id: string; title: string }[]> {
    const quizzes = await this.readAll();
    return Object.values(quizzes).map((q) => ({ id: q.id, title: q.title }));
  }
}
