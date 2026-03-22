import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  Stack,
  Alert,
  Paper,
  LinearProgress,
  TextField,
} from '@mui/material';
import {
  isWordCloudQuestion,
  type Answer,
  type Question,
  type Quiz,
} from '@kahin/qcm-domain';
import type { SubmitAnswerInput } from '@kahin/qcm-application';
import { useSessionStream } from '../hooks/useSessionStream';
import { useSubmitAnswer } from '../hooks/useSubmitAnswer';
import { useSession } from '../hooks/useSession';
import { useQcmDependencies } from '../QcmDependenciesContext';
import { computeRanking } from '@kahin/qcm-application';
import {
  isApiMode,
  apiAdvanceIfTimeUp,
  apiGetSessionQuizForParticipant,
} from '../apiClient';

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
  const [wordInput, setWordInput] = useState('');
  const [mySubmittedWords, setMySubmittedWords] = useState<string[]>([]);
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
    if (isApiMode()) {
      apiGetSessionQuizForParticipant.execute(sessionId).then(setQuiz);
    } else {
      getQuiz.execute(session.quizId).then(setQuiz);
    }
  }, [session?.quizId, currentQuestion, getQuiz, sessionId]);

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

  const currentQuestionData = currentQuestion?.question;
  const isWordCloud = isWordCloudQuestion(
    currentQuestionData as Question | undefined
  );

  // Réinitialiser "a répondu" et "temps écoulé" quand une nouvelle question est affichée (pas quand on passe aux résultats)
  const currentQuestionId = currentQuestion?.question.id;
  React.useEffect(() => {
    if (currentQuestionId) {
      setHasAnsweredCurrentQuestion(false);
      setTimeUpForCurrentQuestion(false);
      setMySubmittedWords([]);
      setWordInput('');
      advanceCalledRef.current = false;
    }
  }, [currentQuestionId]);

  // Mots déjà soumis pour cette question (depuis la session après refetch)
  const myWordsFromSession = useMemo(() => {
    if (!session || !currentQuestionId) return [];
    const a = session.answers.find(
      (x) =>
        x.participantId === participantId &&
        x.questionId === currentQuestionId &&
        Array.isArray((x as Answer).words)
    );
    return (a as Answer | undefined)?.words ?? [];
  }, [session, participantId, currentQuestionId]);

  const displayedMyWords = useMemo(() => {
    const fromSession = new Set(myWordsFromSession);
    const combined = [...myWordsFromSession];
    for (const w of mySubmittedWords) {
      if (!fromSession.has(w)) combined.push(w);
    }
    return combined;
  }, [myWordsFromSession, mySubmittedWords]);

  // Timer : calcul du temps restant et appel advance-if-time-up à 0
  const timerSeconds =
    currentQuestionData?.timerSeconds ?? (isWordCloud ? 180 : 10);
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
        if (isApiMode() && !isWordCloud) {
          apiAdvanceIfTimeUp.execute(sessionId).catch(() => {});
        }
      }
    };
    update();
    const t = setInterval(update, TIMER_TICK_MS);
    return () => clearInterval(t);
  }, [
    questionShownAt,
    timerSeconds,
    hasAnsweredCurrentQuestion,
    sessionId,
    isWordCloud,
  ]);

  const handleSubmit = async () => {
    if (!currentQuestion) return;
    if (isWordCloud) {
      const w = wordInput.trim();
      if (!w) return;
      try {
        await submitAnswer({
          sessionId,
          participantId,
          questionId: currentQuestion.question.id,
          word: w,
        } as SubmitAnswerInput);
        setMySubmittedWords((prev) => [...prev, w]);
        setWordInput('');
        refetch();
      } catch {
        // L'erreur est déjà affichée par useSubmitAnswer
      }
      return;
    }
    if (!selectedChoiceId) return;
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

  // Le participant a déjà répondu à cette question (QCM uniquement) : page d'attente
  if (!isWordCloud && hasAnsweredCurrentQuestion) {
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

  const question = currentQuestion!.question;
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
        {question?.label ?? ''}
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

      {isWordCloud ? (
        <>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <TextField
              fullWidth
              size="medium"
              placeholder="Écrivez un mot…"
              value={wordInput}
              onChange={(e) => setWordInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleSubmit();
                }
              }}
              inputProps={{ 'aria-label': 'Mot à ajouter au nuage' }}
            />
            <Button
              variant="contained"
              onClick={() => void handleSubmit()}
              disabled={!wordInput.trim() || loading}
              sx={{ flexShrink: 0 }}
            >
              {loading ? 'Envoi…' : 'Ajouter'}
            </Button>
          </Stack>
          {displayedMyWords.length > 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Mots envoyés : {displayedMyWords.join(', ')}
            </Typography>
          )}
        </>
      ) : (
        <>
          <Stack spacing={1.5} sx={{ mb: 3 }}>
            {(question?.choices ?? []).map((choice) => (
              <Button
                key={choice.id}
                variant={
                  selectedChoiceId === choice.id ? 'contained' : 'outlined'
                }
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
            onClick={() => void handleSubmit()}
            disabled={!selectedChoiceId || loading}
          >
            {loading ? 'Envoi…' : 'Valider'}
          </Button>
        </>
      )}
    </Box>
  );
}
