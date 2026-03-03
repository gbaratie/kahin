import React, { useEffect, useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  Alert,
  Paper,
} from '@mui/material';
import type { Quiz } from '@kahin/qcm-domain';
import { useSessionStream } from '../hooks/useSessionStream';
import { useSubmitAnswer } from '../hooks/useSubmitAnswer';
import { useSession } from '../hooks/useSession';
import { useQcmDependencies } from '../QcmDependenciesContext';
import { computeRanking } from '../utils/ranking';

const SESSION_POLL_WHEN_WAITING_MS = 1500;
const TOP_RANKING_LIMIT = 10;

type SessionParticipantViewProps = {
  sessionId: string;
  participantId: string;
};

function formatRank(rank: number): string {
  if (rank === 1) return '1er';
  return `${rank}e`;
}

export function SessionParticipantView({
  sessionId,
  participantId,
}: SessionParticipantViewProps) {
  const { currentQuestion, sessionFinished } = useSessionStream(sessionId);
  const { session, refetch } = useSession(sessionId);
  const { getQuiz } = useQcmDependencies();
  const { execute: submitAnswer, loading, error } = useSubmitAnswer();
  const [selectedChoiceId, setSelectedChoiceId] =
    React.useState<string | null>(null);
  const [hasAnsweredCurrentQuestion, setHasAnsweredCurrentQuestion] =
    React.useState(false);
  const [quiz, setQuiz] = useState<Quiz | null>(null);

  // Quand on est en attente (pas de question affichée), rafraîchir la session pour savoir si l'admin affiche les résultats
  useEffect(() => {
    if (!sessionId || currentQuestion || sessionFinished) return;
    const t = setInterval(() => refetch(), SESSION_POLL_WHEN_WAITING_MS);
    return () => clearInterval(t);
  }, [sessionId, currentQuestion, sessionFinished, refetch]);

  useEffect(() => {
    if (!session?.quizId || !session?.showingResult) return;
    getQuiz.execute(session.quizId).then(setQuiz);
  }, [session?.quizId, session?.showingResult, getQuiz]);

  const rankingUpTo = useMemo(() => {
    if (!session || !quiz || !session.showingResult) return 0;
    return session.currentQuestionIndex + 1;
  }, [session, quiz]);
  const ranking = useMemo(() => {
    if (!session || !quiz || rankingUpTo <= 0) return [];
    return computeRanking(session, quiz, rankingUpTo);
  }, [session, quiz, rankingUpTo]);
  const myEntry = useMemo(
    () => ranking.find((e) => e.participantId === participantId),
    [ranking, participantId]
  );
  const myRank = myEntry
    ? ranking.findIndex((e) => e.participantId === participantId) + 1
    : 0;
  const top10 = ranking.slice(0, TOP_RANKING_LIMIT);

  // Réinitialiser "a répondu" quand la question affichée change
  const currentQuestionId = currentQuestion?.question.id;
  React.useEffect(() => {
    setHasAnsweredCurrentQuestion(false);
  }, [currentQuestionId]);

  const handleSubmit = async () => {
    if (!currentQuestion || !selectedChoiceId) return;
    try {
      await submitAnswer({
        sessionId,
        participantId,
        questionId: currentQuestion.question.id,
        choiceId: selectedChoiceId,
      });
      setSelectedChoiceId(null);
      setHasAnsweredCurrentQuestion(true);
    } catch {
      // L'erreur est déjà affichée par useSubmitAnswer
    }
  };

  if (sessionFinished) {
    return (
      <Box sx={{ p: 2, maxWidth: 600, mx: 'auto' }}>
        <Alert severity="info">
          Le QCM est terminé. Merci de votre participation.
        </Alert>
      </Box>
    );
  }

  // Pas de question affichée : attente ou affichage des résultats par l'admin
  if (!currentQuestion) {
    const showingResult = Boolean(session?.showingResult);
    if (showingResult) {
      return (
        <Box sx={{ p: 2, maxWidth: 600, mx: 'auto' }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              Mon classement
            </Typography>
            <Typography variant="h3" color="primary" fontWeight="bold">
              {myRank > 0 ? formatRank(myRank) : '—'} • {myEntry?.score ?? 0} pts
            </Typography>
          </Box>
          <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Classement (10 premiers)
            </Typography>
            <Box component="ol" sx={{ m: 0, pl: 2.5 }}>
              {top10.map((entry) => (
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
          </Paper>
          <Typography color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
            En attente de la prochaine question…
          </Typography>
        </Box>
      );
    }
    return (
      <Box sx={{ p: 2, maxWidth: 600, mx: 'auto' }}>
        <Typography color="text.secondary">
          En attente de la prochaine question…
        </Typography>
      </Box>
    );
  }

  // Le participant a déjà répondu à cette question : page d'attente
  if (hasAnsweredCurrentQuestion) {
    return (
      <Box sx={{ p: 2, maxWidth: 600, mx: 'auto' }}>
        <Alert severity="success" icon={false}>
          <Typography variant="body1" fontWeight={500}>
            Merci d&apos;avoir répondu à cette question.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            En attente de la prochaine question…
          </Typography>
        </Alert>
      </Box>
    );
  }

  const question = currentQuestion.question;

  return (
    <Box sx={{ p: 2, maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h6" gutterBottom>
        {question.label}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error.message}
        </Alert>
      )}

      <FormControl component="fieldset" fullWidth sx={{ mb: 2 }}>
        <RadioGroup
          value={selectedChoiceId ?? ''}
          onChange={(_, value) => setSelectedChoiceId(value)}
        >
          {question.choices.map((choice) => (
            <FormControlLabel
              key={choice.id}
              value={choice.id}
              control={<Radio />}
              label={choice.label}
            />
          ))}
        </RadioGroup>
      </FormControl>

      <Button
        variant="contained"
        onClick={handleSubmit}
        disabled={!selectedChoiceId || loading}
      >
        {loading ? 'Envoi…' : 'Valider'}
      </Button>
    </Box>
  );
}
