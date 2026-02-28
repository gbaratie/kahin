/**
 * Configuration centrale du site (titre, navigation). Modifier ces valeurs pour adapter le site à votre projet.
 */

export const siteName =
  process.env.NEXT_PUBLIC_SITE_NAME ?? 'Guillaume Baratier';

export interface NavItem {
  label: string;
  href: string;
}

export const navItems: NavItem[] = [
  { label: 'Accueil', href: '/' },
  { label: 'Projets', href: '/projets' },
  { label: 'Mes coups de cœur', href: '/coups-de-coeur' },
];
