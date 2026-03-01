import { useEffect, useState } from 'react';
import type { Question } from '@kahin/qcm-domain';
import { useQcmDependencies } from '../QcmDependenciesContext';
import { isApiMode, apiGetSession, apiGetQuiz } from '../apiClient';

export type QuestionShowPayload = {
  sessionId: string;
  questionIndex: number;
  question: Question;
};

export type AnswerSubmittedPayload = {
  sessionId: string;
  participantId: string;
  questionId: string;
  choiceId: string;
};

const POLL_INTERVAL_MS = 1500;

export function useSessionStream(sessionId: string | null) {
  const { realtimeTransport } = useQcmDependencies();
  const [currentQuestion, setCurrentQuestion] =
    useState<QuestionShowPayload | null>(null);
  const [sessionFinished, setSessionFinished] = useState(false);

  // Mode API : pas d’événements temps réel, on poll la session + quiz pour afficher la question courante
  useEffect(() => {
    if (!sessionId || !isApiMode()) return;

    const poll = async () => {
      const session = await apiGetSession.execute(sessionId);
      if (!session) return;
      if (session.status === 'finished') {
        setSessionFinished(true);
        return;
      }
      if (
        session.currentQuestionIndex >= 0 &&
        session.quizId
      ) {
        const quiz = await apiGetQuiz.execute(session.quizId);
        if (
          quiz &&
          session.currentQuestionIndex < quiz.questions.length
        ) {
          const question = quiz.questions[session.currentQuestionIndex];
          setCurrentQuestion({
            sessionId,
            questionIndex: session.currentQuestionIndex,
            question,
          });
        } else {
          setCurrentQuestion(null);
        }
      } else {
        setCurrentQuestion(null);
      }
    };

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [sessionId]);

  // Mode local : abonnement aux événements temps réel
  useEffect(() => {
    if (!sessionId || isApiMode()) return;

    realtimeTransport.joinChannel?.(sessionId);

    const unsubQuestion = realtimeTransport.subscribe(
      'question_show',
      (payload: unknown) => {
        const p = payload as QuestionShowPayload;
        if (p.sessionId === sessionId) setCurrentQuestion(p);
      }
    );

    const unsubFinished = realtimeTransport.subscribe(
      'session_finished',
      (payload: unknown) => {
        const p = payload as { sessionId: string };
        if (p.sessionId === sessionId) setSessionFinished(true);
      }
    );

    return () => {
      unsubQuestion();
      unsubFinished();
      realtimeTransport.leaveChannel?.(sessionId);
    };
  }, [sessionId, realtimeTransport]);

  return { currentQuestion, sessionFinished };
}
