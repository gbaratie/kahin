import React from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Stack,
  IconButton,
  Paper,
  Checkbox,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import type { Quiz, QuestionType } from '@kahin/qcm-domain';

const DEFAULT_QCM_TIMER = 10;
const DEFAULT_WORD_CLOUD_TIMER = 180;

export type QuestionDraft = {
  type: QuestionType;
  label: string;
  choices: string[];
  correctChoiceIndex?: number;
  timerSeconds?: number;
};

export const initialQuestion: QuestionDraft = {
  type: 'qcm',
  label: '',
  choices: ['', ''],
  timerSeconds: DEFAULT_QCM_TIMER,
};

/** Convertit les questions brouillon en payload pour create/update API */
export function draftToPayload(
  title: string,
  questions: QuestionDraft[]
): {
  title: string;
  questions: Array<{
    label: string;
    type: QuestionType;
    choices: { label: string }[];
    correctChoiceIndex?: number;
    timerSeconds?: number;
  }>;
} {
  return {
    title: title.trim() || 'Sans titre',
    questions: questions
      .filter((q) => q.label.trim())
      .map((q) => {
        const type = q.type ?? 'qcm';
        const defaultTimer =
          type === 'word_cloud' ? DEFAULT_WORD_CLOUD_TIMER : DEFAULT_QCM_TIMER;
        const trimmedChoices =
          type === 'word_cloud'
            ? []
            : q.choices
                .filter((c) => c.trim())
                .map((c) => ({ label: c.trim() }));
        const submittedCorrectIndex =
          type === 'qcm' &&
          q.correctChoiceIndex != null &&
          q.choices[q.correctChoiceIndex]?.trim()
            ? (() => {
                const idx = trimmedChoices.findIndex(
                  (c) => c.label === q.choices[q.correctChoiceIndex!].trim()
                );
                return idx >= 0 ? idx : undefined;
              })()
            : undefined;
        const timerSeconds =
          typeof q.timerSeconds === 'number' && q.timerSeconds >= 1
            ? Math.min(300, Math.floor(q.timerSeconds))
            : defaultTimer;
        return {
          label: q.label.trim(),
          type,
          choices: trimmedChoices,
          correctChoiceIndex: submittedCorrectIndex,
          timerSeconds,
        };
      }),
  };
}

export function quizToDraft(quiz: Quiz): QuestionDraft[] {
  return quiz.questions.map((q) => {
    const type: QuestionType =
      (q as { type?: QuestionType }).type === 'word_cloud' ||
      (q.choices.length === 0 && q.correctChoiceId == null)
        ? 'word_cloud'
        : 'qcm';
    const defaultTimer =
      type === 'word_cloud' ? DEFAULT_WORD_CLOUD_TIMER : DEFAULT_QCM_TIMER;
    const choices =
      type === 'word_cloud'
        ? []
        : q.choices.length > 0
          ? q.choices.map((c) => c.label)
          : ['', ''];
    const correctChoiceIndex =
      type === 'qcm' && q.correctChoiceId != null
        ? q.choices.findIndex((c) => c.id === q.correctChoiceId)
        : undefined;
    return {
      type,
      label: q.label,
      choices,
      correctChoiceIndex:
        correctChoiceIndex !== undefined && correctChoiceIndex >= 0
          ? correctChoiceIndex
          : undefined,
      timerSeconds: q.timerSeconds ?? defaultTimer,
    };
  });
}

export type QcmFormProps = {
  pageTitle?: string;
  title: string;
  onTitleChange: (title: string) => void;
  questions: QuestionDraft[];
  setQuestions: React.Dispatch<React.SetStateAction<QuestionDraft[]>>;
  onSubmit: (e: React.FormEvent) => void | Promise<void>;
  loading?: boolean;
  submitLabel: string;
  secondarySubmitLabel?: string;
  onSecondarySubmit?: (e: React.FormEvent) => void | Promise<void>;
  error?: Error | null;
  cancelButton?: { label: string; onClick: () => void };
};

