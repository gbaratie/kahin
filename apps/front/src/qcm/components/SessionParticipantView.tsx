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
import Link from 'next/link';
import {
  isWordCloudQuestion,
  isClosestQuestion,
  type Answer,
  type Question,
  type Quiz,
} from '@kahin/qcm-domain';
import type { SubmitAnswerInput } from '@kahin/qcm-application';
import { useSessionStream } from '../hooks/useSessionStream';
import { useSubmitAnswer } from '../hooks/useSubmitAnswer';
import { useSession } from '../hooks/useSession';
import { useQcmDependencies } from '../QcmDependenciesContext';
import {
  computeRanking,
  formatRankEntryScore,
  pointsForClosestAnswer,
} from '@kahin/qcm-application';
import {
  isApiMode,
  apiAdvanceIfTimeUp,
  apiGetSessionQuizForParticipant,
} from '../apiClient';
import { clearRememberedParticipantName } from '../participantIdentity';
import { SessionHostDisplayedQuestion } from './SessionHostDisplayedQuestion';
import { SessionHostQuestionFeedback } from './SessionHostQuestionFeedback';
import { QuestionPlayModeBanner } from './QuestionPlayModeBanner';
import { isPerQuestionFeedbackPhase } from '../sessionFeedbackPhase';

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
  const { currentQuestion, sessionFinished, sessionSnapshot } =
    useSessionStream(sessionId);
  const { session, refetch } = useSession(sessionId);
  const effectiveSession = isApiMode() ? (sessionSnapshot ?? session) : session;

  const showQuestionFeedbackOnly = isPerQuestionFeedbackPhase(effectiveSession);
  const { getQuiz } = useQcmDependencies();
  const { execute: submitAnswer, loading, error } = useSubmitAnswer();
  const [selectedChoiceId, setSelectedChoiceId] = React.useState<string | null>(
    null
  );
  const [wordInput, setWordInput] = useState('');
  const [mySubmittedWords, setMySubmittedWords] = useState<string[]>([]);
  const [numberInput, setNumberInput] = useState('');
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
    const sid = isApiMode()
      ? (sessionSnapshot?.quizId ?? session?.quizId)
      : session?.quizId;
    if (!sid || currentQuestion) return;
    if (isApiMode()) {
      apiGetSessionQuizForParticipant.execute(sessionId).then(setQuiz);
    } else {
      getQuiz.execute(sid).then(setQuiz);
    }
  }, [
    session?.quizId,
    sessionSnapshot?.quizId,
    currentQuestion,
    getQuiz,
    sessionId,
  ]);

  const rankingUpTo = useMemo(() => {
    if (!effectiveSession || !quiz) return 0;
    return effectiveSession.currentQuestionIndex >= 0
      ? effectiveSession.currentQuestionIndex + 1
      : 0;
  }, [effectiveSession, quiz]);
  const ranking = useMemo(() => {
    if (!effectiveSession || !quiz || rankingUpTo <= 0) return [];
    return computeRanking(effectiveSession, quiz, rankingUpTo);
  }, [effectiveSession, quiz, rankingUpTo]);
  const myEntry = useMemo(
    () => ranking.find((e) => e.participantId === participantId),
    [ranking, participantId]
  );
  const myRank = myEntry
    ? ranking.findIndex((e) => e.participantId === participantId) + 1
    : 0;
  const top10 = ranking.slice(0, TOP_RANKING_LIMIT);

  const myParticipantName = useMemo(() => {
    const fromSession = effectiveSession?.participants.find(
      (p) => p.id === participantId
    )?.name;
    return fromSession ?? myEntry?.participantName ?? null;
  }, [effectiveSession, participantId, myEntry]);

  const handleChangeIdentity = () => {
    clearRememberedParticipantName();
  };

  const feedbackQuestionForResults = useMemo(() => {
    if (!quiz || !effectiveSession || !showQuestionFeedbackOnly) return null;
    const idx = effectiveSession.currentQuestionIndex;
    if (idx < 0 || idx >= quiz.questions.length) return null;
    return quiz.questions[idx];
  }, [quiz, effectiveSession, showQuestionFeedbackOnly]);

  /** Résultat personnel (QCM / au plus proche) sur l’écran « Résultat de la question ». */
  const myFeedbackQcmOutcome = useMemo(():
    | 'correct'
    | 'incorrect'
    | 'no_answer'
    | null => {
    if (!effectiveSession || !feedbackQuestionForResults) return null;
    if (isWordCloudQuestion(feedbackQuestionForResults)) return null;
    if (isClosestQuestion(feedbackQuestionForResults)) return null;
    const correctId = feedbackQuestionForResults.correctChoiceId;
    if (!correctId) return null;
    const mine = effectiveSession.answers.filter(
      (a) =>
        a.participantId === participantId &&
        a.questionId === feedbackQuestionForResults.id &&
        typeof a.choiceId === 'string' &&
        a.choiceId
    );
    if (mine.length === 0) return 'no_answer';
    const last = mine[mine.length - 1] as Answer & { choiceId: string };
    return last.choiceId === correctId ? 'correct' : 'incorrect';
  }, [effectiveSession, feedbackQuestionForResults, participantId]);

  const myClosestFeedback = useMemo(() => {
    if (!effectiveSession || !feedbackQuestionForResults) return null;
    if (!isClosestQuestion(feedbackQuestionForResults)) return null;
    const mine = effectiveSession.answers.find(
      (a) =>
        a.participantId === participantId &&
        a.questionId === feedbackQuestionForResults.id &&
        typeof a.numberValue === 'number'
    );
    if (!mine || typeof mine.numberValue !== 'number') {
      return { kind: 'no_answer' as const };
    }
    const expected = feedbackQuestionForResults.expectedNumber;
    const distance =
      typeof expected === 'number'
        ? Math.abs(mine.numberValue - expected)
        : null;
    const points = pointsForClosestAnswer(
      feedbackQuestionForResults,
      mine.numberValue
    );
    return {
      kind: 'answered' as const,
      value: mine.numberValue,
      expected,
      distance,
      points,
    };
  }, [effectiveSession, feedbackQuestionForResults, participantId]);

  const participantFeedbackWordCloudWords = useMemo(() => {
    if (
      !effectiveSession ||
      !feedbackQuestionForResults ||
      !isWordCloudQuestion(feedbackQuestionForResults)
    ) {
      return [];
    }
    const qid = feedbackQuestionForResults.id;
    const counts = new Map<string, number>();
    for (const a of effectiveSession.answers) {
      if (a.questionId !== qid) continue;
      const words = (a as Answer).words;
      if (!Array.isArray(words)) continue;
      for (const w of words) {
        if (typeof w === 'string' && w.trim())
          counts.set(w.trim(), (counts.get(w.trim()) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .map(([word, count]) => ({ text: word, value: count }))
      .sort((a, b) => b.value - a.value);
  }, [effectiveSession, feedbackQuestionForResults]);

  const currentQuestionData = currentQuestion?.question;
  const isWordCloud = isWordCloudQuestion(
    currentQuestionData as Question | undefined
  );
  const isClosest = isClosestQuestion(
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
      setNumberInput('');
      advanceCalledRef.current = false;
    }
  }, [currentQuestionId]);

  // Mots déjà soumis pour cette question (depuis la session après refetch)
  const myWordsFromSession = useMemo(() => {
    if (!effectiveSession || !currentQuestionId) return [];
    const a = effectiveSession.answers.find(
      (x) =>
        x.participantId === participantId &&
        x.questionId === currentQuestionId &&
        Array.isArray((x as Answer).words)
    );
    return (a as Answer | undefined)?.words ?? [];
  }, [effectiveSession, participantId, currentQuestionId]);

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
    currentQuestionData?.timerSeconds ??
    (isWordCloud ? 180 : isClosest ? 15 : 10);
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
    if (isClosest) {
      const raw = numberInput.trim().replace(',', '.');
      if (!raw) return;
      const numberValue = Number(raw);
      if (!Number.isFinite(numberValue)) return;
      try {
        await submitAnswer({
          sessionId,
          participantId,
          questionId: currentQuestion.question.id,
          numberValue,
        } as SubmitAnswerInput);
        setNumberInput('');
        setHasAnsweredCurrentQuestion(true);
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

  // Pas de question affichée : résultat à la question puis classement cumulé
  if (!currentQuestion) {
    if (showQuestionFeedbackOnly && effectiveSession) {
      if (!feedbackQuestionForResults) {
        return (
          <Box sx={{ p: 2, maxWidth: { xs: 600, md: 960 }, mx: 'auto' }}>
            <Typography color="text.secondary">
              Chargement du résultat…
            </Typography>
          </Box>
        );
      }
      return (
        <Box sx={{ p: 2, maxWidth: { xs: 600, md: 960 }, mx: 'auto' }}>
          {timeUpForCurrentQuestion && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Le temps est écoulé
            </Alert>
          )}
          {myFeedbackQcmOutcome === 'correct' && (
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="body1" fontWeight={600}>
                Bonne réponse !
              </Typography>
            </Alert>
          )}
          {myFeedbackQcmOutcome === 'incorrect' && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="body1" fontWeight={600}>
                Mauvaise réponse.
              </Typography>
            </Alert>
          )}
          {myFeedbackQcmOutcome === 'no_answer' && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body1" fontWeight={500}>
                Vous n&apos;avez pas répondu à cette question.
              </Typography>
            </Alert>
          )}
          {myClosestFeedback?.kind === 'no_answer' && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body1" fontWeight={500}>
                Vous n&apos;avez pas répondu à cette question.
              </Typography>
            </Alert>
          )}
          {myClosestFeedback?.kind === 'answered' && (
            <Alert
              severity={
                myClosestFeedback.points >= 800
                  ? 'success'
                  : myClosestFeedback.points > 0
                    ? 'info'
                    : 'warning'
              }
              sx={{ mb: 2 }}
            >
              <Typography variant="body1" fontWeight={600}>
                Votre réponse : {myClosestFeedback.value}
                {typeof myClosestFeedback.expected === 'number'
                  ? ` (attendu : ${myClosestFeedback.expected})`
                  : ''}
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                {myClosestFeedback.points} point
                {myClosestFeedback.points !== 1 ? 's' : ''}
                {myClosestFeedback.distance != null
                  ? ` — écart ${
                      Number.isInteger(myClosestFeedback.distance)
                        ? myClosestFeedback.distance
                        : Math.round(myClosestFeedback.distance * 100) / 100
                    }`
                  : ''}
              </Typography>
            </Alert>
          )}
          {isWordCloudQuestion(feedbackQuestionForResults) ? (
            <SessionHostDisplayedQuestion
              displayedQuestion={feedbackQuestionForResults}
              isWordCloud
              wordCloudWords={participantFeedbackWordCloudWords}
              cardTitle="Résultat de la question"
            />
          ) : (
            <SessionHostQuestionFeedback
              session={effectiveSession}
              question={feedbackQuestionForResults}
            />
          )}
          <Typography
            color="text.secondary"
            sx={{ display: 'block', textAlign: 'center', mt: 2 }}
          >
            En attente du classement…
          </Typography>
        </Box>
      );
    }

    return (
      <Box sx={{ p: 2, maxWidth: { xs: 600, md: 960 }, mx: 'auto' }}>
        {timeUpForCurrentQuestion && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Le temps est écoulé
          </Alert>
        )}
        {rankingUpTo === 0 && myParticipantName && (
          <Alert
            severity="info"
            sx={{ mb: 2 }}
            action={
              <Button
                color="inherit"
                size="small"
                component={Link}
                href="/"
                onClick={handleChangeIdentity}
              >
                Changer
              </Button>
            }
          >
            Connecté en tant que <strong>{myParticipantName}</strong>
          </Alert>
        )}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Mon classement
          </Typography>
          <Typography variant="h3" color="primary" fontWeight="bold">
            {myRank > 0 ? formatRank(myRank) : '—'}
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mt: 0.5 }}>
            {myEntry ? formatRankEntryScore(myEntry) : '0 pts'}
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
                {entry.participantName} — {formatRankEntryScore(entry)}
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

  // Le participant a déjà répondu à cette question (QCM / au plus proche) : page d'attente
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
      <QuestionPlayModeBanner playMode={question.playMode} />
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
            {question.playMode === 'course'
              ? ' — mode cours (comptabilisé dans la note)'
              : ' — mode découverte (la vitesse compte)'}
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
      ) : isClosest ? (
        <>
          <TextField
            fullWidth
            type="number"
            size="medium"
            placeholder="Votre estimation…"
            value={numberInput}
            onChange={(e) => setNumberInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleSubmit();
              }
            }}
            inputProps={{
              step: 'any',
              'aria-label': 'Réponse numérique',
            }}
            sx={{ mb: 2 }}
          />
          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={() => void handleSubmit()}
            disabled={
              !numberInput.trim() ||
              !Number.isFinite(Number(numberInput.trim().replace(',', '.'))) ||
              loading
            }
          >
            {loading ? 'Envoi…' : 'Valider'}
          </Button>
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
                  justifyContent: 'center',
                  textAlign: 'center',
                  textTransform: 'none',
                  py: 1.5,
                  fontSize: '1rem',
                  whiteSpace: 'normal',
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
