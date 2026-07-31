export const siteName = process.env.NEXT_PUBLIC_SITE_NAME ?? 'QCM';

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

export const navItemsParticipant: NavItem[] = [
  { label: 'Accueil', href: '/' },
  { label: 'Rejoindre', href: '/join' },
];

export const navItemCreateQuiz: NavItem = {
  label: 'Créer un QCM',
  href: '/qcm/create',
};

export const navItemQuestions: NavItem = {
  label: 'Questions',
  href: '/qcm/questions',
};

export const navItemRoster: NavItem = {
  label: 'Classes',
  href: '/qcm/classes',
};

/** Navigation complète (animateur connecté ou mode bypass sans API). */
export const navItems: NavItem[] = [
  navItemsParticipant[0],
  navItemQuestions,
  navItemCreateQuiz,
  navItemRoster,
  navItemsParticipant[1],
];
