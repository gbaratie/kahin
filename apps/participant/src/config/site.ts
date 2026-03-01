export const siteName = process.env.NEXT_PUBLIC_SITE_NAME ?? 'QCM Participant';

/** Base path pour GitHub Pages (ex. /kahin/participant). Utilisé pour construire des URLs absolues si besoin. */
export const basePath =
  (process.env.NEXT_PUBLIC_BASE_PATH ?? '').replace(/\/$/, '') || '';

/** Préfixe un chemin avec le basePath (pour liens manuels, partage d'URL, etc.). */
export function withBasePath(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return basePath ? `${basePath}${p}` : p;
}

export interface NavItem {
  label: string;
  href: string;
}
export const navItems: NavItem[] = [{ label: 'Rejoindre', href: '/' }];
