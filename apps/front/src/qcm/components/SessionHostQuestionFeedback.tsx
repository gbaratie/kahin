import React, { useMemo } from 'react';
import { Box, Paper, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { Question, Session } from '@kahin/qcm-domain';
import { computeChoiceCounts } from '@kahin/qcm-application';
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
      <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600 }}>
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

export function SessionHostQuestionFeedback({
  session,
  question,
}: SessionHostQuestionFeedbackProps) {
  const theme = useTheme();
  const chartData = useMemo(() => {
    const rows = computeChoiceCounts(session, question);
    return rows.map((r) => ({
      name:
        r.label.length > 42 ? `${r.label.slice(0, 40)}…` : r.label,
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
