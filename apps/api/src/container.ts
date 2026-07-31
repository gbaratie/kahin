/**
 * Injection des dépendances : use cases + repositories.
 * Quiz / questions / thèmes / roster : JSON en dev, Postgres en production.
 * Sessions : in-memory.
 */
import path from 'path';
import { fileURLToPath } from 'url';
import {
  JsonFileQuizRepository,
  JsonFileQuestionRepository,
  JsonFileThemeRepository,
  PostgresQuizRepository,
  PostgresQuestionRepository,
  PostgresThemeRepository,
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
  CreateThemeUseCase,
  UpdateThemeUseCase,
  DeleteThemeUseCase,
  ListThemesUseCase,
  SaveQuestionUseCase,
  DeleteQuestionUseCase,
  ListQuestionsUseCase,
  GetQuestionUseCase,
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

function createQuestionRepository() {
  if (isPostgresStorage()) {
    return new PostgresQuestionRepository();
  }
  return new JsonFileQuestionRepository(quizJsonPath);
}

function createThemeRepository() {
  if (isPostgresStorage()) {
    return new PostgresThemeRepository();
  }
  return new JsonFileThemeRepository(quizJsonPath);
}

function createRosterRepository() {
  if (isPostgresStorage()) {
    return new PostgresStudentRosterRepository();
  }
  return new JsonFileStudentRosterRepository(rosterJsonPath);
}

const quizRepo = createQuizRepository();
const questionRepo = createQuestionRepository();
const themeRepo = createThemeRepository();
const rosterRepo = createRosterRepository();
const sessionRepo = new InMemorySessionRepository();
const realtimeTransport = new MockRealtimeTransport();

export const createQuizUseCase = new CreateQuizUseCase(quizRepo);
export const updateQuizUseCase = new UpdateQuizUseCase(quizRepo, questionRepo);
export const getQuizUseCase = new GetQuizUseCase(quizRepo);
export const listQuizzesUseCase = new ListQuizzesUseCase(quizRepo);
export const deleteQuizUseCase = new DeleteQuizUseCase(quizRepo);

export const listThemesUseCase = new ListThemesUseCase(themeRepo);
export const createThemeUseCase = new CreateThemeUseCase(themeRepo);
export const updateThemeUseCase = new UpdateThemeUseCase(themeRepo);
export const deleteThemeUseCase = new DeleteThemeUseCase(themeRepo);

export const listQuestionsUseCase = new ListQuestionsUseCase(questionRepo);
export const getQuestionUseCase = new GetQuestionUseCase(questionRepo);
export const saveQuestionUseCase = new SaveQuestionUseCase(questionRepo);
export const deleteQuestionUseCase = new DeleteQuestionUseCase(questionRepo);

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
