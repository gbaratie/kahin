import React, { useEffect, useMemo, useState } from 'react';
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
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Divider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useMediaQuery,
  InputAdornment,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import SearchIcon from '@mui/icons-material/Search';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Quiz, Question, QuestionType, PlayMode } from '@kahin/qcm-domain';
import { parsePlayMode } from '@kahin/qcm-domain';
import { layout } from '@/config/layout';
import {
  apiListQuestions,
  apiListQuizzes,
  apiGetQuiz,
  apiListThemes,
  isApiMode,
  type QuestionSummaryDto,
  type ThemeDto,
  type QuizSummary,
} from '@/qcm/apiClient';
import { getErrorMessage } from '@kahin/shared-utils';

const DEFAULT_QCM_TIMER = 10;
const DEFAULT_WORD_CLOUD_TIMER = 180;
const DEFAULT_CLOSEST_TIMER = 15;

export type QuestionDraft = {
  /** Identité banque — préservée pour le partage N:M entre QCM. */
  id?: string;
  type: QuestionType;
  label: string;
  choices: string[];
  correctChoiceIndex?: number;
  expectedNumber?: number | '';
  scoringRange?: number | '';
  timerSeconds?: number;
  themeId?: string | null;
  playMode?: PlayMode;
  /** Clé stable pour le drag-and-drop (même sans id serveur). */
  clientKey: string;
};

