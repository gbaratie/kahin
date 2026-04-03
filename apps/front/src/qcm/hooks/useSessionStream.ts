import { useEffect, useState } from 'react';
import type { Question, Session } from '@kahin/qcm-domain';
import { useQcmDependencies } from '../QcmDependenciesContext';
import {
  isApiMode,
  apiGetSession,
  apiGetSessionQuizForParticipant,
} from '../apiClient';

export type QuestionShowPayload = {
  sessionId: string;
  questionIndex: number;
  question: Question;
  /** ISO date string when the question was shown (for timer). */
  questionShownAt?: string;
};

export type AnswerSubmittedPayload = {
  sessionId: string;
  participantId: string;
  questionId: string;
  choiceId?: string;
  word?: string;
};

const POLL_INTERVAL_MS = 1500;

export function useSessionStream(sessionId: string | null) {
  const { realtimeTransport } = useQcmDependencies();
  const [currentQuestion, setCurrentQuestion] =
    useState<QuestionShowPayload | null>(null);
  const [lastAnswer, setLastAnswer] = useState<AnswerSubmittedPayload | null>(
    null
  );
  const [sessionFinished, setSessionFinished] = useState(false);
  const [sessionSnapshot, setSessionSnapshot] = useState<Session | null>(null);

  // Mode API : polling session + quiz pour currentQuestion et sessionFinished
  useEffect(() => {
    if (!sessionId || !isApiMode()) return;

    const poll = async () => {
      const session = await apiGetSession.execute(sessionId);
      if (!session) return;
      setSessionSnapshot(session);
      if (session.status === 'finished') {
        setSessionFinished(true);
        return;
      }
      if (
        session.currentQuestionIndex >= 0 &&
        session.quizId &&
        session.showingResult !== true
      ) {
        const quiz = await apiGetSessionQuizForParticipant.execute(sessionId);
        if (quiz && session.currentQuestionIndex < quiz.questions.length) {
          const question = quiz.questions[session.currentQuestionIndex];
          const timestamps = (
            session as { questionShownAtTimestamps?: (string | null)[] }
          ).questionShownAtTimestamps;
          const raw = timestamps?.[session.currentQuestionIndex];
          const questionShownAt = typeof raw === 'string' ? raw : undefined;
          setCurrentQuestion({
            sessionId,
            questionIndex: session.currentQuestionIndex,
            question,
            questionShownAt,
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

  // Mode local : abonnement temps réel
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

    const unsubAnswer = realtimeTransport.subscribe(
      'answer_submitted',
      (payload: unknown) => {
        const p = payload as AnswerSubmittedPayload;
        if (p.sessionId === sessionId) setLastAnswer(p);
      }
    );

    const unsubFinished = realtimeTransport.subscribe(
      'session_finished',
      (payload: unknown) => {
        const p = payload as { sessionId: string };
        if (p.sessionId === sessionId) setSessionFinished(true);
      }
    );

    const unsubResult = realtimeTransport.subscribe(
      'question_result',
      (payload: unknown) => {
        const p = payload as { sessionId: string };
        if (p.sessionId === sessionId) setCurrentQuestion(null);
      }
    );

    const unsubCumulative = realtimeTransport.subscribe(
      'cumulative_ranking_show',
      (payload: unknown) => {
        const p = payload as { sessionId: string };
        if (p.sessionId === sessionId) setCurrentQuestion(null);
      }
    );

    return () => {
      unsubQuestion();
      unsubAnswer();
      unsubFinished();
      unsubResult();
      unsubCumulative();
      realtimeTransport.leaveChannel?.(sessionId);
    };
  }, [sessionId, realtimeTransport]);

  return { currentQuestion, lastAnswer, sessionFinished, sessionSnapshot };
}
