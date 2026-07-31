import type { Theme } from '../entities/Theme';

export interface ThemeRepository {
  list(): Promise<Theme[]>;
  getById(id: string): Promise<Theme | null>;
  save(theme: Theme): Promise<void>;
  delete(id: string): Promise<void>;
}
