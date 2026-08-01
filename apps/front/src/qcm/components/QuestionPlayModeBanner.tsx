import React from 'react';
import { Alert } from '@mui/material';
import { isCoursePlayMode, type PlayMode } from '@kahin/qcm-domain';

type QuestionPlayModeBannerProps = {
  playMode?: PlayMode;
  compact?: boolean;
};

/** Bandeau visible dès le lancement d’une question (hôte + participant). */
export function QuestionPlayModeBanner({
  playMode,
  compact = false,
}: QuestionPlayModeBannerProps) {
  const course = isCoursePlayMode({ playMode });
  return (
    <Alert
      severity={course ? 'info' : 'warning'}
      variant="filled"
      sx={{
        mb: compact ? 1.5 : 2,
        py: compact ? 0.75 : 1,
        alignItems: 'center',
        '& .MuiAlert-message': { width: '100%' },
      }}
    >
      {course
        ? 'Mode cours — 1 point par bonne réponse, compté dans la note'
        : 'Mode découverte — plus vous répondez vite, plus vous gagnez de points'}
    </Alert>
  );
}
