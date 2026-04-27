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
  const participantCount = chartData.length;
  const maxScore = Math.max(0, ...chartData.map((d) => d.score));
  const isDenseRanking = participantCount > 18;
  const nameCharLimit = participantCount > 24 ? 12 : 16;
  const yAxisWidth = participantCount > 24 ? 104 : 132;
  const barSize = participantCount > 24 ? 12 : participantCount > 14 ? 16 : 22;
  const rowHeight = barSize + (participantCount > 24 ? 8 : 10);
  const chartHeight = Math.max(260, participantCount * rowHeight + 28);
  const maxContainerHeight = 520;
  const showVerticalScroll = chartHeight > maxContainerHeight;
  const scoreLabelMaxLength = `${maxScore} pt${maxScore !== 1 ? 's' : ''}`.length;
  const showScoreLabels = participantCount <= 22;

  // Laisse de la place à droite pour les libellés de score quand ils sont affichés.
  const xAxisMax =
    maxScore <= 0
      ? 1
      : Math.ceil(maxScore * (showScoreLabels ? 1.16 : 1.04));
  const rightMargin = showScoreLabels ? 28 + scoreLabelMaxLength * 7 : 24;

  const enrichedChartData = chartData.map((entry) => ({
    ...entry,
    scoreLabel: `${entry.score} pt${entry.score !== 1 ? 's' : ''}`,
  }));

  return (
    <Box
      sx={{
        width: '100%',
        height: showVerticalScroll ? maxContainerHeight : chartHeight,
        overflowY: showVerticalScroll ? 'auto' : 'hidden',
        overflowX: 'hidden',
      }}
    >
      <Box sx={{ width: '100%', height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={enrichedChartData}
            barCategoryGap={participantCount > 22 ? '20%' : '26%'}
            margin={{ top: 8, right: rightMargin, left: 8, bottom: 8 }}
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
              tickFormatter={(value: string) =>
                value.length > nameCharLimit
                  ? `${value.slice(0, nameCharLimit - 1)}…`
                  : value
              }
              width={yAxisWidth}
              interval={0}
              tick={{
                fill: theme.palette.text.primary,
                fontSize: isDenseRanking ? 12 : 13,
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
              barSize={barSize}
              maxBarSize={barSize}
            >
              {showScoreLabels ? (
                <LabelList
                  dataKey="scoreLabel"
                  position="right"
                  fill={theme.palette.text.primary}
                  style={{
                    fontWeight: 500,
                    fontSize: isDenseRanking ? 11 : 12,
                  }}
                />
              ) : null}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
}
