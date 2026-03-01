import React, { createContext, useMemo, useContext } from 'react';
import {
  InMemoryQuizRepository,
  InMemorySessionRepository,
  MockRealtimeTransport,
} from '@kahin/qcm-infrastructure';
import {
  CreateQuizUseCase,
  LaunchSessionUseCase,
  JoinSessionUseCase,
  SubmitAnswerUseCase,
  NextQuestionUseCase,
  GetSessionUseCase,
} from '@kahin/qcm-application';
import {
  apiJoinSession,
  apiGetSession,
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
  createQuiz: CreateQuizUseCase;
  launchSession: LaunchSessionUseCase;
  joinSession: JoinSessionUseCase;
  submitAnswer: SubmitAnswerUseCase;
  nextQuestion: NextQuestionUseCase;
  getSession: GetSessionUseCase;
  realtimeTransport: MockRealtimeTransport;
};

const defaultDeps: QcmDependencies = (() => {
  const useApi = isApiMode();
  return {
    createQuiz: createQuizUseCase,
    launchSession: launchSessionUseCase,
    joinSession: useApi ? apiJoinSession : joinSessionUseCase,
    submitAnswer: useApi ? apiSubmitAnswer : submitAnswerUseCase,
    nextQuestion: nextQuestionUseCase,
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
