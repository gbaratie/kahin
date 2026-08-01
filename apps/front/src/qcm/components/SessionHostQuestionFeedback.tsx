import React, { useMemo } from 'react';
import { Box, Paper, Typography, useTheme, Stack, Alert } from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  defaultClosestScoringRange,
  isClosestQuestion,
  isCoursePlayMode,
  type Question,
  type Session,
} from '@kahin/qcm-domain';
import {
  computeChoiceCounts,
  coursePointsForAnswer,
  pointsForClosestAnswer,
} from '@kahin/qcm-application';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  Cell,
} from 'recharts';
import type { TooltipProps } from 'recharts';

function QuestionFeedbackTooltip({
  active,
  payload,
}: TooltipProps<number, string>) {
  const theme = useTheme();
  if (!active || !payload?.length) return null;
  const row = payload[0];
  const value = row.value ?? 0;
  const barColor = row.color ?? theme.palette.primary.main;
  const data = row.payload as {
    fullLabel?: string;
    name: string;
  };
  const fullLabel = data.fullLabel ?? data.name;

  return (
    <Box
      sx={{
        px: 1.5,
        py: 1,
        borderRadius: 1,
        border: `1px solid ${theme.palette.divider}`,
        bgcolor: alpha(theme.palette.background.paper, 0.98),
        boxShadow: theme.shadows[8],
      }}
    >
      <Typography
        variant="body2"
        sx={{ color: 'text.primary', fontWeight: 600 }}
      >
        {fullLabel}
      </Typography>
      <Typography
        variant="body2"
        sx={{ color: barColor, fontWeight: 600, mt: 0.25 }}
      >
        {value} réponse{value !== 1 ? 's' : ''}
      </Typography>
    </Box>
  );
}

type SessionHostQuestionFeedbackProps = {
  session: Session;
  question: Question;
};

function formatNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

function ClosestQuestionFeedback({
  session,
  question,
}: SessionHostQuestionFeedbackProps) {
  const theme = useTheme();

  const rows = useMemo(() => {
    const nameById = new Map(session.participants.map((p) => [p.id, p.name]));
    const expected =
      typeof question.expectedNumber === 'number'
        ? question.expectedNumber
        : null;
    const list: Array<{
      participantId: string;
      name: string;
      value: number;
      distance: number;
      points: number;
    }> = [];
    for (const a of session.answers) {
      if (a.questionId !== question.id) continue;
      if (typeof a.numberValue !== 'number' || !Number.isFinite(a.numberValue)) {
        continue;
      }
      const distance =
        expected == null ? 0 : Math.abs(a.numberValue - expected);
      const gamificationPts = pointsForClosestAnswer(question, a.numberValue);
      const coursePts = coursePointsForAnswer(question, a).points;
      list.push({
        participantId: a.participantId,
        name: nameById.get(a.participantId) ?? 'Participant',
        value: a.numberValue,
        distance,
        points: isCoursePlayMode(question) ? coursePts : gamificationPts,
      });
    }
    list.sort((a, b) => a.distance - b.distance || b.points - a.points);
    return list;
  }, [session, question]);

  const range =
    typeof question.scoringRange === 'number' && question.scoringRange > 0
      ? question.scoringRange
      : typeof question.expectedNumber === 'number'
        ? defaultClosestScoringRange(question.expectedNumber)
        : null;

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        Résultat de la question
        {isCoursePlayMode(question) ? ' (cours — 1 pt / bonne réponse)' : ''}
      </Typography>
      <Typography variant="body1" sx={{ fontWeight: 500, mb: 2 }}>
        {question.label}
      </Typography>

      <Alert severity="success" sx={{ mb: 2 }}>
        Réponse attendue :{' '}
        <strong>
          {typeof question.expectedNumber === 'number'
            ? formatNumber(question.expectedNumber)
            : '—'}
        </strong>
        {range != null && !isCoursePlayMode(question) ? (
          <Typography component="span" variant="body2" sx={{ ml: 1 }}>
            (0 pt à ±{formatNumber(range)})
          </Typography>
        ) : null}
      </Alert>

      {rows.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Aucune réponse numérique.
        </Typography>
      ) : (
        <Stack spacing={1}>
          {rows.map((row, index) => (
            <Box
              key={row.participantId}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 1,
                alignItems: 'baseline',
                py: 0.75,
                px: 1,
                borderRadius: 1,
                bgcolor:
                  index === 0
                    ? alpha(theme.palette.success.main, 0.12)
                    : 'transparent',
                border: `1px solid ${
                  index === 0
                    ? theme.palette.success.main
                    : theme.palette.divider
                }`,
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {index + 1}. {row.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formatNumber(row.value)}
                {typeof question.expectedNumber === 'number' ? (
                  <>
                    {' '}
                    (écart {formatNumber(row.distance)}) — {row.points} pt
                    {row.points !== 1 ? 's' : ''}
                  </>
                ) : null}
              </Typography>
            </Box>
          ))}
        </Stack>
      )}
    </Paper>
  );
}

