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
              margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={theme.palette.divider}
              />
              <XAxis
                type="number"
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
              <Tooltip
                formatter={(value: number) => [
                  `${value} réponse${value !== 1 ? 's' : ''}`,
                  'Réponses',
                ]}
                labelFormatter={(_, payload) => {
                  const p = payload?.[0]?.payload as
                    | { fullLabel?: string }
                    | undefined;
                  return p?.fullLabel ?? '';
                }}
                contentStyle={{
                  backgroundColor: theme.palette.background.paper,
                  border: `1px solid ${theme.palette.divider}`,
                }}
              />
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
