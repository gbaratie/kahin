import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, Paper, Alert } from '@mui/material';
import type { Question, Quiz } from '@kahin/qcm-domain';
import { useNextQuestion } from '../hooks/useNextQuestion';
import { useSessionStream } from '../hooks/useSessionStream';
import { useSession } from '../hooks/useSession';
import { isApiMode, apiGetQuiz } from '../apiClient';

type SessionHostViewProps = { sessionId: string; sessionCode: string };

export function SessionHostView({
  sessionId,
  sessionCode,
}: SessionHostViewProps) {
  const isApi = isApiMode();
  const { session, refetch } = useSession(sessionId);
  const [quiz, setQuiz] = useState<Quiz | null>(null);

  useEffect(() => {
    if (!isApi || !session?.quizId) return;
    apiGetQuiz.execute(session.quizId).then(setQuiz);
  }, [isApi, session?.quizId]);

  const { execute: nextQuestion, loading, error, finished } = useNextQuestion();
  const { currentQuestion, sessionFinished } = useSessionStream(
    isApi ? null : sessionId
  );

  const displayedQuestion: Question | null = isApi
    ? session && quiz && session.currentQuestionIndex >= 0 && session.currentQuestionIndex < quiz.questions.length
      ? quiz.questions[session.currentQuestionIndex]
      : null
    : currentQuestion?.question ?? null;

  const isFinished = isApi
    ? session?.status === 'finished' || finished
    : finished || sessionFinished;

  const handleNextQuestion = () => {
    nextQuestion(sessionId).then(() => {
      if (isApi) refetch();
    });
  };

  return (
    <Box sx={{ p: 2, maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h5" gutterBottom>
        Session en cours
      </Typography>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Code à donner aux participants
        </Typography>
        <Typography
          variant="h4"
          sx={{ letterSpacing: 2, fontFamily: 'monospace' }}
        >
          {sessionCode}
        </Typography>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error.message}
        </Alert>
      )}

      {displayedQuestion && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Question affichée
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 500, mb: 2 }}>
            {displayedQuestion.label}
          </Typography>
          {displayedQuestion.choices?.length > 0 && (
            <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
              {displayedQuestion.choices.map((choice) => (
                <Typography
                  key={choice.id}
                  component="li"
                  variant="body2"
                  sx={{ mb: 0.5 }}
                >
                  {choice.label}
                </Typography>
              ))}
            </Box>
          )}
        </Paper>
      )}

      {!isFinished ? (
        <Button
          variant="contained"
          onClick={handleNextQuestion}
          disabled={loading}
        >
          {loading ? 'Envoi…' : 'Question suivante'}
        </Button>
      ) : (
        <Alert severity="success">Le QCM est terminé.</Alert>
      )}
    </Box>
  );
}
