import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Box, Typography, Button, Paper, Alert, useTheme } from '@mui/material';
import html2canvas from 'html2canvas';
import ReactWordcloud from 'react-wordcloud';

/** Nuage mémorisé pour éviter les re-renders (et le clignotement) quand les props sont inchangées. */
const MemoizedWordcloud = React.memo(ReactWordcloud);
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import type { Answer, Question, Quiz, Session } from '@kahin/qcm-domain';
import { useNextQuestion } from '../hooks/useNextQuestion';
import { useSessionStream } from '../hooks/useSessionStream';
import { useSession } from '../hooks/useSession';
import { useQcmDependencies } from '../QcmDependenciesContext';
import { isApiMode } from '../apiClient';
import { computeRanking } from '../utils/ranking';

const PARTICIPANTS_POLL_INTERVAL_MS = 1500;
/** Polling moins fréquent pendant un nuage de mots pour limiter le clignotement. */
const WORD_CLOUD_POLL_INTERVAL_MS = 4000;
const WORD_CLOUD_SIZE: [number, number] = [560, 260];

type SessionHostViewProps = { sessionId: string; sessionCode: string };

export function SessionHostView({
  sessionId,
  sessionCode,
}: SessionHostViewProps) {
  const theme = useTheme();
  const isApi = isApiMode();
  const { session, refetch } = useSession(sessionId);
  const { getQuiz } = useQcmDependencies();
  const [quiz, setQuiz] = useState<Quiz | null>(null);

  useEffect(() => {
    if (!session?.quizId) return;
    getQuiz.execute(session.quizId).then(setQuiz);
  }, [session?.quizId, getQuiz]);

  const { execute: nextQuestion, loading, error, finished } = useNextQuestion();
  const { currentQuestion, sessionFinished, lastAnswer } = useSessionStream(
    isApi ? null : sessionId
  );
  const wordCloudRef = useRef<HTMLDivElement>(null);

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
    (displayedQuestionRaw as Question)?.type === 'word_cloud';

  // En phase "attente des participants", rafraîchir la session régulièrement pour afficher les nouveaux participants
  useEffect(() => {
    if (!sessionId || !isWaiting) return;
    const interval = setInterval(
      () => refetch(),
      PARTICIPANTS_POLL_INTERVAL_MS
    );
    return () => clearInterval(interval);
  }, [sessionId, isWaiting, refetch]);

  // Quand une réponse est soumise (ex. mot nuage), rafraîchir la session pour mettre à jour le nuage (mode local)
  useEffect(() => {
    if (!sessionId || !lastAnswer || !isDisplayedQuestionWordCloud) return;
    refetch();
  }, [sessionId, lastAnswer, isDisplayedQuestionWordCloud, refetch]);

  // En mode API, poller la session pendant une question nuage (intervalle plus long pour limiter le clignotement)
  useEffect(() => {
    if (!isApi || !sessionId || !isDisplayedQuestionWordCloud) return;
    const interval = setInterval(() => refetch(), WORD_CLOUD_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isApi, sessionId, isDisplayedQuestionWordCloud, refetch]);

  const displayedQuestion = displayedQuestionRaw;

  const isFinished = isApi
    ? session?.status === 'finished' || finished
    : finished || sessionFinished;

  const handleNextQuestion = () => {
    nextQuestion(sessionId).then(() => refetch());
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

  // Agrégation des mots pour la question nuage en cours
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

  // Signature pour que wordCloudWords ne change que quand les (mot, count) changent vraiment (évite le clignotement au refetch)
  const wordCloudSignature = wordCloudCounts
    .map(({ word, count }) => `${word}:${count}`)
    .join('|');

  const wordCloudWords = useMemo(
    () =>
      wordCloudCounts.map(({ word, count }) => ({ text: word, value: count })),
    [wordCloudSignature]
  );

  const wordCloudOptions = useMemo(
    () => ({
      colors: [theme.palette.primary.main],
      fontSizes: [14, 48] as [number, number],
      fontFamily: theme.typography.fontFamily,
      fontWeight: '600',
      deterministic: true,
      randomSeed: 'kahin-nuage',
      rotations: 1,
      rotationAngles: [0, 0] as [number, number],
      padding: 2,
      transitionDuration: 0,
    }),
    [theme.palette.primary.main, theme.typography.fontFamily]
  );

  const handleDownloadWordCloudImage = async () => {
    if (!wordCloudRef.current) return;
    try {
      const canvas = await html2canvas(wordCloudRef.current, {
        backgroundColor: theme.palette.background.paper,
        scale: 2,
      });
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png')
      );
      if (!blob) return;
      const now = new Date();
      const dateStr =
        now.getFullYear() +
        String(now.getMonth() + 1).padStart(2, '0') +
        String(now.getDate()).padStart(2, '0');
      const rawLabel = displayedQuestion?.label?.trim() ?? '';
      const safeLabel =
        rawLabel
          .replace(/[\s/\\:*?"<>|]+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '') || 'nuage-mots';
      const filename = `${dateStr}${safeLabel}.png`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  };

  return (
    <Box sx={{ p: 2, maxWidth: { xs: 600, md: 960 }, mx: 'auto' }}>
      <Typography variant="h5" gutterBottom>
        {isWaiting ? 'En attente des participants' : 'Session en cours'}
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

      {isWaiting && (
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
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error.message}
        </Alert>
      )}

      {showRanking && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            {getRankingTitle()}
          </Typography>
          {ranking.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              En attente des premières réponses.
            </Typography>
          ) : (
            <Box sx={{ width: '100%', height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={chartData}
                  margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={theme.palette.divider}
                  />
                  <XAxis
                    type="number"
                    tick={{ fill: theme.palette.text.secondary }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={140}
                    tick={{
                      fill: theme.palette.text.primary,
                      fontSize: 14,
                      fontWeight: 600,
                    }}
                  />
                  <Tooltip
                    formatter={(value: number) => [
                      `${value} pt${value !== 1 ? 's' : ''}`,
                      'Score',
                    ]}
                    labelFormatter={(label) => `Participant : ${label}`}
                    contentStyle={{
                      backgroundColor: theme.palette.background.paper,
                      border: `1px solid ${theme.palette.divider}`,
                    }}
                  />
                  <Bar
                    dataKey="score"
                    fill={theme.palette.primary.main}
                    radius={[0, 4, 4, 0]}
                  >
                    <LabelList
                      dataKey="score"
                      position="right"
                      formatter={(value: number) =>
                        `${value} pt${value !== 1 ? 's' : ''}`
                      }
                      fill={theme.palette.text.primary}
                      style={{ fontWeight: 400 }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
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
          {isDisplayedQuestionWordCloud ? (
            <>
              <Box
                ref={wordCloudRef}
                sx={{
                  minHeight: 280,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  py: 2,
                  px: 1,
                }}
              >
                {wordCloudWords.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Aucun mot pour l&apos;instant.
                  </Typography>
                ) : (
                  <MemoizedWordcloud
                    words={wordCloudWords}
                    options={wordCloudOptions}
                    size={WORD_CLOUD_SIZE}
                  />
                )}
              </Box>
              <Button
                variant="outlined"
                size="small"
                onClick={() => void handleDownloadWordCloudImage()}
                disabled={wordCloudWords.length === 0}
              >
                Télécharger l&apos;image du nuage
              </Button>
            </>
          ) : (
            displayedQuestion.choices?.length > 0 && (
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
            )
          )}
        </Paper>
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
        <Alert severity="success">Le QCM est terminé.</Alert>
      )}
    </Box>
  );
}
