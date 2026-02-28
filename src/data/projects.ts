import type { Project } from '@/src/data/types';
import { basePath } from '@/src/config/basePath';

export type { Project } from '@/src/data/types';

export const projects: Project[] = [
  {
    id: 'agent-conversationnel-bank-assurance',
    title: 'Agents conversationnels Banque & Assurance',
    description:
      "Conception et déploiement d'agents conversationnels pour Orange Bank et COVEA.",
    category: 'pro',
    clients: ['Orange Bank', 'COVEA'],
    tags: ['Machine Learning'],
    links: [],
  },
  {
    id: 'email-analyser-bpce',
    title: 'Email Analyser',
    description:
      "Solution d'analyse et de traitement des emails pour le groupe BPCE.",
    category: 'pro',
    clients: ['BPCE'],
    tags: ['Machine Learning'],
    links: [],
  },
  {
    id: 'voice-bot-covea',
    title: 'Voice Bot',
    description: "Mise en place d'assistants vocaux pour COVEA.",
    category: 'pro',
    clients: ['COVEA'],
    tags: ['Machine Learning'],
    links: [],
  },
  {
    id: 'tracabilite-alimentaire',
    title: 'Traçabilité alimentaire',
    description:
      "Blockchain pour la traçabilité de la chaîne d'approvisionnement alimentaire et textile chez Carrefour.",
    category: 'pro',
    clients: ['Carrefour'],
    tags: ['Blockchain'],
    links: [],
  },
  {
    id: 'tracabilite-energie',
    title: "Traçabilité de l'énergie",
    description:
      'Développement de solutions blockchain pour assurer la traçabilité et la transparence des mécanismes de marché dans le secteur énergétique.',
    category: 'pro',
    clients: ['RTE', 'Enedis'],
    tags: ['Blockchain'],
    links: [],
  },
  {
    id: 'registre-commercial-blockchain',
    title: 'Registre commercial sur blockchain',
    description:
      'Implémentation d’une architecture blockchain assurant l’hébergement et l’intégrité de registres commerciaux administrés par le CNGTC.',
    category: 'pro',
    clients: ['CNGTC'],
    tags: ['Blockchain'],
    links: [],
  },
  {
    id: 'quantum-safe-bancaire',
    title: 'Quantum Safe pour le monde bancaire',
    description:
      'Étude et préparation à la cryptographie post-quantum dans le secteur bancaire.',
    category: 'pro',
    tags: ['Quantum'],
    links: [],
  },
  {
    id: 'genai-rag-loreal',
    title: 'GenAI Services & plateforme RAG',
    description:
      "Mise en place de Services GenAI et d'une plateforme RAG pour L'Oréal.",
    category: 'pro',
    clients: ["L'Oréal"],
    tags: ['GenAI'],
    links: [],
  },
  {
    id: 'extraction-doc-credit-mutuel',
    title: 'Extraction documentaire pour la GenAI',
    description:
      "Pipeline d'extraction et structuration de documents pour alimenter des use cases GenAI.",
    category: 'pro',
    clients: ['Crédit Mutuel'],
    tags: ['GenAI'],
    links: [],
  },
  {
    id: 'conversational-ai-cardif',
    title: 'Conversational AI Platform',
    description:
      "Plateforme d'assistants conversationnels et services GenAI pour CARDIF.",
    category: 'pro',
    clients: ['CARDIF'],
    tags: ['GenAI'],
    links: [],
  },
  {
    id: 'sudoku',
    title: 'Générateur de Sudoku',
    description:
      "Application web pour générer et jouer au Sudoku. Projet side pour pratiquer la logique et l'interface utilisateur.",
    category: 'side',
    tags: ['JavaScript'],
    links: [
      { label: 'Voir le projet', url: 'https://gbaratie.github.io/Sudoku/' },
    ],
    image: { src: `${basePath}/images/projets/sudoku.png`, alt: 'Sudoku' },
  },
  {
    id: 'template-next-mui',
    title: 'Template Next.js + MUI',
    description:
      'Template pour créer rapidement des sites vitrines en React, Next.js et Material UI. Base du présent portfolio.',
    category: 'side',
    tags: ['Next.js', 'React', 'MUI'],
    links: [
      {
        label: 'Voir le template',
        url: 'https://gbaratie.github.io/front_sandbox_MUI/',
      },
    ],
    image: {
      src: `${basePath}/images/projets/portfolio.png`,
      alt: 'Portfolio',
    },
  },
  {
    id: 'PSL-Dauphine',
    title: 'Professeur à Dauphine',
    description:
      'Animation d’un enseignement orienté sur les technologies de la 4ème révolution industrielle (IA, IoT, Blockchain, Big Data, Cloud) un semestre par an pour une classe de Master 2',
    category: 'side',
    tags: ['Enseignement', 'New technologies'],
    image: { src: `${basePath}/images/projets/dauphine.jpg`, alt: 'Dauphine' },
  },
  {
    id: 'isep',
    title: 'Administrateur ISEP',
    description: "Membre du conseil d'administration de l'ISEP.",
    category: 'side',
    tags: ['Enseignement', 'CA'],
    image: {
      src: `${basePath}/images/projets/isep.png`,
      alt: 'Isep',
      background: 'white',
    },
  },
  {
    id: 'tdm',
    title: 'Tour du Monde',
    description: 'Voyage autour du monde en 2022-2023',
    category: 'side',
    tags: ['Voyage'],
    links: [
      {
        label: 'Voir le voyage',
        url: 'https://www.polarsteps.com/GuillaumeBaratier/5510476-world-trip-2022',
      },
    ],
    image: { src: `${basePath}/images/projets/tdm.png`, alt: 'TDM' },
  },
];
