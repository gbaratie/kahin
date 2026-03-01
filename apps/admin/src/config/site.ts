export const siteName = process.env.NEXT_PUBLIC_SITE_NAME ?? 'QCM Admin';
export interface NavItem {
  label: string;
  href: string;
}
export const navItems: NavItem[] = [{ label: 'Accueil', href: '/' }];
