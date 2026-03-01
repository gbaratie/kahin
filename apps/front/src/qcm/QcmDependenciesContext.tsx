import React, { createContext, useMemo, useContext } from 'react';
import {
  InMemoryQuizRepository,
  InMemorySessionRepository,
  MockRealtimeTransport,
} from '@kahin/qcm-infrastructure';
import type { CreateQuizInput } from '@kahin/qcm-application';
import type {
  JoinSessionInput,
  JoinSessionResult,
  SubmitAnswerInput,
} from '@kahin/qcm-application';
import {
  CreateQuizUseCase,
  LaunchSessionUseCase,
  JoinSessionUseCase,
  SubmitAnswerUseCase,
  NextQuestionUseCase,
  GetSessionUseCase,
} from '@kahin/qcm-application';
import type { Quiz, Session } from '@kahin/qcm-domain';
import {
  apiCreateQuiz,
  apiLaunchSession,
  apiGetSession,
  apiNextQuestion,
  apiJoinSession,
  apiSubmitAnswer,
  isApiMode,
} from './apiClient';

const quizRepo = new InMemoryQuizRepository();
const sessionRepo = new InMemorySessionRepository();
const realtimeTransport = new MockRealtimeTransport();

const createQuizUseCase = new CreateQuizUseCase(quizRepo);
const launchSessionUseCase = new LaunchSessionUseCase(
  quizRepo,
  sessionRepo,
  realtimeTransport
);
const joinSessionUseCase = new JoinSessionUseCase(
  sessionRepo,
  realtimeTransport
);
const submitAnswerUseCase = new SubmitAnswerUseCase(
  sessionRepo,
  realtimeTransport
);
const nextQuestionUseCase = new NextQuestionUseCase(
  quizRepo,
  sessionRepo,
  realtimeTransport
);
const getSessionUseCase = new GetSessionUseCase(sessionRepo);

export type QcmDependencies = {
  createQuiz: { execute(input: CreateQuizInput): Promise<Quiz> };
  launchSession: { execute(quizId: string): Promise<Session> };
  joinSession: { execute(input: JoinSessionInput): Promise<JoinSessionResult> };
  submitAnswer: { execute(input: SubmitAnswerInput): Promise<void> };
  nextQuestion: {
    execute(sessionId: string): Promise<{ finished: boolean }>;
  };
  getSession: { execute(sessionId: string): Promise<Session | null> };
  realtimeTransport: MockRealtimeTransport;
};

const defaultDeps: QcmDependencies = (() => {
  const useApi = isApiMode();
  return {
    createQuiz: useApi ? apiCreateQuiz : createQuizUseCase,
    launchSession: useApi ? apiLaunchSession : launchSessionUseCase,
    joinSession: useApi ? apiJoinSession : joinSessionUseCase,
    submitAnswer: useApi ? apiSubmitAnswer : submitAnswerUseCase,
    nextQuestion: useApi ? apiNextQuestion : nextQuestionUseCase,
    getSession: useApi ? apiGetSession : getSessionUseCase,
    realtimeTransport,
  };
})();

const QcmDependenciesContext = createContext<QcmDependencies | null>(null);

export function QcmDependenciesProvider({
  children,
  dependencies,
}: {
  children: React.ReactNode;
  dependencies?: QcmDependencies;
}) {
  const value = useMemo(() => dependencies ?? defaultDeps, [dependencies]);
  return (
    <QcmDependenciesContext.Provider value={value}>
      {children}
    </QcmDependenciesContext.Provider>
  );
}

export function useQcmDependencies(): QcmDependencies {
  const ctx = useContext(QcmDependenciesContext);
  if (!ctx)
    throw new Error(
      'useQcmDependencies must be used within QcmDependenciesProvider'
    );
  return ctx;
}
