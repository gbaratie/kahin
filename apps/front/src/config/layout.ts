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
};
