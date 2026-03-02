import React, { useEffect, useState, useMemo } from 'react';
import { Box, Typography, Button, Paper, Alert } from '@mui/material';
import type { Question, Quiz, Session } from '@kahin/qcm-domain';
import { useNextQuestion } from '../hooks/useNextQuestion';
import { useSessionStream } from '../hooks/useSessionStream';
import { useSession } from '../hooks/useSession';
import { useQcmDependencies } from '../QcmDependenciesContext';
import { isApiMode } from '../apiClient';

const POINTS_PER_QUESTION = 10;

type RankEntry = { participantId: string; participantName: string; score: number };

function computeRanking(
  session: Session,
  quiz: Quiz,
  upToQuestionIndex: number
): RankEntry[] {
  if (upToQuestionIndex <= 0) return [];
  const questionIds = quiz.questions
    .slice(0, upToQuestionIndex)
    .map((q) => q.id);
  const scoreByParticipant = new Map<string, number>();
  for (const p of session.participants) {
    scoreByParticipant.set(p.id, 0);
  }
  for (let i = 0; i < upToQuestionIndex; i++) {
    const question = quiz.questions[i];
    const correctChoiceId = question.correctChoiceId;
    if (correctChoiceId == null) continue;
    for (const answer of session.answers) {
      if (answer.questionId !== question.id) continue;
      if (answer.choiceId === correctChoiceId) {
        const current = scoreByParticipant.get(answer.participantId) ?? 0;
        scoreByParticipant.set(answer.participantId, current + POINTS_PER_QUESTION);
      }
    }
  }
  const nameById = new Map(session.participants.map((p) => [p.id, p.name]));
  const entries: RankEntry[] = [];
  scoreByParticipant.forEach((score, participantId) => {
    entries.push({
      participantId,
      participantName: nameById.get(participantId) ?? 'Participant',
      score,
    });
  });
  entries.sort((a, b) => b.score - a.score);
  return entries;
}

type SessionHostViewProps = { sessionId: string; sessionCode: string };

export function SessionHostView({
  sessionId,
  sessionCode,
}: SessionHostViewProps) {
  const isApi = isApiMode();
  const { session, refetch } = useSession(sessionId);
  const { getQuiz } = useQcmDependencies();
  const [quiz, setQuiz] = useState<Quiz | null>(null);

  useEffect(() => {
    if (!session?.quizId) return;
    getQuiz.execute(session.quizId).then(setQuiz);
  }, [session?.quizId, getQuiz]);

  const { execute: nextQuestion, loading, error, finished } = useNextQuestion();
  const { currentQuestion, sessionFinished } = useSessionStream(
    isApi ? null : sessionId
  );

  const displayedQuestion: Question | null = isApi
    ? session &&
      quiz &&
      session.currentQuestionIndex >= 0 &&
      session.currentQuestionIndex < quiz.questions.length
      ? quiz.questions[session.currentQuestionIndex]
      : null
    : (currentQuestion?.question ?? null);

  const isFinished = isApi
    ? session?.status === 'finished' || finished
    : finished || sessionFinished;

  const handleNextQuestion = () => {
    nextQuestion(sessionId).then(() => refetch());
  };

  const showRanking =
    session && quiz && (session.currentQuestionIndex >= 1 || isFinished);
  const ranking = useMemo(() => {
    if (!session || !quiz) return [];
    const upTo = isFinished
      ? quiz.questions.length
      : session.currentQuestionIndex;
    return computeRanking(session, quiz, upTo);
  }, [session, quiz, isFinished]);

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

      {session?.status === 'waiting' && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Participants connectés
          </Typography>
          {session.participants.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Aucun participant pour l&apos;instant.
            </Typography>
          ) : (
            <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
              {session.participants.map((p) => (
                <Typography
                  key={p.id}
                  component="li"
                  variant="body2"
                  sx={{ mb: 0.5 }}
                >
                  {p.name}
                </Typography>
              ))}
            </Box>
          )}
        </Paper>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error.message}
        </Alert>
      )}

      {showRanking && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            {isFinished ? 'Classement final' : 'Scores (questions précédentes)'}
          </Typography>
          {ranking.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              En attente des premières réponses.
            </Typography>
          ) : (
            <Box component="ol" sx={{ m: 0, pl: 2.5 }}>
              {ranking.map((entry, idx) => (
                <Typography
                  key={entry.participantId}
                  component="li"
                  variant="body2"
                  sx={{ mb: 0.5 }}
                >
                  {entry.participantName} — {entry.score} pt
                  {entry.score !== 1 ? 's' : ''}
                </Typography>
              ))}
            </Box>
          )}
        </Paper>
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
