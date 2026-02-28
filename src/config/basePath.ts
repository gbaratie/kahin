/**
 * Chemin de base des assets (images, etc.) en production.
 * Surcharge possible via NEXT_PUBLIC_BASE_PATH ; valeur par défaut alignée sur next.config.js (ex. GitHub Pages).
 */
const defaultProductionPath =
  process.env.NODE_ENV === 'production' ? '/gb' : '';

export const basePath =
  (typeof process.env.NEXT_PUBLIC_BASE_PATH === 'string' &&
    process.env.NEXT_PUBLIC_BASE_PATH) ||
  defaultProductionPath;
