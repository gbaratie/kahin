import type { LinkItem } from '@/src/data/types';

export type { LinkItem } from '@/src/data/types';

/**
 * Sélection de sites et initiatives (liens externes).
 * Modifier ce fichier pour mettre à jour la page Mes coups de cœur (/coups-de-coeur).
 */
export const selectionItems: LinkItem[] = [
  {
    id: 'enerfip',
    title: 'Enerfip',
    description:
      'Plateforme de financement participatif dédiée aux projets d’énergie renouvelable.',
    tags: ['Finance participative', 'Energie'],
    url: 'https://www.enerfip.eu/fr',
  },
  {
    id: 'coral-gardeners',
    title: 'Coral Gardeners',
    description:
      'Association de restauration des récifs coralliens et sensibilisation à l’océan.',
    tags: ['Océan', 'Biodiversité'],
    url: 'https://coralgardeners.org/fr',
  },
  {
    id: 'meet-my-mama',
    title: 'Meet My Mama',
    description:
      'Entreprise sociale qui valorise les cuisines du monde et l’insertion professionnelle.',
    tags: ['Insertion', 'Food'],
    url: 'https://meetmymama.com/',
  },
  {
    id: 'share-the-meal',
    title: 'ShareTheMeal',
    description:
      'Application du PAM pour lutter contre la faim dans le monde via des dons de repas.',
    tags: ['Solidarité', 'PAM'],
    url: 'https://sharethemeal.org/fr',
  },
];
