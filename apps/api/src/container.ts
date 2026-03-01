/**
 * Injection des dépendances : use cases + repositories.
 * Quiz : persistance JSON (fichier). Sessions : in-memory.
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { JsonFileQuizRepository } from '@kahin/qcm-infrastructure/node';
import {
  InMemorySessionRepository,
  MockRealtimeTransport,
} from '@kahin/qcm-infrastructure';
import {
  CreateQuizUseCase,
  LaunchSessionUseCase,
  JoinSessionUseCase,
  GetSessionUseCase,
  SubmitAnswerUseCase,
  NextQuestionUseCase,
} from '@kahin/qcm-application';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultQuizJsonPath = path.join(__dirname, '..', 'data', 'quizzes.json');
const quizJsonPath = process.env.QUIZ_JSON_PATH ?? defaultQuizJsonPath;

export const QUIZ_JSON_STORAGE_PATH = quizJsonPath;
const quizRepo = new JsonFileQuizRepository(quizJsonPath);
const sessionRepo = new InMemorySessionRepository();
const realtimeTransport = new MockRealtimeTransport();

export const createQuizUseCase = new CreateQuizUseCase(quizRepo);
export const getQuizById = (id: string) => quizRepo.getById(id);
export const listQuizzes = () => quizRepo.list();
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
  realtimeTransport
);
export const nextQuestionUseCase = new NextQuestionUseCase(
  quizRepo,
  sessionRepo,
  realtimeTransport
);
