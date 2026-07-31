import type { ThemeRepository } from '@kahin/qcm-domain';

export class DeleteThemeUseCase {
  constructor(private readonly themeRepository: ThemeRepository) {}

  async execute(themeId: string): Promise<void> {
    const existing = await this.themeRepository.getById(themeId);
    if (!existing) {
      const err = new Error('Theme not found');
      (err as Error & { code?: string }).code = 'THEME_NOT_FOUND';
      throw err;
    }
    await this.themeRepository.delete(themeId);
  }
}