function QcmQuestionFeedback({
  session,
  question,
}: SessionHostQuestionFeedbackProps) {
  const theme = useTheme();
  const chartData = useMemo(() => {
    const rows = computeChoiceCounts(session, question);
    return rows.map((r) => ({
      name: r.label.length > 42 ? `${r.label.slice(0, 40)}…` : r.label,
      fullLabel: r.label,
      count: r.count,
      choiceId: r.choiceId,
      isCorrect: r.choiceId === question.correctChoiceId,
    }));
  }, [session, question]);

  const maxCount = Math.max(0, ...chartData.map((r) => r.count));
  const xAxisMax = maxCount <= 0 ? 1 : Math.ceil(maxCount * 1.18);

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        Résultat de la question
        {isCoursePlayMode(question) ? ' (cours — 1 pt / bonne réponse)' : ''}
      </Typography>
      <Typography variant="body1" sx={{ fontWeight: 500, mb: 2 }}>
        {question.label}
      </Typography>

      <Box component="ul" sx={{ m: 0, pl: 2.5, mb: 2 }}>
        {(question.choices ?? []).map((choice) => {
          const isCorrect = choice.id === question.correctChoiceId;
          return (
            <Box
              component="li"
              key={choice.id}
              sx={{
                mb: 0.75,
                py: 0.5,
                px: 1,
                borderRadius: 1,
                border: isCorrect
                  ? `2px solid ${theme.palette.success.main}`
                  : '1px solid transparent',
                bgcolor: isCorrect
                  ? alpha(theme.palette.success.main, 0.15)
                  : 'transparent',
              }}
            >
              <Typography variant="body2" component="span">
                {choice.label}
                {isCorrect ? (
                  <Typography
                    component="span"
                    variant="caption"
                    sx={{ ml: 1, color: 'success.main', fontWeight: 600 }}
                  >
                    (bonne réponse)
                  </Typography>
                ) : null}
              </Typography>
            </Box>
          );
        })}
      </Box>

      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        Répartition des réponses
      </Typography>
      {chartData.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Aucun choix à afficher.
        </Typography>
      ) : (
        <Box sx={{ width: '100%', height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={chartData}
              margin={{ top: 8, right: 48, left: 8, bottom: 8 }}
              style={{
                backgroundColor: theme.palette.background.paper,
                borderRadius: theme.shape.borderRadius,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={theme.palette.divider}
              />
              <XAxis
                type="number"
                domain={[0, xAxisMax]}
                allowDecimals={false}
                tick={{ fill: theme.palette.text.secondary }}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={140}
                tick={{
                  fill: theme.palette.text.primary,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              />
              <Tooltip content={<QuestionFeedbackTooltip />} cursor={false} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                <LabelList
                  dataKey="count"
                  position="right"
                  formatter={(value: number) => String(value)}
                  fill={theme.palette.text.primary}
                  style={{ fontWeight: 400 }}
                />
                {chartData.map((entry) => (
                  <Cell
                    key={entry.choiceId}
                    fill={
                      entry.isCorrect
                        ? theme.palette.success.main
                        : theme.palette.primary.main
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Box>
      )}
    </Paper>
  );
}

export function SessionHostQuestionFeedback({
  session,
  question,
}: SessionHostQuestionFeedbackProps) {
  if (isClosestQuestion(question)) {
    return (
      <ClosestQuestionFeedback session={session} question={question} />
    );
  }
  return <QcmQuestionFeedback session={session} question={question} />;
}
