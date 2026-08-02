import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  LinearProgress,
  Paper,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import dynamic from 'next/dynamic';
import {
  isWordCloudQuestion,
  isClosestQuestion,
  type Answer,
  type Question,
  type Quiz,
} from '@kahin/qcm-domain';
import {
  buildResultsCsvFilename,
  buildSessionResultsCsv,
  computeRanking,
  formatRankEntryScore,
  rankEntryBarValue,
} from '@kahin/qcm-application';
import { useNextQuestion } from '../hooks/useNextQuestion';
import { useSessionStream } from '../hooks/useSessionStream';
import { useSession } from '../hooks/useSession';
import { useQcmDependencies } from '../QcmDependenciesContext';
import { apiDownloadSessionResultsCsv, isApiMode } from '../apiClient';
import { useSessionHostPolling } from '../hooks/useSessionHostPolling';
import { SessionHostRankingChart } from './SessionHostRankingChart';
import { SessionHostDisplayedQuestion } from './SessionHostDisplayedQuestion';
import { SessionHostQuestionFeedback } from './SessionHostQuestionFeedback';
import { QuestionPlayModeBanner } from './QuestionPlayModeBanner';
import { withBasePath } from '@/config/site';
import { layout } from '@/config/layout';
import { isPerQuestionFeedbackPhase } from '../sessionFeedbackPhase';

const HOST_TIMER_TICK_MS = 100;

const QRCodeSVG = dynamic(
  () =>
    import('qrcode.react').then((m) => {
      // qrcode.react expose QRCodeSVG et QRCodeCanvas.
      return m.QRCodeSVG;
    }),
  { ssr: false }
);

type SessionHostViewProps = { sessionId: string; sessionCode: string };

