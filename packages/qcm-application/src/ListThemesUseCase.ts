import type { Theme } from '@kahin/qcm-domain';
import type { ThemeRepository } from '@kahin/qcm-domain';

export class ListThemesUseCase {
  constructor(private readonly themeRepository: ThemeRepository) {}

  async execute(): Promise<Theme[]> {
    return this.themeRepository.list();
  }
}
