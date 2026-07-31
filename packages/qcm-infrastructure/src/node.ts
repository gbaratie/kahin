/**
 * Points d'entrée spécifiques à l'environnement Node (utilisent fs, Postgres, etc.).
 * À utiliser côté API uniquement, pas dans les apps Next.js (navigateur).
 */
export {
  JsonFileQuizRepository,
  JsonFileQuestionRepository,
  JsonFileThemeRepository,
  JsonFileBankStore,
  migrateLegacyQuizzes,
} from './JsonFileQuizRepository';
export {
  PostgresQuizRepository,
  PostgresQuestionRepository,
  PostgresThemeRepository,
  getPostgresPool,
} from './PostgresQuizRepository';
export { JsonFileStudentRosterRepository } from './JsonFileStudentRosterRepository';
export { PostgresStudentRosterRepository } from './PostgresStudentRosterRepository';
