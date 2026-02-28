import type { LinkItem } from '@/src/data/types';
import { basePath } from '@/src/config/basePath';
/**
 * Liens « Projet de mes amis » — projets et partenaires (page Mes coups de cœur).
 *
 * Pour ajouter une photo à une carte :
 * 1. Déposez l’image dans le dossier public/images/projets/ (ex. public/images/projets/colco.jpg).
 * 2. Ajoutez la propriété image à l’objet avec src et alt :
 *    image: { src: `${basePath}/images/projets/colco.jpg`, alt: 'Description courte pour l’accessibilité' }
 * En production (ex. GitHub Pages), basePath est automatiquement préfixé (/gb, etc.).
 */
export const amisItems: LinkItem[] = [
  {
    id: 'colco',
    title: 'Colco',
    description:
      'Un café de spécialité enrichi en collagène, à la croisée du goût et du bien-être.',
    tags: ['café', 'collagène'],
    url: 'https://colco.fr/',
    buyUrl:
      'https://shop.app/checkout/90922090827/cn/hWN8qnMWVoZLLWuwSIJPOnkh/fr-fr/shoppay_login?_cs=3AMP.S&_r=AQAB726JjPRV7NQF4DN28qQTHvkSff2Hsbl0q2BJ-J7xroY&redirect_source=direct_checkout_product&tracking_unique=e5e2d257-27d8-4ba7-bbf3-5b6ae8ebea8e&tracking_visit=ac1d40ad-a392-4df6-aacd-e61b4e8d77c4',
    image: { src: `${basePath}/images/projets/colco.jpg`, alt: 'Colco' },
  },
  {
    id: 'chalong-bay',
    title: 'Chalong Bay',
    description:
      'Un rhum artisanal distillé en Thaïlande par des français et reconnu pour sa qualité à l’international.',
    tags: ['spiritueux', 'rhum', 'Thaïlande'],
    url: 'https://chalongbayrum.com/en/home',
    buyUrl: 'https://chalongbay.fr/',
    image: {
      src: `${basePath}/images/projets/chalong-bay.png`,
      alt: 'Chalong Bay',
    },
  },
  {
    id: 'saneha',
    title: 'Saneha',
    description:
      'Saneha, un Gin premium d’inspiration thaïlandaise, au design graphique affirmé.',
    tags: ['spiritueux', 'gin', 'Thaïlande'],
    url: 'https://saneha-global.com/',
    buyUrl: 'https://chalongbay.fr/collections/saneha-gin',
    image: { src: `${basePath}/images/projets/saneha.png`, alt: 'Saneha' },
  },
];
