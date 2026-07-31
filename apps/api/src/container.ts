/**
 * Injection des dépendances : use cases + repositories.
 * Quiz / classes : persistance JSON (fichier) en dev, Postgres en production.
 * Sessions : in-memory.
 */
import path from 'path';
import { fileURLToPath } from 'url';
import {
  JsonFileQuizRepository,
  PostgresQuizRepository,
  JsonFileClassRepository,
  PostgresClassRepository,
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
  ListClassesUseCase,
  GetClassUseCase,
  CreateClassUseCase,
  UpdateClassUseCase,
  DeleteClassUseCase,
  GetSessionJoinInfoUseCase,
} from '@kahin/qcm-application';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultQuizJsonPath = path.join(__dirname, '..', 'data', 'quizzes.json');
const quizJsonPath = process.env.QUIZ_JSON_PATH ?? defaultQuizJsonPath;
const defaultClassesJsonPath = path.join(
  __dirname,
  '..',
  'data',
  'classes.json'
);
const classesJsonPath = process.env.CLASSES_JSON_PATH ?? defaultClassesJsonPath;
const defaultRosterJsonPath = path.join(__dirname, '..', 'data', 'roster.json');
const rosterJsonPath = process.env.ROSTER_JSON_PATH ?? defaultRosterJsonPath;

export const QUIZ_JSON_STORAGE_PATH = quizJsonPath;
export const CLASSES_JSON_STORAGE_PATH = classesJsonPath;

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

function createClassRepository() {
  if (isPostgresStorage()) {
    return new PostgresClassRepository();
  }
  return new JsonFileClassRepository(classesJsonPath, rosterJsonPath);
}

const quizRepo = createQuizRepository();
const classRepo = createClassRepository();
const sessionRepo = new InMemorySessionRepository();
const realtimeTransport = new MockRealtimeTransport();

export const createQuizUseCase = new CreateQuizUseCase(quizRepo);
export const updateQuizUseCase = new UpdateQuizUseCase(quizRepo);
export const getQuizUseCase = new GetQuizUseCase(quizRepo);
export const listQuizzesUseCase = new ListQuizzesUseCase(quizRepo);
export const deleteQuizUseCase = new DeleteQuizUseCase(quizRepo);

export const listClassesUseCase = new ListClassesUseCase(classRepo);
export const getClassUseCase = new GetClassUseCase(classRepo);
export const createClassUseCase = new CreateClassUseCase(classRepo);
export const updateClassUseCase = new UpdateClassUseCase(classRepo);
export const deleteClassUseCase = new DeleteClassUseCase(classRepo);

export const launchSessionUseCase = new LaunchSessionUseCase(
  quizRepo,
  sessionRepo,
  realtimeTransport,
  classRepo
);
export const joinSessionUseCase = new JoinSessionUseCase(
  sessionRepo,
  realtimeTransport,
  classRepo
);
export const getSessionJoinInfoUseCase = new GetSessionJoinInfoUseCase(
  sessionRepo,
  classRepo
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
