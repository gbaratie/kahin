import React from 'react';
import { Box, Paper, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
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

type SessionHostRankingChartProps = {
  title: string;
  chartData: Array<{ name: string; score: number }>;
};

export function SessionHostRankingChart({
  title,
  chartData,
}: SessionHostRankingChartProps) {
  const theme = useTheme();
  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        {title}
      </Typography>
      {chartData.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          En attente des premières réponses.
        </Typography>
      ) : (
        <SessionHostBarChartBody theme={theme} chartData={chartData} />
      )}
    </Paper>
  );
}

function SessionHostBarChartBody({
  theme,
  chartData,
}: {
  theme: Theme;
  chartData: Array<{ name: string; score: number }>;
}) {
  const maxScore = Math.max(0, ...chartData.map((d) => d.score));
  /** Laisse de la place à droite des barres pour les libellés (évite le débordement du meilleur score). */
  const xAxisMax = maxScore <= 0 ? 1 : Math.ceil(maxScore * 1.18);

  return (
    <Box sx={{ width: '100%', height: 320 }}>
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
          <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
          <XAxis
            type="number"
            domain={[0, xAxisMax]}
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
              backgroundColor: alpha(theme.palette.background.paper, 0.98),
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: theme.shape.borderRadius,
              boxShadow: theme.shadows[8],
            }}
            labelStyle={{
              color: theme.palette.text.primary,
              fontWeight: 600,
              marginBottom: 4,
            }}
            itemStyle={{
              color: theme.palette.primary.main,
              fontWeight: 600,
            }}
            cursor={false}
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
  );
}
