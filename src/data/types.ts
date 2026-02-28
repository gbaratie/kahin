/**
 * Types partagés pour les projets, liens, profil et logos du site.
 */

export type ClientLogo = {
  src: string;
  alt: string;
};

export type Profile = {
  name: string;
  headline: string;
  bio: string;
};

export type ProjectCategory = 'pro' | 'side';

export type ProjectLink = {
  label: string;
  url: string;
};

export type ImageRef = {
  src: string;
  alt: string;
  /** Couleur de fond optionnelle (ex: 'white' pour logos sur fond transparent) */
  background?: string;
};

export type Project = {
  id: string;
  title: string;
  description: string;
  category: ProjectCategory;
  /** Noms des clients (affichés avec un style distinct) */
  clients?: string[];
  /** Technologies et compétences */
  tags: string[];
  links?: ProjectLink[];
  image?: ImageRef;
};

export type LinkItem = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  url: string;
  /** URL optionnelle pour un bouton « Acheter » (ex. page boutique). */
  buyUrl?: string;
  image?: ImageRef;
};
