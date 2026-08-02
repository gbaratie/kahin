/**
 * Constantes de mise en page partagées (maxWidth, padding, spacing).
 * Desktop : largeur utile large pour éviter les « couloirs » vides.
 */
export const layout = {
  contentMaxWidth: 480,
  /** Largeur max du contenu admin / pages classiques. */
  pageMaxWidth: { xs: '100%', md: 1100, lg: 1360 },
  pagePadding: { py: 4, px: 2 },
  pagePaddingAuto: {
    py: 4,
    px: { xs: 2, md: 3, lg: 4 },
    maxWidth: { xs: '100%', md: 1100, lg: 1360 },
    mx: 'auto' as const,
    width: '100%',
    boxSizing: 'border-box' as const,
  },
  /**
   * Conteneur session (rejoindre / participant / hôte) : tient dans le viewport
   * sans scroll dans le cas nominal (header Layout ~64–72px).
   */
  sessionViewport: {
    px: { xs: 2, md: 3, lg: 4 },
    py: { xs: 1.5, sm: 2 },
    maxWidth: { xs: 480, md: 1100, lg: 1280 },
    mx: 'auto' as const,
    width: '100%',
    minHeight: {
      xs: 'calc(100dvh - 64px)',
      md: 'calc(100dvh - 72px)',
    },
    display: 'flex',
    flexDirection: 'column' as const,
    boxSizing: 'border-box' as const,
  },
};