export default function QcmForm({
  pageTitle,
  title,
  onTitleChange,
  questions,
  setQuestions,
  onSubmit,
  loading = false,
  submitLabel,
  secondarySubmitLabel,
  onSecondarySubmit,
  error,
  cancelButton,
}: QcmFormProps) {
  const addQuestion = () => setQuestions((q) => [...q, { ...initialQuestion }]);
  const removeQuestion = (index: number) =>
    setQuestions((q) => q.filter((_, i) => i !== index));
  const updateQuestion = (index: number, label: string) =>
    setQuestions((q) =>
      q.map((item, i) => (i === index ? { ...item, label } : item))
    );
  const updateChoice = (qIndex: number, cIndex: number, value: string) =>
    setQuestions((q) =>
      q.map((item, i) =>
        i === qIndex
          ? {
              ...item,
              choices: item.choices.map((c, j) => (j === cIndex ? value : c)),
            }
          : item
      )
    );
  const addChoice = (qIndex: number) =>
    setQuestions((q) =>
      q.map((item, i) =>
        i === qIndex ? { ...item, choices: [...item.choices, ''] } : item
      )
    );
  const removeChoice = (qIndex: number, cIndex: number) =>
    setQuestions((q) =>
      q.map((item, i) => {
        if (i !== qIndex) return item;
        const nextChoices = item.choices.filter((_, j) => j !== cIndex);
        let nextCorrect: number | undefined = item.correctChoiceIndex;
        if (nextCorrect !== undefined) {
          if (nextCorrect === cIndex) nextCorrect = undefined;
          else if (nextCorrect > cIndex) nextCorrect = nextCorrect - 1;
        }
        return {
          ...item,
          choices: nextChoices,
          correctChoiceIndex: nextCorrect,
        };
      })
    );
  const setCorrectChoiceIndex = (
    qIndex: number,
    choiceIndex: number | undefined
  ) =>
    setQuestions((q) =>
      q.map((item, i) =>
        i === qIndex ? { ...item, correctChoiceIndex: choiceIndex } : item
      )
    );
  const updateTimerSeconds = (qIndex: number, value: number) =>
    setQuestions((q) =>
      q.map((item, i) =>
        i === qIndex ? { ...item, timerSeconds: value } : item
      )
    );

  const setQuestionType = (qIndex: number, type: QuestionType) =>
    setQuestions((q) =>
      q.map((item, i) => {
        if (i !== qIndex) return item;
        if (type === 'word_cloud') {
          return {
            ...item,
            type: 'word_cloud',
            choices: [],
            correctChoiceIndex: undefined,
            timerSeconds: DEFAULT_WORD_CLOUD_TIMER,
          };
        }
        return {
          ...item,
          type: 'qcm',
          choices: item.choices.length > 0 ? item.choices : ['', ''],
          timerSeconds:
            item.timerSeconds === DEFAULT_WORD_CLOUD_TIMER
              ? DEFAULT_QCM_TIMER
              : (item.timerSeconds ?? DEFAULT_QCM_TIMER),
        };
      })
    );

  return (
    <Box
      sx={{
        py: 4,
        px: { xs: 1.5, sm: 2 },
        maxWidth: { xs: '100%', sm: 640, md: 960 },
        mx: 'auto',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {pageTitle && (
        <Typography variant="h4" gutterBottom>
          {pageTitle}
        </Typography>
      )}
      <form onSubmit={onSubmit}>
        <TextField
          fullWidth
          label="Titre du QCM"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          sx={{ mb: 3 }}
        />
        {questions.map((q, qIndex) => {
          const isWordCloud = q.type === 'word_cloud';
          const defaultTimer = isWordCloud
            ? DEFAULT_WORD_CLOUD_TIMER
            : DEFAULT_QCM_TIMER;
          return (
            <Paper
              key={qIndex}
              sx={{ p: { xs: 1.5, sm: 2 }, mb: 2, overflow: 'hidden' }}
            >
              <Stack spacing={1.25} sx={{ mb: 1 }}>
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ minWidth: 0 }}
                >
                  <Typography variant="subtitle2" sx={{ minWidth: 0, pr: 1 }}>
                    Question {qIndex + 1}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => removeQuestion(qIndex)}
                    disabled={questions.length <= 1}
                    aria-label="Supprimer la question"
                    sx={{
                      flexShrink: 0,
                      color: 'text.secondary',
                      opacity: 0.7,
                      '&:hover': { opacity: 1, color: 'text.primary' },
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={0.5}
                  flexWrap="wrap"
                  useFlexGap
                  sx={{ minWidth: 0 }}
                >
                  <FormControl
                    size="small"
                    sx={{
                      minWidth: { xs: 140, sm: 160 },
                      flex: { xs: '1 1 140px', sm: '0 0 auto' },
                      maxWidth: '100%',
                    }}
                  >
                    <InputLabel id={`question-type-${qIndex}`}>Type</InputLabel>
                    <Select
                      labelId={`question-type-${qIndex}`}
                      value={q.type ?? 'qcm'}
                      label="Type"
                      onChange={(e) =>
                        setQuestionType(qIndex, e.target.value as QuestionType)
                      }
                    >
                      <MenuItem value="qcm">QCM</MenuItem>
                      <MenuItem value="word_cloud">Nuage de mots</MenuItem>
                    </Select>
                  </FormControl>
                  <Tooltip title="Durée en secondes">
                    <Stack
                      direction="row"
                      alignItems="center"
                      sx={{
                        flexShrink: 0,
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                        bgcolor: 'action.hover',
                        pl: 0.5,
                        pr: 0.25,
                        py: 0.125,
                      }}
                    >
                      <AccessTimeIcon
                        sx={{
                          color: 'text.secondary',
                          mr: 0.375,
                          fontSize: 14,
                        }}
                      />
                      <TextField
                        type="number"
                        size="small"
                        value={q.timerSeconds ?? defaultTimer}
                        onChange={(e) => {
                          const v = parseInt(e.target.value, 10);
                          if (!Number.isNaN(v) && v >= 1)
                            updateTimerSeconds(qIndex, Math.min(300, v));
                        }}
                        inputProps={{
                          min: 1,
                          max: 180,
                          step: 1,
                          style: { textAlign: 'center', width: 30 },
                          'aria-label': 'Durée en secondes',
                        }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            '& fieldset': { border: 'none' },
                            backgroundColor: 'transparent',
                            minHeight: 24,
                            '& .MuiInput-input': {
                              fontSize: '0.7rem',
                              py: 0.125,
                            },
                          },
                          '& input[type=number]': {
                            MozAppearance: 'textfield',
                          },
                          '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button':
                            { WebkitAppearance: 'none', margin: 0 },
                        }}
                        variant="outlined"
                      />
                      <Stack direction="column" sx={{ ml: 0 }}>
                        <IconButton
                          size="small"
                          onClick={() =>
                            updateTimerSeconds(
                              qIndex,
                              Math.min(
                                300,
                                (q.timerSeconds ?? defaultTimer) + 1
                              )
                            )
                          }
                          disabled={(q.timerSeconds ?? defaultTimer) >= 300}
                          aria-label="Augmenter la durée"
                          sx={{ py: 0, minWidth: 18, height: 12 }}
                        >
                          <KeyboardArrowUpIcon sx={{ fontSize: 12 }} />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() =>
                            updateTimerSeconds(
                              qIndex,
                              Math.max(1, (q.timerSeconds ?? defaultTimer) - 1)
                            )
                          }
                          disabled={(q.timerSeconds ?? defaultTimer) <= 1}
                          aria-label="Diminuer la durée"
                          sx={{ py: 0, minWidth: 18, height: 12 }}
                        >
                          <KeyboardArrowDownIcon sx={{ fontSize: 12 }} />
                        </IconButton>
                      </Stack>
                    </Stack>
                  </Tooltip>
                </Stack>
              </Stack>
              <TextField
                fullWidth
                label="Énoncé"
                value={q.label}
                onChange={(e) => updateQuestion(qIndex, e.target.value)}
                sx={{ mb: 2 }}
              />
              {!isWordCloud &&
                q.choices.map((choice, cIndex) => (
                  <Stack
                    key={cIndex}
                    direction="row"
                    alignItems="flex-start"
                    spacing={0.75}
                    sx={{ mb: 1, minWidth: 0 }}
                  >
                    <TextField
                      size="small"
                      label={`Choix ${cIndex + 1}`}
                      value={choice}
                      onChange={(e) =>
                        updateChoice(qIndex, cIndex, e.target.value)
                      }
                      sx={{
                        flex: '1 1 0%',
                        minWidth: 0,
                        '& .MuiOutlinedInput-root': { alignItems: 'center' },
                      }}
                    />
                    <Stack
                      direction="row"
                      alignItems="center"
                      sx={{ flexShrink: 0, pt: 0.5 }}
                    >
                      <Tooltip title="Bonne réponse">
                        <Checkbox
                          size="small"
                          icon={<CheckBoxOutlineBlankIcon />}
                          checkedIcon={<CheckBoxIcon color="success" />}
                          checked={q.correctChoiceIndex === cIndex}
                          onChange={() =>
                            setCorrectChoiceIndex(
                              qIndex,
                              q.correctChoiceIndex === cIndex
                                ? undefined
                                : cIndex
                            )
                          }
                          sx={{
                            color: 'action.disabled',
                            '&.Mui-checked': { color: 'success.main' },
                            p: 0.5,
                            borderRadius: 0,
                            '& .MuiSvgIcon-root': { borderRadius: 0 },
                          }}
                        />
                      </Tooltip>
                      <IconButton
                        size="small"
                        onClick={() => removeChoice(qIndex, cIndex)}
                        disabled={q.choices.length <= 2}
                        aria-label="Supprimer le choix"
                        sx={{ flexShrink: 0 }}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Stack>
                ))}
              {!isWordCloud && (
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => addChoice(qIndex)}
                >
                  Ajouter un choix
                </Button>
              )}
            </Paper>
          );
        })}
        <Stack spacing={2} sx={{ mt: 2 }}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={addQuestion}
          >
            Ajouter une question
          </Button>
          <Stack direction="row" spacing={2} flexWrap="wrap">
            {secondarySubmitLabel && onSecondarySubmit ? (
              <>
                <Button type="submit" variant="outlined" disabled={loading}>
                  {submitLabel}
                </Button>
                <Button
                  type="button"
                  variant="contained"
                  disabled={loading}
                  onClick={(e) => {
                    e.preventDefault();
                    void onSecondarySubmit(e);
                  }}
                >
                  {secondarySubmitLabel}
                </Button>
              </>
            ) : (
              <Button type="submit" variant="contained" disabled={loading}>
                {submitLabel}
              </Button>
            )}
            {cancelButton && (
              <Button variant="text" onClick={cancelButton.onClick}>
                {cancelButton.label}
              </Button>
            )}
          </Stack>
        </Stack>
      </form>
      {error && (
        <Typography color="error" sx={{ mt: 2 }}>
          {error.message}
        </Typography>
      )}
    </Box>
  );
}
