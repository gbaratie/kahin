export const siteName = process.env.NEXT_PUBLIC_SITE_NAME ?? 'QCM Participant';
export interface NavItem {
  label: string;
  href: string;
}
export const navItems: NavItem[] = [{ label: 'Rejoindre', href: '/' }];
