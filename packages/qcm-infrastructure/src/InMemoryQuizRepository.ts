import type { Quiz } from '@kahin/qcm-domain';
import type { QuizRepository } from '@kahin/qcm-domain';

export class InMemoryQuizRepository implements QuizRepository {
  private readonly store = new Map<string, Quiz>();

  async save(quiz: Quiz): Promise<void> {
    this.store.set(quiz.id, { ...quiz });
  }

  async getById(id: string): Promise<Quiz | null> {
    const quiz = this.store.get(id);
    return quiz ? { ...quiz } : null;
  }

  async list(): Promise<{ id: string; title: string }[]> {
    return Array.from(this.store.values()).map((q) => ({
      id: q.id,
      title: q.title,
    }));
  }
}
