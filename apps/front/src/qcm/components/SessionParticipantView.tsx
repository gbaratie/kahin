import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  Stack,
  Alert,
  Paper,
  LinearProgress,
} from '@mui/material';
import type { Quiz } from '@kahin/qcm-domain';
import { useSessionStream } from '../hooks/useSessionStream';
import { useSubmitAnswer } from '../hooks/useSubmitAnswer';
import { useSession } from '../hooks/useSession';
import { useQcmDependencies } from '../QcmDependenciesContext';
import { computeRanking } from '../utils/ranking';
import { isApiMode, apiAdvanceIfTimeUp } from '../apiClient';

const SESSION_POLL_WHEN_WAITING_MS = 1500;
const TOP_RANKING_LIMIT = 10;
const TIMER_TICK_MS = 100;

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
  const [selectedChoiceId, setSelectedChoiceId] = React.useState<string | null>(
    null
  );
  const [hasAnsweredCurrentQuestion, setHasAnsweredCurrentQuestion] =
    React.useState(false);
  const [timeUpForCurrentQuestion, setTimeUpForCurrentQuestion] =
    React.useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const advanceCalledRef = useRef(false);
  const [quiz, setQuiz] = useState<Quiz | null>(null);

  // Quand on est en attente (pas de question affichée), rafraîchir la session pour savoir si l'admin affiche les résultats
  useEffect(() => {
    if (!sessionId || currentQuestion || sessionFinished) return;
    const t = setInterval(() => refetch(), SESSION_POLL_WHEN_WAITING_MS);
    return () => clearInterval(t);
  }, [sessionId, currentQuestion, sessionFinished, refetch]);

  // Charger le quiz dès qu'il n'y a pas de question affichée (pour afficher la page scores/classement)
  useEffect(() => {
    if (!session?.quizId || currentQuestion) return;
    getQuiz.execute(session.quizId).then(setQuiz);
  }, [session?.quizId, currentQuestion, getQuiz]);

  const rankingUpTo = useMemo(() => {
    if (!session || !quiz) return 0;
    return session.currentQuestionIndex >= 0
      ? session.currentQuestionIndex + 1
      : 0;
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

  // Réinitialiser "a répondu" et "temps écoulé" quand une nouvelle question est affichée (pas quand on passe aux résultats)
  const currentQuestionId = currentQuestion?.question.id;
  React.useEffect(() => {
    if (currentQuestionId) {
      setHasAnsweredCurrentQuestion(false);
      setTimeUpForCurrentQuestion(false);
      advanceCalledRef.current = false;
    }
  }, [currentQuestionId]);

  // Timer : calcul du temps restant et appel advance-if-time-up à 0
  const timerSeconds = currentQuestion?.question.timerSeconds ?? 10;
  const questionShownAt = currentQuestion?.questionShownAt;
  useEffect(() => {
    if (!questionShownAt || hasAnsweredCurrentQuestion) {
      setRemainingSeconds(null);
      return;
    }
    const startMs = new Date(questionShownAt).getTime();
    if (Number.isNaN(startMs)) {
      setRemainingSeconds(null);
      return;
    }
    const update = () => {
      const elapsed = (Date.now() - startMs) / 1000;
      const remaining = Math.max(0, timerSeconds - elapsed);
      setRemainingSeconds(remaining);
      if (remaining <= 0 && !advanceCalledRef.current) {
        advanceCalledRef.current = true;
        setTimeUpForCurrentQuestion(true);
        if (isApiMode()) {
          apiAdvanceIfTimeUp.execute(sessionId).catch(() => {});
        }
      }
    };
    update();
    const t = setInterval(update, TIMER_TICK_MS);
    return () => clearInterval(t);
  }, [questionShownAt, timerSeconds, hasAnsweredCurrentQuestion, sessionId]);

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
      <Box sx={{ p: 2, maxWidth: { xs: 600, md: 960 }, mx: 'auto' }}>
        <Alert severity="info">
          Le QCM est terminé. Merci de votre participation.
        </Alert>
      </Box>
    );
  }

  // Pas de question affichée : on affiche directement la page scores / classement
  if (!currentQuestion) {
    return (
      <Box sx={{ p: 2, maxWidth: { xs: 600, md: 960 }, mx: 'auto' }}>
        {timeUpForCurrentQuestion && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Le temps est écoulé
          </Alert>
        )}
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
        <Typography
          color="text.secondary"
          sx={{ display: 'block', textAlign: 'center' }}
        >
          {rankingUpTo === 0
            ? "En attente du démarrage par l'animateur…"
            : 'En attente de la prochaine question…'}
        </Typography>
      </Box>
    );
  }

  // Le participant a déjà répondu à cette question : page d'attente
  if (hasAnsweredCurrentQuestion) {
    return (
      <Box sx={{ p: 2, maxWidth: { xs: 600, md: 960 }, mx: 'auto' }}>
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
  const showTimerBar =
    questionShownAt != null &&
    remainingSeconds != null &&
    !hasAnsweredCurrentQuestion;
  const progressValue =
    timerSeconds > 0 && remainingSeconds != null
      ? (remainingSeconds / timerSeconds) * 100
      : 0;

  return (
    <Box sx={{ p: 2, maxWidth: { xs: 600, md: 960 }, mx: 'auto' }}>
      <Typography variant="h6" gutterBottom>
        {question.label}
      </Typography>

      {showTimerBar && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress
            variant="determinate"
            value={progressValue}
            color="primary"
            sx={{ height: 8, borderRadius: 1 }}
          />
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 0.5, display: 'block' }}
          >
            {Math.ceil(remainingSeconds ?? 0)} s restante
            {Math.ceil(remainingSeconds ?? 0) !== 1 ? 's' : ''}
          </Typography>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error.message}
        </Alert>
      )}

      <Stack spacing={1.5} sx={{ mb: 3 }}>
        {question.choices.map((choice) => (
          <Button
            key={choice.id}
            variant={selectedChoiceId === choice.id ? 'contained' : 'outlined'}
            size="large"
            fullWidth
            onClick={() => setSelectedChoiceId(choice.id)}
            sx={{
              justifyContent: 'flex-start',
              textTransform: 'none',
              py: 1.5,
              fontSize: '1rem',
            }}
          >
            {choice.label}
          </Button>
        ))}
      </Stack>

      <Button
        variant="contained"
        size="large"
        fullWidth
        onClick={handleSubmit}
        disabled={!selectedChoiceId || loading}
      >
        {loading ? 'Envoi…' : 'Valider'}
      </Button>
    </Box>
  );
}
