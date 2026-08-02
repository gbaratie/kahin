import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import ExploreOutlinedIcon from '@mui/icons-material/ExploreOutlined';
import { isCoursePlayMode, type PlayMode } from '@kahin/qcm-domain';

type QuestionPlayModeBannerProps = {
  playMode?: PlayMode;
  compact?: boolean;
};

/**
 * Bandeau visible dès le lancement d’une question (hôte + participant).
 * Mode cours = accent orange (note) ; découverte = accent bleu (entraînement).
 */
export function QuestionPlayModeBanner({
  playMode,
  compact = false,
}: QuestionPlayModeBannerProps) {
  const course = isCoursePlayMode({ playMode });
  const accent = course ? 'warning.main' : 'primary.main';
  const softBg = course
    ? (t: { palette: { mode: string } }) =>
        t.palette.mode === 'dark'
          ? 'rgba(237, 108, 2, 0.16)'
          : 'rgba(237, 108, 2, 0.1)'
    : (t: { palette: { mode: string } }) =>
        t.palette.mode === 'dark'
          ? 'rgba(124, 156, 224, 0.16)'
          : 'rgba(61, 90, 158, 0.1)';

  return (
    <Box
      role="status"
      aria-label={course ? 'Mode cours — question notée' : 'Mode découverte'}
      sx={{
        mb: compact ? 1.5 : 2,
        display: 'flex',
        alignItems: 'stretch',
        borderRadius: 2,
        overflow: 'hidden',
        border: 1,
        borderColor: accent,
        bgcolor: softBg,
      }}
    >
      <Box
        aria-hidden
        sx={{
          width: 6,
          flexShrink: 0,
          bgcolor: accent,
        }}
      />
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.5}
        sx={{
          flex: 1,
          minWidth: 0,
          px: { xs: 1.5, sm: 2 },
          py: compact ? 1 : 1.35,
        }}
      >
        <Box
          sx={{
            width: compact ? 36 : 42,
            height: compact ? 36 : 42,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
            bgcolor: accent,
            color: course ? 'warning.contrastText' : 'primary.contrastText',
          }}
        >
          {course ? (
            <SchoolOutlinedIcon fontSize={compact ? 'small' : 'medium'} />
          ) : (
            <ExploreOutlinedIcon fontSize={compact ? 'small' : 'medium'} />
          )}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: compact
                ? { xs: '0.9rem', sm: '1rem' }
                : { xs: '1rem', sm: '1.1rem' },
              letterSpacing: '0.01em',
              lineHeight: 1.2,
              color: course ? 'warning.dark' : 'primary.main',
            }}
          >
            {course ? 'Mode cours' : 'Mode découverte'}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mt: 0.25,
              lineHeight: 1.35,
              fontSize: compact ? '0.8rem' : '0.875rem',
            }}
          >
            {course
              ? 'Question notée — 1 point par bonne réponse'
              : 'Entraînement — plus vous répondez vite, plus vous gagnez de points'}
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
}
