import { useEffect, useState } from 'react';
import type { Question } from '@kahin/qcm-domain';
import { useQcmDependencies } from '../QcmDependenciesContext';

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

export function useSessionStream(sessionId: string | null) {
  const { realtimeTransport } = useQcmDependencies();
  const [currentQuestion, setCurrentQuestion] =
    useState<QuestionShowPayload | null>(null);
  const [lastAnswer, setLastAnswer] = useState<AnswerSubmittedPayload | null>(
    null
  );
  const [sessionFinished, setSessionFinished] = useState(false);

  useEffect(() => {
    if (!sessionId) return;

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

    return () => {
      unsubQuestion();
      unsubAnswer();
      unsubFinished();
      realtimeTransport.leaveChannel?.(sessionId);
    };
  }, [sessionId, realtimeTransport]);

  return { currentQuestion, lastAnswer, sessionFinished };
}