function newClientKey(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export const initialQuestion = (): QuestionDraft => ({
  type: 'qcm',
  label: '',
  choices: ['', ''],
  timerSeconds: DEFAULT_QCM_TIMER,
  playMode: 'discovery',
  clientKey: newClientKey(),
});

/** Convertit les questions brouillon en payload pour create/update API */
export function draftToPayload(
  title: string,
  questions: QuestionDraft[],
  coefficient?: number
): {
  title: string;
  coefficient?: number;
  questions: Array<{
    id?: string;
    label: string;
    type: QuestionType;
    choices: { label: string }[];
    correctChoiceIndex?: number;
    expectedNumber?: number;
    scoringRange?: number;
    timerSeconds?: number;
    themeId?: string | null;
    playMode?: PlayMode;
  }>;
} {
  return {
    title: title.trim() || 'Sans titre',
    coefficient:
      typeof coefficient === 'number' && coefficient > 0 ? coefficient : 1,
    questions: questions
      .filter((q) => q.label.trim())
      .map((q) => {
        const type = q.type ?? 'qcm';
        const defaultTimer =
          type === 'word_cloud'
            ? DEFAULT_WORD_CLOUD_TIMER
            : type === 'closest'
              ? DEFAULT_CLOSEST_TIMER
              : DEFAULT_QCM_TIMER;
        const trimmedChoices =
          type === 'word_cloud' || type === 'closest'
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
        const expectedNumber =
          type === 'closest' &&
          typeof q.expectedNumber === 'number' &&
          Number.isFinite(q.expectedNumber)
            ? q.expectedNumber
            : undefined;
        const scoringRange =
          type === 'closest' &&
          typeof q.scoringRange === 'number' &&
          q.scoringRange > 0
            ? q.scoringRange
            : undefined;
        return {
          id: q.id,
          label: q.label.trim(),
          type,
          choices: trimmedChoices,
          correctChoiceIndex: submittedCorrectIndex,
          expectedNumber,
          scoringRange,
          timerSeconds,
          themeId: q.themeId,
          playMode: parsePlayMode(q.playMode),
        };
      }),
  };
}

export function quizToDraft(quiz: Quiz): QuestionDraft[] {
  return quiz.questions.map((q) => {
    const rawType = (q as { type?: QuestionType }).type;
    const type: QuestionType =
      rawType === 'word_cloud' ||
      (rawType == null && q.choices.length === 0 && q.correctChoiceId == null)
        ? 'word_cloud'
        : rawType === 'closest'
          ? 'closest'
          : 'qcm';
    const defaultTimer =
      type === 'word_cloud'
        ? DEFAULT_WORD_CLOUD_TIMER
        : type === 'closest'
          ? DEFAULT_CLOSEST_TIMER
          : DEFAULT_QCM_TIMER;
    const choices =
      type === 'word_cloud' || type === 'closest'
        ? []
        : q.choices.length > 0
          ? q.choices.map((c) => c.label)
          : ['', ''];
    const correctChoiceIndex =
      type === 'qcm' && q.correctChoiceId != null
        ? q.choices.findIndex((c) => c.id === q.correctChoiceId)
        : undefined;
    return {
      id: q.id,
      type,
      label: q.label,
      choices,
      correctChoiceIndex:
        correctChoiceIndex !== undefined && correctChoiceIndex >= 0
          ? correctChoiceIndex
          : undefined,
      expectedNumber:
        type === 'closest' && typeof q.expectedNumber === 'number'
          ? q.expectedNumber
          : type === 'closest'
            ? ''
            : undefined,
      scoringRange:
        type === 'closest' && typeof q.scoringRange === 'number'
          ? q.scoringRange
          : type === 'closest'
            ? ''
            : undefined,
      timerSeconds: q.timerSeconds ?? defaultTimer,
      themeId: q.themeId ?? null,
      playMode: parsePlayMode(q.playMode),
      clientKey: q.id || newClientKey(),
    };
  });
}

export function questionToDraft(q: Question): QuestionDraft {
  return quizToDraft({ id: '', title: '', questions: [q] })[0];
}

export type QcmFormProps = {
  pageTitle?: string;
  title: string;
  onTitleChange: (title: string) => void;
  coefficient?: number;
  onCoefficientChange?: (coefficient: number) => void;
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

function SortableQuestionCard({
  q,
  qIndex,
  questionsCount,
  onRemove,
  onUpdateLabel,
  onUpdateChoice,
  onAddChoice,
  onRemoveChoice,
  onSetCorrect,
  onUpdateTimer,
  onSetType,
  onUpdateExpectedNumber,
  onUpdateScoringRange,
  onSetPlayMode,
}: {
  q: QuestionDraft;
  qIndex: number;
  questionsCount: number;
  onRemove: () => void;
  onUpdateLabel: (label: string) => void;
  onUpdateChoice: (cIndex: number, value: string) => void;
  onAddChoice: () => void;
  onRemoveChoice: (cIndex: number) => void;
  onSetCorrect: (choiceIndex: number | undefined) => void;
  onUpdateTimer: (value: number) => void;
  onSetType: (type: QuestionType) => void;
  onUpdateExpectedNumber: (value: number | '') => void;
  onUpdateScoringRange: (value: number | '') => void;
  onSetPlayMode: (mode: PlayMode) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: q.clientKey });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
    zIndex: isDragging ? 2 : 0,
  };

  const isWordCloud = q.type === 'word_cloud';
  const isClosest = q.type === 'closest';
  const isCourse = (q.playMode ?? 'discovery') === 'course';
  const defaultTimer = isWordCloud
    ? DEFAULT_WORD_CLOUD_TIMER
    : isClosest
      ? DEFAULT_CLOSEST_TIMER
      : DEFAULT_QCM_TIMER;
  const accent = isCourse ? 'warning.main' : 'primary.main';

  return (
    <Paper
      ref={setNodeRef}
      style={style}
      variant="outlined"
      sx={{
        mb: 2.5,
        overflow: 'hidden',
        borderColor: isDragging ? 'primary.main' : 'divider',
        borderWidth: isDragging ? 2 : 1,
        touchAction: 'manipulation',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* En-tête */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: { xs: 1.25, sm: 1.75 },
          py: 1.1,
          bgcolor: (t) =>
            t.palette.mode === 'dark'
              ? 'rgba(255,255,255,0.03)'
              : 'rgba(61,90,158,0.04)',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Box
          aria-hidden
          sx={{
            width: 4,
            alignSelf: 'stretch',
            borderRadius: 1,
            bgcolor: accent,
            flexShrink: 0,
            my: -0.25,
          }}
        />
        <IconButton
          size="small"
          aria-label="Réordonner la question"
          sx={{
            cursor: 'grab',
            touchAction: 'none',
            color: 'text.secondary',
            flexShrink: 0,
          }}
          {...attributes}
          {...listeners}
        >
          <DragIndicatorIcon fontSize="small" />
        </IconButton>
        <Box
          sx={{
            minWidth: 28,
            height: 28,
            px: 0.75,
            borderRadius: 1,
            display: 'grid',
            placeItems: 'center',
            bgcolor: accent,
            color: isCourse ? 'warning.contrastText' : 'primary.contrastText',
            fontWeight: 800,
            fontSize: '0.8rem',
            flexShrink: 0,
          }}
        >
          {qIndex + 1}
        </Box>
        <Typography
          variant="subtitle2"
          sx={{ flex: 1, minWidth: 0, fontWeight: 700 }}
        >
          Question {qIndex + 1}
          {q.id ? (
            <Typography
              component="span"
              variant="caption"
              color="text.secondary"
              sx={{ ml: 1, fontWeight: 500 }}
            >
              banque
            </Typography>
          ) : null}
        </Typography>
        <Tooltip title="Retirer du QCM (reste dans la banque si déjà enregistrée)">
          <span>
            <IconButton
              size="small"
              onClick={onRemove}
              disabled={questionsCount <= 1}
              aria-label="Retirer la question du QCM"
              sx={{
                flexShrink: 0,
                color: 'text.secondary',
                '&:hover': { color: 'error.main' },
              }}
            >
              <RemoveCircleOutlineIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
        {/* Type / Mode / Timer */}
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          flexWrap="wrap"
          useFlexGap
          sx={{ mb: 2 }}
        >
          <FormControl
            size="small"
            sx={{
              minWidth: { xs: 140, sm: 168 },
              flex: { xs: '1 1 140px', sm: '0 0 auto' },
            }}
          >
            <InputLabel id={`question-type-${q.clientKey}`}>Type</InputLabel>
            <Select
              labelId={`question-type-${q.clientKey}`}
              value={q.type ?? 'qcm'}
              label="Type"
              onChange={(e) => onSetType(e.target.value as QuestionType)}
            >
              <MenuItem value="qcm">QCM</MenuItem>
              <MenuItem value="word_cloud">Nuage de mots</MenuItem>
              <MenuItem value="closest">Au plus proche</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel id={`play-mode-${q.clientKey}`}>Mode</InputLabel>
            <Select
              labelId={`play-mode-${q.clientKey}`}
              value={q.playMode ?? 'discovery'}
              label="Mode"
              onChange={(e) => onSetPlayMode(e.target.value as PlayMode)}
            >
              <MenuItem value="discovery">Découverte</MenuItem>
              <MenuItem value="course">Cours</MenuItem>
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
                bgcolor: 'background.default',
                pl: 1,
                pr: 0.5,
                py: 0.35,
                minHeight: 40,
              }}
            >
              <AccessTimeIcon
                sx={{ color: 'text.secondary', mr: 0.5, fontSize: 18 }}
              />
              <TextField
                type="number"
                size="small"
                value={q.timerSeconds ?? defaultTimer}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!Number.isNaN(v) && v >= 1)
                    onUpdateTimer(Math.min(300, v));
                }}
                inputProps={{
                  min: 1,
                  max: 180,
                  step: 1,
                  style: {
                    textAlign: 'center',
                    width: 36,
                    fontWeight: 600,
                    fontSize: '0.9rem',
                  },
                  'aria-label': 'Durée en secondes',
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { border: 'none' },
                    backgroundColor: 'transparent',
                    minHeight: 28,
                  },
                  '& input[type=number]': { MozAppearance: 'textfield' },
                  '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button':
                    { WebkitAppearance: 'none', margin: 0 },
                }}
                variant="outlined"
              />
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mr: 0.5, fontWeight: 600 }}
              >
                s
              </Typography>
              <Stack direction="column">
                <IconButton
                  size="small"
                  onClick={() =>
                    onUpdateTimer(
                      Math.min(300, (q.timerSeconds ?? defaultTimer) + 1)
                    )
                  }
                  disabled={(q.timerSeconds ?? defaultTimer) >= 300}
                  aria-label="Augmenter la durée"
                  sx={{ py: 0, minWidth: 20, height: 14 }}
                >
                  <KeyboardArrowUpIcon sx={{ fontSize: 14 }} />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() =>
                    onUpdateTimer(
                      Math.max(1, (q.timerSeconds ?? defaultTimer) - 1)
                    )
                  }
                  disabled={(q.timerSeconds ?? defaultTimer) <= 1}
                  aria-label="Diminuer la durée"
                  sx={{ py: 0, minWidth: 20, height: 14 }}
                >
                  <KeyboardArrowDownIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Stack>
            </Stack>
          </Tooltip>
        </Stack>

        <TextField
          fullWidth
          multiline
          minRows={2}
          label="Énoncé"
          value={q.label}
          onChange={(e) => onUpdateLabel(e.target.value)}
          sx={{
            mb: 2,
            '& .MuiOutlinedInput-root': {
              bgcolor: 'background.default',
              alignItems: 'flex-start',
            },
          }}
        />

        {isClosest && (
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            sx={{ mb: 0.5 }}
          >
            <TextField
              fullWidth
              type="number"
              label="Réponse attendue"
              value={q.expectedNumber ?? ''}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === '') {
                  onUpdateExpectedNumber('');
                  return;
                }
                const n = Number(raw);
                if (Number.isFinite(n)) onUpdateExpectedNumber(n);
              }}
              inputProps={{ step: 'any' }}
            />
            <TextField
              fullWidth
              type="number"
              label="Écart max (0 pt)"
              helperText="Optionnel — défaut = |réponse|"
              value={q.scoringRange ?? ''}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === '') {
                  onUpdateScoringRange('');
                  return;
                }
                const n = Number(raw);
                if (Number.isFinite(n) && n > 0) onUpdateScoringRange(n);
              }}
              inputProps={{ min: 0, step: 'any' }}
            />
          </Stack>
        )}

        {!isWordCloud && !isClosest && (
          <Box
            sx={{
              border: 1,
              borderColor: 'divider',
              borderRadius: 2,
              bgcolor: (t) =>
                t.palette.mode === 'dark'
                  ? 'rgba(255,255,255,0.02)'
                  : 'rgba(0,0,0,0.015)',
              p: { xs: 1.25, sm: 1.5 },
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                display: 'block',
                mb: 1.25,
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              Choix de réponse
            </Typography>
            <Stack spacing={1}>
              {q.choices.map((choice, cIndex) => {
                const isCorrect = q.correctChoiceIndex === cIndex;
                const letter = String.fromCharCode(65 + cIndex);
                return (
                  <Stack
                    key={cIndex}
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    sx={{ minWidth: 0 }}
                  >
                    <Box
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: 1,
                        flexShrink: 0,
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        bgcolor: isCorrect ? 'success.main' : 'action.hover',
                        color: isCorrect
                          ? 'success.contrastText'
                          : 'text.secondary',
                      }}
                    >
                      {letter}
                    </Box>
                    <TextField
                      size="small"
                      placeholder={`Choix ${cIndex + 1}`}
                      value={choice}
                      onChange={(e) => onUpdateChoice(cIndex, e.target.value)}
                      sx={{
                        flex: '1 1 0%',
                        minWidth: 0,
                        '& .MuiOutlinedInput-root': {
                          bgcolor: 'background.paper',
                          ...(isCorrect
                            ? {
                                borderColor: 'success.main',
                                '& fieldset': {
                                  borderColor: 'success.light',
                                },
                              }
                            : {}),
                        },
                      }}
                    />
                    <Tooltip
                      title={
                        isCorrect ? 'Bonne réponse' : 'Marquer comme bonne réponse'
                      }
                    >
                      <Checkbox
                        size="small"
                        icon={<CheckBoxOutlineBlankIcon />}
                        checkedIcon={<CheckBoxIcon color="success" />}
                        checked={isCorrect}
                        onChange={() =>
                          onSetCorrect(isCorrect ? undefined : cIndex)
                        }
                        sx={{
                          color: 'action.disabled',
                          '&.Mui-checked': { color: 'success.main' },
                          p: 0.75,
                          flexShrink: 0,
                        }}
                        inputProps={{
                          'aria-label': `Bonne réponse choix ${cIndex + 1}`,
                        }}
                      />
                    </Tooltip>
                    <IconButton
                      size="small"
                      onClick={() => onRemoveChoice(cIndex)}
                      disabled={q.choices.length <= 2}
                      aria-label="Supprimer le choix"
                      sx={{
                        flexShrink: 0,
                        color: 'text.secondary',
                        '&:hover': { color: 'error.main' },
                      }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                );
              })}
            </Stack>
            <Button
              size="small"
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={onAddChoice}
              sx={{ mt: 1.5 }}
            >
              Ajouter un choix
            </Button>
          </Box>
        )}
      </Box>
    </Paper>
  );
}

