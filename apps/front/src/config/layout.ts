/**
 * Constantes de mise en page partagées (maxWidth, padding, spacing).
 */
export const layout = {
  contentMaxWidth: 480,
  pagePadding: { py: 4, px: 2 },
  pagePaddingAuto: {
    py: 4,
    px: { xs: 2, md: 3 },
    maxWidth: { xs: 480, md: 960, lg: 1200 },
    mx: 'auto' as const,
  },
  /**
   * Conteneur session (rejoindre / participant / hôte) : tient dans le viewport
   * sans scroll dans le cas nominal (header Layout ~64–72px).
   */
  sessionViewport: {
    px: 2,
    py: { xs: 1.5, sm: 2 },
    maxWidth: { xs: 480, md: 960 },
    mx: 'auto' as const,
    width: '100%',
    minHeight: {
      xs: 'calc(100dvh - 72px)',
      md: 'calc(100dvh - 80px)',
    },
    display: 'flex',
    flexDirection: 'column' as const,
    boxSizing: 'border-box' as const,
  },
};
