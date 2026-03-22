import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, Paper, Typography, useTheme } from '@mui/material';
import html2canvas from 'html2canvas';
import ReactWordcloud from 'react-wordcloud';
import type { Question } from '@kahin/qcm-domain';
import {
  WORD_CLOUD_HEIGHT_BASE,
  WORD_CLOUD_WIDTH_MAX,
  WORD_CLOUD_WIDTH_MIN,
} from '../sessionHostConstants';

const MemoizedWordcloud = React.memo(ReactWordcloud);

type WordItem = { text: string; value: number };

type SessionHostDisplayedQuestionProps = {
  displayedQuestion: Question;
  isWordCloud: boolean;
  wordCloudWords: WordItem[];
};

export function SessionHostDisplayedQuestion({
  displayedQuestion,
  isWordCloud,
  wordCloudWords,
}: SessionHostDisplayedQuestionProps) {
  const theme = useTheme();
  const wordCloudRef = useRef<HTMLDivElement>(null);
  const wordCloudMeasureRef = useRef<HTMLDivElement>(null);
  const [wordCloudSize, setWordCloudSize] = useState<[number, number]>([
    WORD_CLOUD_WIDTH_MAX,
    WORD_CLOUD_HEIGHT_BASE,
  ]);

  useLayoutEffect(() => {
    if (!isWordCloud) return;
    const el = wordCloudMeasureRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;

    const apply = (widthPx: number) => {
      const width = Math.floor(
        Math.max(WORD_CLOUD_WIDTH_MIN, Math.min(WORD_CLOUD_WIDTH_MAX, widthPx))
      );
      const height = Math.max(
        200,
        Math.round((width / WORD_CLOUD_WIDTH_MAX) * WORD_CLOUD_HEIGHT_BASE)
      );
      setWordCloudSize((prev) =>
        prev[0] === width && prev[1] === height ? prev : [width, height]
      );
    };

    apply(el.getBoundingClientRect().width);
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w != null && w > 0) apply(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [isWordCloud]);

  const wordCloudLayoutWidth = wordCloudSize[0];
  const wordCloudOptions = useMemo(() => {
    const narrow = wordCloudLayoutWidth < 400;
    return {
      colors: [theme.palette.primary.main],
      fontSizes: (narrow ? [12, 36] : [14, 48]) as [number, number],
      fontFamily: theme.typography.fontFamily,
      fontWeight: '600',
      deterministic: true,
      randomSeed: 'kahin-nuage',
      rotations: 1,
      rotationAngles: [0, 0] as [number, number],
      padding: narrow ? 1 : 2,
      transitionDuration: 0,
    };
  }, [
    theme.palette.primary.main,
    theme.typography.fontFamily,
    wordCloudLayoutWidth,
  ]);

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
      const rawLabel = displayedQuestion.label?.trim() ?? '';
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
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="subtitle2" color="text.secondary">
        Question affichée
      </Typography>
      <Typography variant="body1" sx={{ fontWeight: 500, mb: 2 }}>
        {displayedQuestion.label}
      </Typography>
      {isWordCloud ? (
        <>
          <Box ref={wordCloudMeasureRef} sx={{ width: '100%', minWidth: 0 }}>
            <Box
              ref={wordCloudRef}
              sx={{
                minHeight: { xs: 220, sm: 280 },
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                py: 2,
                px: 0,
                maxWidth: '100%',
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
                  size={wordCloudSize}
                />
              )}
            </Box>
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
  );
}