export default function QcmForm({
  pageTitle,
  title,
  onTitleChange,
  coefficient = 1,
  onCoefficientChange,
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
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [bankOpen, setBankOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [bankError, setBankError] = useState<string | null>(null);
  const [themes, setThemes] = useState<ThemeDto[]>([]);
  const [themeFilter, setThemeFilter] = useState<string>('all');
  const [bankSort, setBankSort] = useState<'label' | 'theme'>('label');
  const [search, setSearch] = useState('');
  const [bankItems, setBankItems] = useState<QuestionSummaryDto[]>([]);
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [copyQuizId, setCopyQuizId] = useState('');
  const [copyQuestions, setCopyQuestions] = useState<Question[]>([]);
  const [bankLoading, setBankLoading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const linkedIds = useMemo(
    () => new Set(questions.map((q) => q.id).filter(Boolean) as string[]),
    [questions]
  );

  const loadBank = async () => {
    if (!isApiMode()) return;
    setBankLoading(true);
    setBankError(null);
    try {
      const [themeList, summaries] = await Promise.all([
        apiListThemes.execute(),
        apiListQuestions.execute({
          summaries: true,
          sort: bankSort,
          themeId:
            themeFilter === 'all'
              ? undefined
              : themeFilter === 'none'
                ? null
                : themeFilter,
        }) as Promise<QuestionSummaryDto[]>,
      ]);
      setThemes(themeList);
      setBankItems(summaries);
    } catch (e) {
      setBankError(getErrorMessage(e));
    } finally {
      setBankLoading(false);
    }
  };

  useEffect(() => {
    if (bankOpen) void loadBank();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bankOpen, themeFilter, bankSort]);

  const filteredBank = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return bankItems;
    return bankItems.filter((item) => item.label.toLowerCase().includes(q));
  }, [bankItems, search]);

  const addQuestion = () => setQuestions((q) => [...q, initialQuestion()]);

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
            expectedNumber: undefined,
            scoringRange: undefined,
            timerSeconds: DEFAULT_WORD_CLOUD_TIMER,
          };
        }
        if (type === 'closest') {
          return {
            ...item,
            type: 'closest',
            choices: [],
            correctChoiceIndex: undefined,
            expectedNumber: item.expectedNumber ?? '',
            scoringRange: item.scoringRange ?? '',
            timerSeconds: DEFAULT_CLOSEST_TIMER,
          };
        }
        return {
          ...item,
          type: 'qcm',
          choices: item.choices.length > 0 ? item.choices : ['', ''],
          expectedNumber: undefined,
          scoringRange: undefined,
          timerSeconds:
            item.timerSeconds === DEFAULT_WORD_CLOUD_TIMER ||
            item.timerSeconds === DEFAULT_CLOSEST_TIMER
              ? DEFAULT_QCM_TIMER
              : (item.timerSeconds ?? DEFAULT_QCM_TIMER),
        };
      })
    );

  const updateExpectedNumber = (qIndex: number, value: number | '') =>
    setQuestions((q) =>
      q.map((item, i) =>
        i === qIndex ? { ...item, expectedNumber: value } : item
      )
    );

  const updateScoringRange = (qIndex: number, value: number | '') =>
    setQuestions((q) =>
      q.map((item, i) =>
        i === qIndex ? { ...item, scoringRange: value } : item
      )
    );

  const setPlayMode = (qIndex: number, playMode: PlayMode) =>
    setQuestions((q) =>
      q.map((item, i) => (i === qIndex ? { ...item, playMode } : item))
    );

  const reorderByTheme = (themeList: ThemeDto[] = themes) => {
    const themeOrder = new Map(themeList.map((t) => [t.id, t.sortOrder]));
    const themeName = new Map(themeList.map((t) => [t.id, t.name]));
    setQuestions((prev) => {
      const indexed = prev.map((q, index) => ({ q, index }));
      indexed.sort((a, b) => {
        const aNo = a.q.themeId ? 0 : 1;
        const bNo = b.q.themeId ? 0 : 1;
        if (aNo !== bNo) return aNo - bNo;
        const orderA = a.q.themeId
          ? (themeOrder.get(a.q.themeId) ?? Number.MAX_SAFE_INTEGER)
          : Number.MAX_SAFE_INTEGER;
        const orderB = b.q.themeId
          ? (themeOrder.get(b.q.themeId) ?? Number.MAX_SAFE_INTEGER)
          : Number.MAX_SAFE_INTEGER;
        if (orderA !== orderB) return orderA - orderB;
        const nameCmp = (themeName.get(a.q.themeId ?? '') ?? '').localeCompare(
          themeName.get(b.q.themeId ?? '') ?? ''
        );
        if (nameCmp !== 0) return nameCmp;
        const labelCmp = a.q.label.localeCompare(b.q.label);
        if (labelCmp !== 0) return labelCmp;
        return a.index - b.index;
      });
      return indexed.map(({ q }) => q);
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setQuestions((items) => {
      const oldIndex = items.findIndex((i) => i.clientKey === active.id);
      const newIndex = items.findIndex((i) => i.clientKey === over.id);
      if (oldIndex < 0 || newIndex < 0) return items;
      return arrayMove(items, oldIndex, newIndex);
    });
  };

  const addFromBank = async (summary: QuestionSummaryDto) => {
    if (linkedIds.has(summary.id)) return;
    try {
      const full = await (
        await import('@/qcm/apiClient')
      ).apiGetQuestion.execute(summary.id);
      if (!full) return;
      setQuestions((prev) => {
        const emptyOnly =
          prev.length === 1 && !prev[0].label.trim() && !prev[0].id;
        const draft = questionToDraft(full);
        return emptyOnly ? [draft] : [...prev, draft];
      });
    } catch (e) {
      setBankError(getErrorMessage(e));
    }
  };

  const openCopyDialog = async () => {
    setCopyOpen(true);
    setBankError(null);
    try {
      const list = await apiListQuizzes.execute();
      setQuizzes(list);
    } catch (e) {
      setBankError(getErrorMessage(e));
    }
  };

  const loadCopyQuiz = async (quizId: string) => {
    setCopyQuizId(quizId);
    setCopyQuestions([]);
    if (!quizId) return;
    try {
      const quiz = await apiGetQuiz.execute(quizId);
      setCopyQuestions(quiz?.questions ?? []);
    } catch (e) {
      setBankError(getErrorMessage(e));
    }
  };

  const addCopiedQuestion = (q: Question) => {
    if (linkedIds.has(q.id)) return;
    setQuestions((prev) => {
      const emptyOnly =
        prev.length === 1 && !prev[0].label.trim() && !prev[0].id;
      const draft = questionToDraft(q);
      return emptyOnly ? [draft] : [...prev, draft];
    });
  };

  const bankPanel = (
    <Box
      sx={{
        width: { xs: '100%', md: 360 },
        p: 2,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 1 }}
      >
        <Typography variant="h6">Banque</Typography>
        {!isDesktop && (
          <IconButton aria-label="Fermer" onClick={() => setBankOpen(false)}>
            <CloseIcon />
          </IconButton>
        )}
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Ajoutez des questions existantes. Une question peut figurer dans
        plusieurs QCM.
      </Typography>
      <TextField
        size="small"
        placeholder="Rechercher…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 1.5 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
      />
      <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
        <FormControl size="small" fullWidth>
          <InputLabel id="theme-filter-label">Filtre</InputLabel>
          <Select
            labelId="theme-filter-label"
            label="Filtre"
            value={themeFilter}
            onChange={(e) => setThemeFilter(e.target.value)}
          >
            <MenuItem value="all">Toutes</MenuItem>
            <MenuItem value="none">Sans thématique</MenuItem>
            {themes.map((t) => (
              <MenuItem key={t.id} value={t.id}>
                {t.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel id="bank-sort-label">Trier</InputLabel>
          <Select
            labelId="bank-sort-label"
            label="Trier"
            value={bankSort}
            onChange={(e) =>
              setBankSort(e.target.value as 'label' | 'theme')
            }
          >
            <MenuItem value="label">Alphabétique</MenuItem>
            <MenuItem value="theme">Thématique</MenuItem>
          </Select>
        </FormControl>
      </Stack>
      {bankError && (
        <Typography color="error" variant="body2" sx={{ mb: 1 }}>
          {bankError}
        </Typography>
      )}
      <Box sx={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        {bankLoading ? (
          <Typography variant="body2" color="text.secondary">
            Chargement…
          </Typography>
        ) : filteredBank.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Aucune question dans la banque pour ce filtre.
          </Typography>
        ) : (
          <List dense disablePadding>
            {filteredBank.map((item) => {
              const already = linkedIds.has(item.id);
              return (
                <ListItemButton
                  key={item.id}
                  disabled={already}
                  onClick={() => void addFromBank(item)}
                  sx={{
                    borderBottom: 1,
                    borderColor: 'divider',
                    alignItems: 'flex-start',
                  }}
                >
                  <ListItemText
                    primary={item.label}
                    secondary={
                      item.type === 'word_cloud'
                        ? 'Nuage de mots'
                        : item.type === 'closest'
                          ? 'Au plus proche'
                          : `${item.choiceCount} choix`
                    }
                    primaryTypographyProps={{
                      variant: 'body2',
                      sx: {
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      },
                    }}
                  />
                  {already ? (
                    <Chip size="small" label="Déjà ajoutée" sx={{ ml: 1 }} />
                  ) : (
                    <AddIcon fontSize="small" sx={{ mt: 0.5, ml: 1 }} />
                  )}
                </ListItemButton>
              );
            })}
          </List>
        )}
      </Box>
    </Box>
  );

  return (
    <Box
      sx={{
        ...layout.pagePaddingAuto,
        py: { xs: 2.5, sm: 3.5 },
        maxWidth: bankOpen
          ? layout.pageMaxWidth
          : { xs: '100%', sm: 900, md: 1100 },
      }}
    >
      {pageTitle && (
        <Typography
          variant="h4"
          sx={{
            fontSize: { xs: '1.4rem', sm: '1.75rem' },
            fontWeight: 700,
            mb: 0.75,
          }}
        >
          {pageTitle}
        </Typography>
      )}
      <Typography color="text.secondary" sx={{ mb: 2.5, maxWidth: 720 }}>
        Glissez les questions pour changer l’ordre. Ajoutez depuis la banque ou
        un autre QCM — le contenu reste partagé.
      </Typography>

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        alignItems="stretch"
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <form onSubmit={onSubmit}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              sx={{ mb: 2 }}
            >
              <TextField
                fullWidth
                label="Titre du QCM"
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
              />
              {onCoefficientChange && (
                <TextField
                  label="Coefficient"
                  type="number"
                  size="small"
                  value={coefficient}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (Number.isFinite(n) && n > 0) onCoefficientChange(n);
                  }}
                  inputProps={{ min: 0.1, step: 0.1 }}
                  sx={{ width: { xs: '100%', sm: 140 }, flexShrink: 0 }}
                />
              )}
            </Stack>

            <Stack
              direction="row"
              spacing={1}
              flexWrap="wrap"
              useFlexGap
              sx={{ mb: 2 }}
            >
              {isApiMode() && (
                <>
                  <Button
                    size="small"
                    variant={bankOpen ? 'contained' : 'outlined'}
                    startIcon={<LibraryBooksIcon />}
                    onClick={() => {
                      setBankOpen((o) => !o);
                      if (!themes.length) void apiListThemes.execute().then(setThemes);
                    }}
                  >
                    Banque
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      if (!themes.length) {
                        void apiListThemes.execute().then((list) => {
                          setThemes(list);
                          reorderByTheme(list);
                        });
                      } else {
                        reorderByTheme();
                      }
                    }}
                  >
                    Ordonner par thématique
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<ContentCopyIcon />}
                    onClick={() => void openCopyDialog()}
                  >
                    Depuis un QCM
                  </Button>
                </>
              )}
            </Stack>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={questions.map((q) => q.clientKey)}
                strategy={verticalListSortingStrategy}
              >
                {questions.map((q, qIndex) => (
                  <SortableQuestionCard
                    key={q.clientKey}
                    q={q}
                    qIndex={qIndex}
                    questionsCount={questions.length}
                    onRemove={() => removeQuestion(qIndex)}
                    onUpdateLabel={(label) => updateQuestion(qIndex, label)}
                    onUpdateChoice={(cIndex, value) =>
                      updateChoice(qIndex, cIndex, value)
                    }
                    onAddChoice={() => addChoice(qIndex)}
                    onRemoveChoice={(cIndex) => removeChoice(qIndex, cIndex)}
                    onSetCorrect={(idx) => setCorrectChoiceIndex(qIndex, idx)}
                    onUpdateTimer={(v) => updateTimerSeconds(qIndex, v)}
                    onSetType={(t) => setQuestionType(qIndex, t)}
                    onUpdateExpectedNumber={(v) =>
                      updateExpectedNumber(qIndex, v)
                    }
                    onUpdateScoringRange={(v) => updateScoringRange(qIndex, v)}
                    onSetPlayMode={(mode) => setPlayMode(qIndex, mode)}
                  />
                ))}
              </SortableContext>
            </DndContext>

            <Stack spacing={2} sx={{ mt: 2.5 }}>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={addQuestion}
                fullWidth
                sx={{ py: 1.1 }}
              >
                Nouvelle question
              </Button>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.5}
                justifyContent="flex-end"
                alignItems={{ xs: 'stretch', sm: 'center' }}
              >
                {cancelButton && (
                  <Button
                    variant="text"
                    onClick={cancelButton.onClick}
                    sx={{ mr: { sm: 'auto' } }}
                  >
                    {cancelButton.label}
                  </Button>
                )}
                {secondarySubmitLabel && onSecondarySubmit ? (
                  <>
                    <Button
                      type="submit"
                      variant="outlined"
                      disabled={loading}
                      sx={{ minWidth: { sm: 160 } }}
                    >
                      {submitLabel}
                    </Button>
                    <Button
                      type="button"
                      variant="contained"
                      disabled={loading}
                      sx={{ minWidth: { sm: 200 } }}
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
              </Stack>
            </Stack>
          </form>
          {error && (
            <Typography color="error" sx={{ mt: 2 }}>
              {error.message}
            </Typography>
          )}
        </Box>

        {isDesktop && bankOpen && (
          <Paper
            variant="outlined"
            sx={{
              width: 360,
              flexShrink: 0,
              position: 'sticky',
              top: 16,
              alignSelf: 'flex-start',
              maxHeight: 'calc(100vh - 32px)',
              overflow: 'hidden',
            }}
          >
            {bankPanel}
          </Paper>
        )}
      </Stack>

      {!isDesktop && (
        <Drawer
          anchor="bottom"
          open={bankOpen}
          onClose={() => setBankOpen(false)}
          PaperProps={{
            sx: {
              height: '85vh',
              borderTopLeftRadius: 12,
              borderTopRightRadius: 12,
            },
          }}
        >
          {bankPanel}
        </Drawer>
      )}

      <Dialog
        open={copyOpen}
        onClose={() => setCopyOpen(false)}
        fullWidth
        maxWidth="sm"
        fullScreen={!isDesktop}
      >
        <DialogTitle>Copier depuis un autre QCM</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Les questions restent partagées : elles ne sont pas dupliquées dans
            la banque.
          </Typography>
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel id="copy-quiz-label">QCM source</InputLabel>
            <Select
              labelId="copy-quiz-label"
              label="QCM source"
              value={copyQuizId}
              onChange={(e) => void loadCopyQuiz(e.target.value)}
            >
              {quizzes.map((qz) => (
                <MenuItem key={qz.id} value={qz.id}>
                  {qz.title}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Divider sx={{ mb: 1 }} />
          <List dense disablePadding>
            {copyQuestions.map((q) => {
              const already = linkedIds.has(q.id);
              return (
                <ListItemButton
                  key={q.id}
                  disabled={already}
                  onClick={() => addCopiedQuestion(q)}
                >
                  <ListItemText
                    primary={q.label}
                    secondary={
                      q.type === 'word_cloud'
                        ? 'Nuage de mots'
                        : q.type === 'closest'
                          ? 'Au plus proche'
                          : `${q.choices.length} choix`
                    }
                  />
                  {already ? (
                    <Chip size="small" label="Déjà ajoutée" />
                  ) : (
                    <AddIcon fontSize="small" />
                  )}
                </ListItemButton>
              );
            })}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCopyOpen(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
