/**
 * Injection des dépendances : use cases + repositories.
 * Quiz / roster : persistance JSON (fichier) en dev, Postgres en production.
 * Sessions : in-memory.
 */
import path from 'path';
import { fileURLToPath } from 'url';
import {
  JsonFileQuizRepository,
  PostgresQuizRepository,
  JsonFileStudentRosterRepository,
  PostgresStudentRosterRepository,
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
  GetQuizUseCase,
  ListQuizzesUseCase,
  DeleteQuizUseCase,
  GetStudentRosterUseCase,
  UpdateStudentRosterUseCase,
} from '@kahin/qcm-application';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultQuizJsonPath = path.join(__dirname, '..', 'data', 'quizzes.json');
const quizJsonPath = process.env.QUIZ_JSON_PATH ?? defaultQuizJsonPath;
const defaultRosterJsonPath = path.join(__dirname, '..', 'data', 'roster.json');
const rosterJsonPath = process.env.ROSTER_JSON_PATH ?? defaultRosterJsonPath;

export const QUIZ_JSON_STORAGE_PATH = quizJsonPath;
export const ROSTER_JSON_STORAGE_PATH = rosterJsonPath;

function isPostgresStorage(): boolean {
  return (
    process.env.NODE_ENV === 'production' && Boolean(process.env.DATABASE_URL)
  );
}

function createQuizRepository() {
  if (isPostgresStorage()) {
    return new PostgresQuizRepository();
  }
  return new JsonFileQuizRepository(quizJsonPath);
}

function createRosterRepository() {
  if (isPostgresStorage()) {
    return new PostgresStudentRosterRepository();
  }
  return new JsonFileStudentRosterRepository(rosterJsonPath);
}

const quizRepo = createQuizRepository();
const rosterRepo = createRosterRepository();
const sessionRepo = new InMemorySessionRepository();
const realtimeTransport = new MockRealtimeTransport();

export const createQuizUseCase = new CreateQuizUseCase(quizRepo);
export const updateQuizUseCase = new UpdateQuizUseCase(quizRepo);
export const getQuizUseCase = new GetQuizUseCase(quizRepo);
export const listQuizzesUseCase = new ListQuizzesUseCase(quizRepo);
export const deleteQuizUseCase = new DeleteQuizUseCase(quizRepo);
export const getStudentRosterUseCase = new GetStudentRosterUseCase(rosterRepo);
export const updateStudentRosterUseCase = new UpdateStudentRosterUseCase(
  rosterRepo
);
export const launchSessionUseCase = new LaunchSessionUseCase(
  quizRepo,
  sessionRepo,
  realtimeTransport
);
export const joinSessionUseCase = new JoinSessionUseCase(
  sessionRepo,
  realtimeTransport,
  rosterRepo
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
