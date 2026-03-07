/**
 * Injection des dépendances : use cases + repositories.
 * Quiz : persistance JSON (fichier) en dev, Postgres en production.
 * Sessions : in-memory.
 */
import path from 'path';
import { fileURLToPath } from 'url';
import {
  JsonFileQuizRepository,
  PostgresQuizRepository,
} from '@kahin/qcm-infrastructure/node';
import {
  InMemorySessionRepository,
  MockRealtimeTransport,
} from '@kahin/qcm-infrastructure';
import {
  CreateQuizUseCase,
  UpdateQuizUseCase,
  LaunchSessionUseCase,
  JoinSessionUseCase,
  GetSessionUseCase,
  SubmitAnswerUseCase,
  NextQuestionUseCase,
  AdvanceIfTimeUpUseCase,
} from '@kahin/qcm-application';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultQuizJsonPath = path.join(__dirname, '..', 'data', 'quizzes.json');
const quizJsonPath = process.env.QUIZ_JSON_PATH ?? defaultQuizJsonPath;

export const QUIZ_JSON_STORAGE_PATH = quizJsonPath;

function createQuizRepository() {
  const nodeEnv = process.env.NODE_ENV;
  const databaseUrl = process.env.DATABASE_URL;

  if (nodeEnv === 'production' && databaseUrl) {
    return new PostgresQuizRepository();
  }

  return new JsonFileQuizRepository(quizJsonPath);
}

const quizRepo = createQuizRepository();
const sessionRepo = new InMemorySessionRepository();
const realtimeTransport = new MockRealtimeTransport();

export const createQuizUseCase = new CreateQuizUseCase(quizRepo);
export const updateQuizUseCase = new UpdateQuizUseCase(quizRepo);
export const getQuizById = (id: string) => quizRepo.getById(id);
export const listQuizzes = () => quizRepo.list();
export const deleteQuiz = (id: string) => quizRepo.delete(id);
export const launchSessionUseCase = new LaunchSessionUseCase(
  quizRepo,
  sessionRepo,
  realtimeTransport
);
export const joinSessionUseCase = new JoinSessionUseCase(
  sessionRepo,
  realtimeTransport
);
export const getSessionUseCase = new GetSessionUseCase(sessionRepo);
export const submitAnswerUseCase = new SubmitAnswerUseCase(
  sessionRepo,
  quizRepo,
  realtimeTransport
);
export const nextQuestionUseCase = new NextQuestionUseCase(
  quizRepo,
  sessionRepo,
  realtimeTransport
);
export const advanceIfTimeUpUseCase = new AdvanceIfTimeUpUseCase(
  quizRepo,
  sessionRepo,
  realtimeTransport
);
