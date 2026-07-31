import type { Theme } from '@kahin/qcm-domain';
import type { ThemeRepository } from '@kahin/qcm-domain';

export type UpdateThemeInput = {
  name: string;
  sortOrder?: number;
};

export class UpdateThemeUseCase {
  constructor(private readonly themeRepository: ThemeRepository) {}

  async execute(themeId: string, input: UpdateThemeInput): Promise<Theme> {
    const existing = await this.themeRepository.getById(themeId);
    if (!existing) {
      const err = new Error('Theme not found');
      (err as Error & { code?: string }).code = 'THEME_NOT_FOUND';
      throw err;
    }
    const name = input.name.trim();
    if (!name) {
      const err = new Error('Theme name required');
      (err as Error & { code?: string }).code = 'THEME_NAME_REQUIRED';
      throw err;
    }
    const theme: Theme = {
      id: themeId,
      name,
      sortOrder:
        typeof input.sortOrder === 'number' ? input.sortOrder : existing.sortOrder,
    };
    await this.themeRepository.save(theme);
    return theme;
  }
}
