/**
 * Points d'entrée spécifiques à l'environnement Node (utilisent fs, Postgres, etc.).
 * À utiliser côté API uniquement, pas dans les apps Next.js (navigateur).
 */
export { JsonFileQuizRepository } from './JsonFileQuizRepository';
export { PostgresQuizRepository } from './PostgresQuizRepository';
