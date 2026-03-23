import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Paper, Typography, useTheme } from '@mui/material';
import dynamic from 'next/dynamic';
import {
  isWordCloudQuestion,
  type Answer,
  type Question,
  type Quiz,
} from '@kahin/qcm-domain';
import {
  buildResultsCsvFilename,
  buildSessionResultsCsv,
  computeRanking,
} from '@kahin/qcm-application';
import { useNextQuestion } from '../hooks/useNextQuestion';
import { useSessionStream } from '../hooks/useSessionStream';
import { useSession } from '../hooks/useSession';
import { useQcmDependencies } from '../QcmDependenciesContext';
import { apiDownloadSessionResultsCsv, isApiMode } from '../apiClient';
import { useSessionHostPolling } from '../hooks/useSessionHostPolling';
import { SessionHostRankingChart } from './SessionHostRankingChart';
import { SessionHostDisplayedQuestion } from './SessionHostDisplayedQuestion';
import { withBasePath } from '@/config/site';

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
  const { getQuiz } = useQcmDependencies();
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

  const displayedQuestionRaw: Question | null =
    isInProgress && !showingResult
      ? isApi
        ? session &&
          quiz &&
          session.currentQuestionIndex >= 0 &&
          session.currentQuestionIndex < quiz.questions.length
          ? quiz.questions[session.currentQuestionIndex]
          : null
        : (currentQuestion?.question ?? null)
      : null;
  const isDisplayedQuestionWordCloud =
    isWordCloudQuestion(displayedQuestionRaw);

  useSessionHostPolling({
    sessionId,
    isWaiting,
    refetch,
    lastAnswer,
    isDisplayedQuestionWordCloud,
    isApi,
  });

  const displayedQuestion = displayedQuestionRaw;

  const isFinished = isApi
    ? session?.status === 'finished' || finished
    : finished || sessionFinished;

  const handleNextQuestion = () => {
    nextQuestion(sessionId).then(() => refetch());
  };

  const handleDownloadResultsCsv = () => {
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
  };

  const showRanking =
    session &&
    quiz &&
    (showingResult || isFinished) &&
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
        score: entry.score,
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

  return (
    <Box sx={{ p: 2, maxWidth: { xs: 600, md: 960 }, mx: 'auto' }}>
      <Typography variant="h5" gutterBottom>
        {isWaiting ? 'En attente des participants' : 'Session en cours'}
      </Typography>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { xs: 'flex-start', md: 'center' },
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Utilisez ce code pour rejoindre la session
            </Typography>
            <Typography
              variant="h4"
              sx={{ letterSpacing: 2, fontFamily: 'monospace' }}
            >
              {sessionCode}
            </Typography>
          </Box>

          {isWaiting && (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: { xs: 'center', md: 'flex-end' },
                minWidth: { md: 220 },
              }}
            >
              {joinUrlForQr ? (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1,
                    borderRadius: 2,
                    backgroundColor: qrFrameBg,
                    borderColor: theme.palette.divider,
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    <QRCodeSVG
                      value={joinUrlForQr}
                      size={160}
                      includeMargin={false}
                      bgColor={qrFrameBg}
                      fgColor={theme.palette.text.primary}
                      title="Code QR pour rejoindre la session"
                    />
                  </Box>
                </Paper>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Chargement du QR Code…
                </Typography>
              )}
            </Box>
          )}
        </Box>
      </Paper>

      {isWaiting && (
        <>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Participants connectés
            </Typography>
            {session?.participants.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Aucun participant pour l&apos;instant.
              </Typography>
            ) : (
              <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                {session?.participants.map((p) => (
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
        </>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error.message}
        </Alert>
      )}

      {showRanking && (
        <SessionHostRankingChart
          title={getRankingTitle()}
          chartData={chartData}
        />
      )}

      {displayedQuestion && (
        <SessionHostDisplayedQuestion
          displayedQuestion={displayedQuestion}
          isWordCloud={isDisplayedQuestionWordCloud}
          wordCloudWords={wordCloudWords}
        />
      )}

      {!isFinished ? (
        <Button
          variant="contained"
          onClick={handleNextQuestion}
          disabled={loading}
        >
          {getButtonLabel()}
        </Button>
      ) : (
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