export function SessionHostView({
  sessionId,
  sessionCode,
}: SessionHostViewProps) {
  const isApi = isApiMode();
  const theme = useTheme();
  const qrFrameBg = theme.palette.background.paper;
  const { session, refetch } = useSession(sessionId);
  const { getQuiz, advanceIfTimeUp } = useQcmDependencies();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [joinUrlForQr, setJoinUrlForQr] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.quizId) return;
    getQuiz.execute(session.quizId).then(setQuiz);
  }, [session?.quizId, getQuiz]);

  // Construire une URL absolue (origin + basePath) pour que le QR marche partout.
  useEffect(() => {
    if (!sessionCode) return;
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}${withBasePath(
      `/join?code=${encodeURIComponent(sessionCode)}`
    )}`;
    setJoinUrlForQr(url);
  }, [sessionCode]);

  const { execute: nextQuestion, loading, error, finished } = useNextQuestion();
  const { currentQuestion, sessionFinished, lastAnswer } = useSessionStream(
    isApi ? null : sessionId
  );
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);

  const isWaiting = session?.status === 'waiting';
  const showingResult = Boolean(session?.showingResult);
  const isInProgress = session?.status === 'in_progress';
  const showPerQuestionFeedback = isPerQuestionFeedbackPhase(session);

  const displayedQuestionRaw: Question | null = (() => {
    if (!isInProgress) return null;
    if (showPerQuestionFeedback && session && quiz) {
      const idx = session.currentQuestionIndex;
      if (idx >= 0 && idx < quiz.questions.length) return quiz.questions[idx];
      return null;
    }
    if (!showingResult) {
      if (isApi) {
        return session &&
          quiz &&
          session.currentQuestionIndex >= 0 &&
          session.currentQuestionIndex < quiz.questions.length
          ? quiz.questions[session.currentQuestionIndex]
          : null;
      }
      return currentQuestion?.question ?? null;
    }
    return null;
  })();
  const isDisplayedQuestionWordCloud =
    isWordCloudQuestion(displayedQuestionRaw);
  const isDisplayedQuestionClosest = isClosestQuestion(displayedQuestionRaw);

  const showLiveQuestion =
    isInProgress && !showingResult && Boolean(displayedQuestionRaw && session);

  useSessionHostPolling({
    sessionId,
    isWaiting,
    refetch,
    lastAnswer,
    showLiveQuestion,
  });

  const displayedQuestion = displayedQuestionRaw;

  const questionShownAtMs = useMemo(() => {
    if (!session || session.currentQuestionIndex < 0) return null;
    const raw =
      session.questionShownAtTimestamps?.[session.currentQuestionIndex];
    if (raw == null) return null;
    if (raw instanceof Date) return raw.getTime();
    if (typeof raw === 'string') {
      const t = new Date(raw).getTime();
      return Number.isNaN(t) ? null : t;
    }
    return null;
  }, [session]);

  const respondentsCount = useMemo(() => {
    if (!session || !displayedQuestion?.id) return 0;
    const qid = displayedQuestion.id;
    const ids = new Set<string>();
    for (const a of session.answers) {
      if (a.questionId !== qid) continue;
      if (isDisplayedQuestionWordCloud) {
        const w = (a as Answer).words;
        if (Array.isArray(w) && w.length > 0) ids.add(a.participantId);
      } else if (isDisplayedQuestionClosest) {
        if (
          typeof a.numberValue === 'number' &&
          Number.isFinite(a.numberValue)
        ) {
          ids.add(a.participantId);
        }
      } else if (typeof a.choiceId === 'string' && a.choiceId) {
        ids.add(a.participantId);
      }
    }
    return ids.size;
  }, [
    session,
    displayedQuestion?.id,
    isDisplayedQuestionWordCloud,
    isDisplayedQuestionClosest,
  ]);

  const totalConnected = session?.participants.length ?? 0;

  const timerSecondsForHost =
    displayedQuestion?.timerSeconds ??
    (isDisplayedQuestionWordCloud ? 180 : isDisplayedQuestionClosest ? 15 : 10);

  const [hostRemainingSeconds, setHostRemainingSeconds] = useState<
    number | null
  >(null);
  const hostTimerFiredRef = useRef(false);

  useEffect(() => {
    hostTimerFiredRef.current = false;
  }, [session?.currentQuestionIndex, displayedQuestion?.id]);

  useEffect(() => {
    if (!showLiveQuestion || !sessionId) {
      setHostRemainingSeconds(null);
      return;
    }
    if (questionShownAtMs == null) {
      setHostRemainingSeconds(null);
      return;
    }
    const tick = () => {
      const elapsed = (Date.now() - questionShownAtMs) / 1000;
      const remaining = Math.max(0, timerSecondsForHost - elapsed);
      setHostRemainingSeconds(remaining);
      if (remaining <= 0 && !hostTimerFiredRef.current) {
        hostTimerFiredRef.current = true;
        void advanceIfTimeUp.execute(sessionId).then(() => refetch());
      }
    };
    tick();
    const id = setInterval(tick, HOST_TIMER_TICK_MS);
    return () => clearInterval(id);
  }, [
    showLiveQuestion,
    sessionId,
    questionShownAtMs,
    timerSecondsForHost,
    advanceIfTimeUp,
    refetch,
  ]);

  const hostTimerDisplaySeconds =
    questionShownAtMs == null
      ? null
      : (hostRemainingSeconds ??
        Math.max(
          0,
          timerSecondsForHost - (Date.now() - questionShownAtMs) / 1000
        ));

  const isFinished = isApi
    ? session?.status === 'finished' || finished
    : finished || sessionFinished;

  const handleNextQuestion = () => {
    nextQuestion(sessionId).then(() => refetch());
  };

  const handleDownloadResultsCsv = useCallback(() => {
    setCsvError(null);
    if (isApi) {
      setCsvLoading(true);
      void apiDownloadSessionResultsCsv
        .execute(sessionId)
        .catch((e: unknown) =>
          setCsvError(e instanceof Error ? e.message : String(e))
        )
        .finally(() => setCsvLoading(false));
      return;
    }
    if (!session || !quiz) {
      setCsvError('Session ou quiz indisponible');
      return;
    }
    try {
      const csv = buildSessionResultsCsv(session, quiz);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = buildResultsCsvFilename(quiz);
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objUrl);
    } catch (e: unknown) {
      setCsvError(e instanceof Error ? e.message : String(e));
    }
  }, [isApi, quiz, session, sessionId]);

  const showCumulativeRanking =
    session &&
    (isFinished ||
      (showingResult && session.showingCumulativeRanking !== false));

  const showRanking =
    session &&
    quiz &&
    showCumulativeRanking &&
    session.currentQuestionIndex >= 0;
  const rankingUpTo = useMemo(() => {
    if (!session || !quiz) return 0;
    if (isFinished) return quiz.questions.length;
    if (showingResult) return session.currentQuestionIndex + 1;
    return 0;
  }, [session, quiz, isFinished, showingResult]);
  const ranking = useMemo(() => {
    if (!session || !quiz || rankingUpTo <= 0) return [];
    return computeRanking(session, quiz, rankingUpTo);
  }, [session, quiz, rankingUpTo]);

  const chartData = useMemo(
    () =>
      ranking.map((entry) => ({
        name: entry.participantName,
        score: rankEntryBarValue(entry),
        scoreLabel: formatRankEntryScore(entry),
      })),
    [ranking]
  );

  const getRankingTitle = () => {
    if (isFinished) return 'Classement final';
    if (rankingUpTo <= 1) return 'Résultat de la question 1';
    return `Résultats cumulés (après ${rankingUpTo} questions)`;
  };

  const getButtonLabel = () => {
    if (loading) return 'Envoi…';
    if (isWaiting) return 'Lancer la session';
    if (showingResult) return 'Continuer';
    return 'Voir les résultats';
  };

  const wordCloudCounts = useMemo(() => {
    if (!session || !displayedQuestion?.id || !isDisplayedQuestionWordCloud)
      return [];
    const counts = new Map<string, number>();
    for (const a of session.answers) {
      if (a.questionId !== displayedQuestion.id) continue;
      const words = (a as Answer).words;
      if (!Array.isArray(words)) continue;
      for (const w of words) {
        if (typeof w === 'string' && w.trim())
          counts.set(w.trim(), (counts.get(w.trim()) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count);
  }, [session, displayedQuestion?.id, isDisplayedQuestionWordCloud]);

  const wordCloudSignature = wordCloudCounts
    .map(({ word, count }) => `${word}:${count}`)
    .join('|');

  const wordCloudWords = useMemo(
    () =>
      wordCloudCounts.map(({ word, count }) => ({ text: word, value: count })),
    // wordCloudSignature résume wordCloudCounts (évite recalculs à chaque refetch identique)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dépendance intentionnelle via signature
    [wordCloudSignature]
  );

  const participantCount = session?.participants.length ?? 0;

  return (
    <Box
      sx={{
        ...layout.sessionViewport,
        maxWidth: { xs: 600, md: 1100, lg: 1280 },
        overflow: isWaiting ? 'hidden' : 'auto',
        justifyContent: isWaiting ? 'center' : 'flex-start',
      }}
    >
      {!isWaiting && (
        <Typography
          variant="subtitle1"
          sx={{ fontWeight: 700, mb: 1, flexShrink: 0 }}
        >
          Session en cours
        </Typography>
      )}

      {isWaiting ? (
        <Box
          sx={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            py: { xs: 1, sm: 2 },
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={1}
            sx={{ flexShrink: 0 }}
          >
            <Typography
              variant="h6"
              sx={{ fontWeight: 700, fontSize: { xs: '1.1rem', sm: '1.25rem' } }}
            >
              En attente des participants
            </Typography>
            <Chip
              label={`${participantCount} participant${participantCount === 1 ? '' : 's'}`}
              color={participantCount > 0 ? 'primary' : 'default'}
              size="small"
              sx={{ fontWeight: 600 }}
            />
          </Stack>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr auto' },
              gap: { xs: 1.5, md: 2.5 },
              alignItems: 'stretch',
            }}
          >
            <Paper
              sx={{
                p: { xs: 2, md: 2.5 },
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: 1,
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ textTransform: 'uppercase', letterSpacing: 0.08 }}
              >
                Code session
              </Typography>
              <Typography
                sx={{
                  letterSpacing: { xs: 3, md: 6 },
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  fontWeight: 700,
                  fontSize: { xs: '2.6rem', md: '3.75rem' },
                  lineHeight: 1,
                }}
              >
                {sessionCode}
              </Typography>
              {joinUrlForQr && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    wordBreak: 'break-all',
                    fontSize: '0.8rem',
                    lineHeight: 1.35,
                  }}
                >
                  <Box
                    component="span"
                    sx={{ color: 'primary.main', fontWeight: 600 }}
                  >
                    {joinUrlForQr}
                  </Box>
                </Typography>
              )}
              {participantCount === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Aucun participant pour l&apos;instant — le QR et le code
                  s&apos;affichent à l&apos;écran.
                </Typography>
              ) : (
                <Box
                  component="ul"
                  sx={{
                    m: 0,
                    mt: 0.5,
                    pl: 2.25,
                    maxHeight: { xs: 96, md: 140 },
                    overflow: 'auto',
                    columns: { xs: 1, sm: 2 },
                    columnGap: 2,
                  }}
                >
                  {session?.participants.map((p) => (
                    <Typography
                      key={p.id}
                      component="li"
                      variant="body2"
                      sx={{ mb: 0.2 }}
                    >
                      {p.name}
                    </Typography>
                  ))}
                </Box>
              )}
            </Paper>

            <Paper
              sx={{
                p: { xs: 2, md: 2.5 },
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1.25,
                minWidth: { md: 260 },
              }}
            >
              {joinUrlForQr ? (
                <Box
                  sx={{
                    p: 1.25,
                    borderRadius: 2,
                    backgroundColor: qrFrameBg,
                    border: 1,
                    borderColor: 'divider',
                    lineHeight: 0,
                  }}
                >
                  <QRCodeSVG
                    value={joinUrlForQr}
                    size={220}
                    includeMargin={false}
                    bgColor={qrFrameBg}
                    fgColor={theme.palette.text.primary}
                    title="Code QR pour rejoindre la session"
                  />
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Chargement du QR Code…
                </Typography>
              )}
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ textAlign: 'center', maxWidth: 220, lineHeight: 1.35 }}
              >
                Scannez le QR pour rejoindre
              </Typography>
            </Paper>
          </Box>

          <Button
            variant="contained"
            size="large"
            onClick={handleNextQuestion}
            disabled={loading}
            sx={{ py: 1.35, fontWeight: 700 }}
          >
            Lancer la session
          </Button>
        </Box>
      ) : (
        <Paper sx={{ p: 1.5, mb: 1.5, flexShrink: 0 }}>
          <Typography
            variant="h6"
            sx={{
              letterSpacing: 2,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontWeight: 700,
            }}
          >
            {sessionCode}
          </Typography>
        </Paper>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error.message}
        </Alert>
      )}

      {showLiveQuestion && displayedQuestion && (
        <QuestionPlayModeBanner playMode={displayedQuestion.playMode} compact />
      )}

      {showLiveQuestion && (
        <Paper sx={{ p: 1.5, mb: 1.5, flexShrink: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Réponses : {respondentsCount} / {totalConnected}
          </Typography>
          {questionShownAtMs != null && hostTimerDisplaySeconds != null ? (
            <>
              <LinearProgress
                variant="determinate"
                value={
                  timerSecondsForHost > 0
                    ? (hostTimerDisplaySeconds / timerSecondsForHost) * 100
                    : 0
                }
                color="primary"
                sx={{ height: 6, borderRadius: 1, mt: 1 }}
              />
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 0.35, display: 'block' }}
              >
                {Math.ceil(hostTimerDisplaySeconds)} s
                {displayedQuestion?.playMode === 'course'
                  ? ' — mode cours'
                  : ' — mode découverte'}
              </Typography>
            </>
          ) : (
            <Typography variant="caption" color="text.secondary">
              Temps restant : indisponible
            </Typography>
          )}
        </Paper>
      )}

      {showRanking && (
        <SessionHostRankingChart
          title={getRankingTitle()}
          chartData={chartData}
        />
      )}

      {displayedQuestion && !showPerQuestionFeedback && (
        <SessionHostDisplayedQuestion
          displayedQuestion={displayedQuestion}
          isWordCloud={isDisplayedQuestionWordCloud}
          wordCloudWords={wordCloudWords}
        />
      )}

      {displayedQuestion &&
        showPerQuestionFeedback &&
        isDisplayedQuestionWordCloud && (
          <SessionHostDisplayedQuestion
            displayedQuestion={displayedQuestion}
            isWordCloud
            wordCloudWords={wordCloudWords}
            cardTitle="Résultat de la question"
          />
        )}

      {displayedQuestion &&
        showPerQuestionFeedback &&
        !isDisplayedQuestionWordCloud &&
        session && (
          <SessionHostQuestionFeedback
            session={session}
            question={displayedQuestion}
          />
        )}

      {!isFinished && !isWaiting && (
        <Button
          variant="contained"
          onClick={handleNextQuestion}
          disabled={loading}
        >
          {getButtonLabel()}
        </Button>
      )}
      {isFinished && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            alignItems: 'flex-start',
            width: '100%',
          }}
        >
          <Alert severity="success">Le QCM est terminé.</Alert>
          <Button
            variant="outlined"
            size="small"
            onClick={handleDownloadResultsCsv}
            disabled={csvLoading || !session || !quiz}
          >
            {csvLoading
              ? 'Téléchargement…'
              : 'Télécharger le CSV des résultats'}
          </Button>
          {csvError ? (
            <Alert severity="error" sx={{ width: '100%' }}>
              {csvError}
            </Alert>
          ) : null}
        </Box>
      )}
    </Box>
  );
}
