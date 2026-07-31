import type { Theme } from '@kahin/qcm-domain';
import type { ThemeRepository } from '@kahin/qcm-domain';

export type CreateThemeInput = {
  name: string;
};

export class CreateThemeUseCase {
  constructor(private readonly themeRepository: ThemeRepository) {}

  async execute(input: CreateThemeInput): Promise<Theme> {
    const name = input.name.trim();
    if (!name) {
      const err = new Error('Theme name required');
      (err as Error & { code?: string }).code = 'THEME_NAME_REQUIRED';
      throw err;
    }
    const existing = await this.themeRepository.list();
    const maxOrder = existing.reduce(
      (max, t) => Math.max(max, t.sortOrder),
      -1
    );
    const theme: Theme = {
      id: crypto.randomUUID(),
      name,
      sortOrder: maxOrder + 1,
    };
    await this.themeRepository.save(theme);
    return theme;
  }
}
