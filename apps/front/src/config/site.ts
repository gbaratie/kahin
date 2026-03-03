export const siteName = process.env.NEXT_PUBLIC_SITE_NAME ?? 'Kahin QCM';

/** Base path pour GitHub Pages (ex. /kahin). */
export const basePath =
  (process.env.NEXT_PUBLIC_BASE_PATH ?? '').replace(/\/$/, '') || '';

export function withBasePath(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return basePath ? `${basePath}${p}` : p;
}

export interface NavItem {
  label: string;
  href: string;
}

export const navItems: NavItem[] = [
  { label: 'Accueil', href: '/' },
  { label: 'Créer un QCM', href: '/qcm/create' },
  { label: 'Rejoindre', href: '/join' },
];
