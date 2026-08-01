import React from 'react';
import { Alert } from '@mui/material';
import { isCoursePlayMode, type PlayMode } from '@kahin/qcm-domain';

type QuestionPlayModeBannerProps = {
  playMode?: PlayMode;
  compact?: boolean;
};

/**
 * Bandeau visible dès le lancement d’une question (hôte + participant).
 * Mode cours = alerte (attention / note) ; découverte = info (calme).
 */
export function QuestionPlayModeBanner({
  playMode,
  compact = false,
}: QuestionPlayModeBannerProps) {
  const course = isCoursePlayMode({ playMode });
  return (
    <Alert
      severity={course ? 'warning' : 'info'}
      variant="filled"
      sx={{
        mb: compact ? 1.5 : 2,
        py: compact ? 0.75 : 1,
        alignItems: 'center',
        fontWeight: course ? 700 : 500,
        letterSpacing: course ? '0.01em' : undefined,
        '& .MuiAlert-message': { width: '100%' },
        ...(course
          ? {
              bgcolor: 'warning.dark',
              color: 'warning.contrastText',
              '& .MuiAlert-icon': { color: 'inherit' },
            }
          : {}),
      }}
    >
      {course
        ? 'Mode cours — question notée : 1 point par bonne réponse'
        : 'Mode découverte — s’entraîner : plus vous répondez vite, plus vous gagnez de points'}
    </Alert>
  );
}
