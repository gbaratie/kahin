import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import {
  Box,
  Typography,
  Button,
  Stack,
  TextField,
  IconButton,
  List,
  ListItem,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  Tooltip,
  Alert,
  CircularProgress,
  Chip,
  Paper,
  Divider,
  Collapse,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import Layout from '@/components/Layout';
import AdminRouteGuard from '@/components/AdminRouteGuard';
import SwipeToDeleteRow from '@/components/common/SwipeToDeleteRow';
import { layout } from '@/config/layout';
import {
  apiListThemes,
  apiCreateTheme,
  apiDeleteTheme,
  apiListQuestions,
  apiGetQuestion,
  apiSaveQuestion,
  apiDeleteQuestion,
  type ThemeDto,
  type QuestionSummaryDto,
} from '@/qcm/apiClient';
import type { QuestionType } from '@kahin/qcm-domain';
import { getErrorMessage } from '@kahin/shared-utils';

type EditorState = {
  id?: string;
  label: string;
  type: QuestionType;
  choices: string[];
  correctChoiceIndex?: number;
  expectedNumber?: number | '';
  scoringRange?: number | '';
  timerSeconds: number;
  themeId: string | null;
};

const emptyEditor = (): EditorState => ({
  label: '',
  type: 'qcm',
  choices: ['', ''],
  timerSeconds: 10,
  themeId: null,
});

function resolveQuestionType(type: QuestionType | undefined): QuestionType {
  if (type === 'word_cloud' || type === 'closest') return type;
  return 'qcm';
}

function QuestionBankPageContent() {
  const [themes, setThemes] = useState<ThemeDto[]>([]);
  const [themeFilter, setThemeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'label' | 'theme'>('label');
  const [items, setItems] = useState<QuestionSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [newThemeName, setNewThemeName] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editor, setEditor] = useState<EditorState>(emptyEditor());
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [assigningThemeId, setAssigningThemeId] = useState<string | null>(null);
  const [quickThemeForQuestionId, setQuickThemeForQuestionId] = useState<
    string | null
  >(null);
  const [quickThemeName, setQuickThemeName] = useState('');
  const [quickThemeSaving, setQuickThemeSaving] = useState(false);
  const [themesPanelOpen, setThemesPanelOpen] = useState(false);
  const [swipedRowId, setSwipedRowId] = useState<string | null>(null);
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'), {
    noSsr: true,
  });
  const hasLoadedOnceRef = useRef(false);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true || hasLoadedOnceRef.current;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [themeList, summaries] = await Promise.all([
        apiListThemes.execute(),
        apiListQuestions.execute({
          summaries: true,
          sort: sortBy,
          themeId:
            themeFilter === 'all'
              ? undefined
              : themeFilter === 'none'
                ? null
                : themeFilter,
        }) as Promise<QuestionSummaryDto[]>,
      ]);
      setThemes(themeList);
      setItems(summaries);
      hasLoadedOnceRef.current = true;
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [themeFilter, sortBy]);

  useEffect(() => {
    void load();
  }, [load]);

  const themeNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of themes) map.set(t.id, t.name);
    return map;
  }, [themes]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.label.toLowerCase().includes(q));
  }, [items, search]);

  const openCreate = () => {
    setEditor({
      ...emptyEditor(),
      themeId:
        themeFilter !== 'all' && themeFilter !== 'none' ? themeFilter : null,
    });
    setEditorOpen(true);
  };

  const openEdit = async (id: string) => {
    setError(null);
    setSwipedRowId(null);
    try {
      const q = await apiGetQuestion.execute(id);
      if (!q) {
        setError('Question introuvable');
        return;
      }
      const type = resolveQuestionType(q.type);
      const correctChoiceIndex =
        type === 'qcm' && q.correctChoiceId
          ? q.choices.findIndex((c) => c.id === q.correctChoiceId)
          : undefined;
      setEditor({
        id: q.id,
        label: q.label,
        type,
        choices:
          type === 'word_cloud' || type === 'closest'
            ? []
            : q.choices.length
              ? q.choices.map((c) => c.label)
              : ['', ''],
        correctChoiceIndex:
          correctChoiceIndex != null && correctChoiceIndex >= 0
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
        timerSeconds:
          q.timerSeconds ??
          (type === 'word_cloud' ? 180 : type === 'closest' ? 15 : 10),
        themeId: q.themeId ?? null,
      });
      setEditorOpen(true);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const choices =
        editor.type === 'word_cloud' || editor.type === 'closest'
          ? []
          : editor.choices
              .filter((c) => c.trim())
              .map((c) => ({ label: c.trim() }));
      let correctChoiceIndex = editor.correctChoiceIndex;
      if (
        editor.type === 'qcm' &&
        correctChoiceIndex != null &&
        editor.choices[correctChoiceIndex]?.trim()
      ) {
        const label = editor.choices[correctChoiceIndex].trim();
        correctChoiceIndex = choices.findIndex((c) => c.label === label);
        if (correctChoiceIndex < 0) correctChoiceIndex = undefined;
      } else {
        correctChoiceIndex = undefined;
      }
      const expectedNumber =
        editor.type === 'closest' &&
        typeof editor.expectedNumber === 'number' &&
        Number.isFinite(editor.expectedNumber)
          ? editor.expectedNumber
          : undefined;
      const scoringRange =
        editor.type === 'closest' &&
        typeof editor.scoringRange === 'number' &&
        editor.scoringRange > 0
          ? editor.scoringRange
          : undefined;
      if (editor.type === 'closest' && expectedNumber === undefined) {
        setError('La réponse attendue est obligatoire pour « Au plus proche ».');
        setSaving(false);
        return;
      }
      await apiSaveQuestion.execute({
        id: editor.id,
        label: editor.label.trim(),
        type: editor.type,
        choices,
        correctChoiceIndex,
        expectedNumber,
        scoringRange,
        timerSeconds: editor.timerSeconds,
        themeId: editor.themeId,
      });
      setEditorOpen(false);
      await load({ silent: true });
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuestion = async () => {
    if (!deleteId) return;
    const id = deleteId;
    setDeleteId(null);
    setSwipedRowId(null);
    const snapshot = items;
    setItems((prev) => prev.filter((i) => i.id !== id));
    try {
      await apiDeleteQuestion.execute(id);
    } catch (e) {
      setItems(snapshot);
      setError(getErrorMessage(e));
    }
  };

  const handleCreateTheme = async () => {
    const name = newThemeName.trim();
    if (!name) return;
    try {
      await apiCreateTheme.execute(name);
      setNewThemeName('');
      await load({ silent: true });
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  const handleDeleteTheme = async (themeId: string) => {
    try {
      await apiDeleteTheme.execute(themeId);
      if (themeFilter === themeId) setThemeFilter('all');
      await load({ silent: true });
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  const handleAssignTheme = async (
    questionId: string,
    themeId: string | null
  ) => {
    setAssigningThemeId(questionId);
    setError(null);
    const snapshot = items.find((i) => i.id === questionId);
    if (!snapshot) {
      setAssigningThemeId(null);
      return;
    }
    const matchesFilter =
      themeFilter === 'all' ||
      (themeFilter === 'none' && themeId == null) ||
      (themeFilter !== 'none' && themeFilter === themeId);
    setItems((prev) =>
      matchesFilter
        ? prev.map((i) =>
            i.id === questionId ? { ...i, themeId: themeId ?? undefined } : i
          )
        : prev.filter((i) => i.id !== questionId)
    );
    try {
      const q = await apiGetQuestion.execute(questionId);
      if (!q) {
        setError('Question introuvable');
        await load({ silent: true });
        return;
      }
      const type = resolveQuestionType(q.type);
      const correctChoiceIndex =
        type === 'qcm' && q.correctChoiceId
          ? q.choices.findIndex((c) => c.id === q.correctChoiceId)
          : undefined;
      await apiSaveQuestion.execute({
        id: q.id,
        label: q.label,
        type,
        choices:
          type === 'word_cloud' || type === 'closest'
            ? []
            : q.choices.map((c) => ({ label: c.label })),
        correctChoiceIndex:
          correctChoiceIndex != null && correctChoiceIndex >= 0
            ? correctChoiceIndex
            : undefined,
        expectedNumber: type === 'closest' ? q.expectedNumber : undefined,
        scoringRange: type === 'closest' ? q.scoringRange : undefined,
        timerSeconds: q.timerSeconds,
        themeId,
      });
    } catch (e) {
      setItems((prev) => {
        if (prev.some((i) => i.id === questionId)) {
          return prev.map((i) => (i.id === questionId ? snapshot : i));
        }
        return [...prev, snapshot];
      });
      setError(getErrorMessage(e));
    } finally {
      setAssigningThemeId(null);
    }
  };

  const openQuickThemeDialog = (questionId: string) => {
    setQuickThemeForQuestionId(questionId);
    setQuickThemeName('');
  };

  const handleQuickCreateAndAssignTheme = async () => {
    const name = quickThemeName.trim();
    const questionId = quickThemeForQuestionId;
    if (!name || !questionId) return;
    setQuickThemeSaving(true);
    setError(null);
    try {
      const created = await apiCreateTheme.execute(name);
      setQuickThemeForQuestionId(null);
      setQuickThemeName('');
      setThemes((prev) =>
        [...prev, created].sort(
          (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)
        )
      );
      await handleAssignTheme(questionId, created.id);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setQuickThemeSaving(false);
    }
  };

  const activeThemeLabel =
    themeFilter === 'all'
      ? null
      : themeFilter === 'none'
        ? 'Sans thématique'
        : (themeNameById.get(themeFilter) ?? null);

  return (
    <Layout>
      <Head>
        <title>Banque de questions</title>
      </Head>
      <Box sx={{ ...layout.pagePaddingAuto, py: { xs: 2, sm: 4 } }}>
        <Typography
          variant="h4"
          gutterBottom
          sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}
        >
          Banque de questions
        </Typography>
        <Typography
          color="text.secondary"
          sx={{ mb: { xs: 1.5, sm: 3 }, display: { xs: 'none', sm: 'block' } }}
        >
          Organisez vos questions par thématique, puis composez vos QCM en les
          réutilisant.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Paper variant="outlined" sx={{ mb: 2, overflow: 'hidden' }}>
          <Box
            component="button"
            type="button"
            onClick={() => setThemesPanelOpen((o) => !o)}
            sx={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
              px: 1.5,
              py: 1,
              border: 0,
              bgcolor: 'transparent',
              color: 'inherit',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle2" fontWeight={600}>
                Thématiques
                {themes.length > 0 ? ` (${themes.length})` : ''}
              </Typography>
              {!themesPanelOpen && activeThemeLabel && (
                <Typography variant="caption" color="primary.main" noWrap>
                  Filtre : {activeThemeLabel}
                </Typography>
              )}
              {!themesPanelOpen && !activeThemeLabel && themes.length > 0 && (
                <Typography variant="caption" color="text.secondary" noWrap>
                  {themes.map((t) => t.name).join(' · ')}
                </Typography>
              )}
            </Box>
            <ExpandMoreIcon
              sx={{
                flexShrink: 0,
                transform: themesPanelOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s',
              }}
            />
          </Box>
          <Collapse in={themesPanelOpen}>
            <Box sx={{ px: 1.5, pb: 1.5 }}>
              <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                <TextField
                  size="small"
                  label="Nouvelle thématique"
                  value={newThemeName}
                  onChange={(e) => setNewThemeName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newThemeName.trim()) {
                      e.preventDefault();
                      void handleCreateTheme();
                    }
                  }}
                  fullWidth
                />
                <Button
                  variant="contained"
                  onClick={() => void handleCreateTheme()}
                  disabled={!newThemeName.trim()}
                  sx={{ flexShrink: 0, minWidth: 40, px: 1.25 }}
                  aria-label="Ajouter la thématique"
                >
                  <AddIcon />
                </Button>
              </Stack>
              <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1}>
                {themes.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    Aucune thématique pour l’instant.
                  </Typography>
                )}
                <Chip
                  size="small"
                  label="Toutes"
                  variant={themeFilter === 'all' ? 'filled' : 'outlined'}
                  color={themeFilter === 'all' ? 'primary' : 'default'}
                  onClick={() => setThemeFilter('all')}
                />
                {themes.map((t) => (
                  <Chip
                    key={t.id}
                    size="small"
                    label={t.name}
                    onDelete={() => void handleDeleteTheme(t.id)}
                    variant={themeFilter === t.id ? 'filled' : 'outlined'}
                    color={themeFilter === t.id ? 'primary' : 'default'}
                    onClick={() => setThemeFilter(t.id)}
                  />
                ))}
              </Stack>
            </Box>
          </Collapse>
        </Paper>

        <Stack direction="row" spacing={1} sx={{ mb: 2 }} alignItems="center">
          <TextField
            size="small"
            label="Rechercher"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ flex: 1, minWidth: 0 }}
          />
          <FormControl
            size="small"
            sx={{ minWidth: { xs: 110, sm: 160 }, flexShrink: 0 }}
          >
            <InputLabel id="bank-theme-filter">Filtre</InputLabel>
            <Select
              labelId="bank-theme-filter"
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
          <FormControl
            size="small"
            sx={{ minWidth: { xs: 120, sm: 150 }, flexShrink: 0 }}
          >
            <InputLabel id="bank-sort">Trier par</InputLabel>
            <Select
              labelId="bank-sort"
              label="Trier par"
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as 'label' | 'theme')
              }
            >
              <MenuItem value="label">Alphabétique</MenuItem>
              <MenuItem value="theme">Thématique</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="contained"
            onClick={openCreate}
            sx={{
              flexShrink: 0,
              minWidth: { xs: 40, sm: 'auto' },
              px: { xs: 1.25, sm: 2 },
            }}
            aria-label="Nouvelle question"
            startIcon={isMobile ? undefined : <AddIcon />}
          >
            {isMobile ? <AddIcon /> : 'Nouvelle question'}
          </Button>
        </Stack>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : filtered.length === 0 ? (
          <Typography color="text.secondary">
            Aucune question. Créez-en une ou composez un QCM.
          </Typography>
        ) : (
          <List disablePadding>
            {filtered.map((item) => (
              <SwipeToDeleteRow
                key={item.id}
                rowId={item.id}
                openId={swipedRowId}
                onOpenChange={setSwipedRowId}
                onDelete={() => setDeleteId(item.id)}
                enabled={isMobile}
              >
                <ListItem
                  disableGutters
                  sx={{
                    px: 0,
                    py: 1.25,
                    alignItems: 'flex-start',
                    gap: 1,
                    display: 'flex',
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0, pr: 0.5 }}>
                    <Typography
                      variant="body1"
                      sx={{
                        wordBreak: 'break-word',
                        overflowWrap: 'anywhere',
                        pr: 0.5,
                      }}
                    >
                      {item.label}
                    </Typography>
                    <Stack
                      direction="row"
                      flexWrap="wrap"
                      useFlexGap
                      spacing={1}
                      alignItems="center"
                      sx={{ mt: 0.75 }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        {item.type === 'word_cloud'
                          ? 'Nuage de mots'
                          : item.type === 'closest'
                            ? 'Au plus proche'
                            : `${item.choiceCount} choix`}
                      </Typography>
                      <FormControl
                        size="small"
                        variant="standard"
                        sx={{ minWidth: 0, maxWidth: '100%' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Select
                          displayEmpty
                          disableUnderline
                          value={item.themeId ?? 'none'}
                          disabled={assigningThemeId === item.id}
                          onChange={(e) => {
                            const value = String(e.target.value);
                            if (value === '__new__') {
                              openQuickThemeDialog(item.id);
                              return;
                            }
                            void handleAssignTheme(
                              item.id,
                              value === 'none' ? null : value
                            );
                          }}
                          renderValue={(selected) => {
                            if (selected === 'none' || !selected) {
                              return 'Sans thématique';
                            }
                            return (
                              themeNameById.get(String(selected)) ??
                              'Thématique'
                            );
                          }}
                          sx={{
                            typography: 'caption',
                            color: item.themeId
                              ? 'primary.main'
                              : 'text.secondary',
                            fontWeight: item.themeId ? 600 : 400,
                            '& .MuiSelect-select': {
                              py: 0,
                              pr: '20px !important',
                              pb: 0,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            },
                            '& .MuiSelect-icon': {
                              color: 'text.secondary',
                              right: 0,
                            },
                          }}
                        >
                          <MenuItem value="none">Sans thématique</MenuItem>
                          {themes.map((t) => (
                            <MenuItem key={t.id} value={t.id}>
                              {t.name}
                            </MenuItem>
                          ))}
                          <Divider />
                          <MenuItem value="__new__">
                            <AddIcon fontSize="small" sx={{ mr: 1 }} />
                            Nouvelle thématique…
                          </MenuItem>
                        </Select>
                      </FormControl>
                    </Stack>
                  </Box>
                  <Stack
                    direction="row"
                    spacing={0}
                    sx={{ flexShrink: 0, mt: -0.5 }}
                  >
                    <IconButton
                      aria-label="Modifier"
                      onClick={() => void openEdit(item.id)}
                      size="small"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    {!isMobile && (
                      <IconButton
                        aria-label="Supprimer"
                        onClick={() => setDeleteId(item.id)}
                        size="small"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Stack>
                </ListItem>
              </SwipeToDeleteRow>
            ))}
          </List>
        )}
      </Box>

      <Dialog
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        fullWidth
        maxWidth="sm"
        fullScreen={isMobile}
        PaperProps={{
          sx: isMobile
            ? undefined
            : {
                m: 2,
                maxHeight: '90vh',
              },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            pr: 1,
            py: { xs: 1.5, sm: 2 },
          }}
        >
          <Typography component="span" variant="h6">
            {editor.id ? 'Modifier la question' : 'Nouvelle question'}
          </Typography>
          {isMobile && (
            <IconButton
              aria-label="Fermer"
              onClick={() => setEditorOpen(false)}
              edge="end"
            >
              <CloseIcon />
            </IconButton>
          )}
        </DialogTitle>
        <DialogContent
          dividers
          sx={{
            px: { xs: 2, sm: 3 },
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <Stack direction="row" spacing={1.5}>
            <FormControl size="small" sx={{ flex: 1, minWidth: 0 }}>
              <InputLabel id="editor-type">Type</InputLabel>
              <Select
                labelId="editor-type"
                label="Type"
                value={editor.type}
                onChange={(e) => {
                  const type = e.target.value as QuestionType;
                  setEditor((prev) => {
                    if (type === 'word_cloud') {
                      return {
                        ...prev,
                        type,
                        choices: [],
                        correctChoiceIndex: undefined,
                        expectedNumber: undefined,
                        scoringRange: undefined,
                        timerSeconds: 180,
                      };
                    }
                    if (type === 'closest') {
                      return {
                        ...prev,
                        type,
                        choices: [],
                        correctChoiceIndex: undefined,
                        expectedNumber: prev.expectedNumber ?? '',
                        scoringRange: prev.scoringRange ?? '',
                        timerSeconds: 15,
                      };
                    }
                    return {
                      ...prev,
                      type,
                      choices:
                        prev.choices.length > 0 ? prev.choices : ['', ''],
                      expectedNumber: undefined,
                      scoringRange: undefined,
                      timerSeconds:
                        prev.timerSeconds === 180 || prev.timerSeconds === 15
                          ? 10
                          : prev.timerSeconds,
                    };
                  });
                }}
              >
                <MenuItem value="qcm">QCM</MenuItem>
                <MenuItem value="word_cloud">Nuage de mots</MenuItem>
                <MenuItem value="closest">Au plus proche</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Durée (s)"
              type="number"
              size="small"
              value={editor.timerSeconds}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (!Number.isNaN(v) && v >= 1) {
                  setEditor((prev) => ({
                    ...prev,
                    timerSeconds: Math.min(300, v),
                  }));
                }
              }}
              inputProps={{ min: 1, max: 300 }}
              sx={{ width: 96, flexShrink: 0 }}
            />
          </Stack>
          <FormControl size="small" fullWidth>
            <InputLabel id="editor-theme">Thématique</InputLabel>
            <Select
              labelId="editor-theme"
              label="Thématique"
              value={editor.themeId ?? 'none'}
              onChange={(e) =>
                setEditor((prev) => ({
                  ...prev,
                  themeId:
                    e.target.value === 'none' ? null : String(e.target.value),
                }))
              }
            >
              <MenuItem value="none">Sans thématique</MenuItem>
              {themes.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Énoncé"
            fullWidth
            multiline
            minRows={isMobile ? 4 : 3}
            maxRows={10}
            value={editor.label}
            onChange={(e) =>
              setEditor((prev) => ({ ...prev, label: e.target.value }))
            }
          />
          {editor.type === 'closest' && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                label="Réponse attendue"
                type="number"
                fullWidth
                required
                value={editor.expectedNumber ?? ''}
                onChange={(e) => {
                  const raw = e.target.value;
                  setEditor((prev) => ({
                    ...prev,
                    expectedNumber:
                      raw === ''
                        ? ''
                        : Number.isFinite(Number(raw))
                          ? Number(raw)
                          : prev.expectedNumber,
                  }));
                }}
                inputProps={{ step: 'any' }}
              />
              <TextField
                label="Écart max (0 pt)"
                type="number"
                fullWidth
                helperText="Optionnel — défaut = |réponse|"
                value={editor.scoringRange ?? ''}
                onChange={(e) => {
                  const raw = e.target.value;
                  setEditor((prev) => ({
                    ...prev,
                    scoringRange:
                      raw === ''
                        ? ''
                        : Number.isFinite(Number(raw)) && Number(raw) > 0
                          ? Number(raw)
                          : prev.scoringRange,
                  }));
                }}
                inputProps={{ min: 0, step: 'any' }}
              />
            </Stack>
          )}
          {editor.type === 'qcm' && (
            <>
              <Divider />
              <Typography variant="subtitle2" color="text.secondary">
                Réponses
              </Typography>
              {editor.choices.map((choice, cIndex) => (
                <Stack
                  key={cIndex}
                  direction="row"
                  spacing={0.5}
                  alignItems="flex-start"
                >
                  <TextField
                    size="small"
                    label={`Choix ${cIndex + 1}`}
                    value={choice}
                    multiline
                    minRows={2}
                    maxRows={6}
                    onChange={(e) =>
                      setEditor((prev) => ({
                        ...prev,
                        choices: prev.choices.map((c, i) =>
                          i === cIndex ? e.target.value : c
                        ),
                      }))
                    }
                    sx={{ flex: 1, minWidth: 0 }}
                  />
                  <Tooltip title="Bonne réponse">
                    <Checkbox
                      size="small"
                      icon={<CheckBoxOutlineBlankIcon />}
                      checkedIcon={<CheckBoxIcon color="success" />}
                      checked={editor.correctChoiceIndex === cIndex}
                      onChange={() =>
                        setEditor((prev) => ({
                          ...prev,
                          correctChoiceIndex:
                            prev.correctChoiceIndex === cIndex
                              ? undefined
                              : cIndex,
                        }))
                      }
                      sx={{ mt: 0.5 }}
                    />
                  </Tooltip>
                  <IconButton
                    size="small"
                    disabled={editor.choices.length <= 2}
                    onClick={() =>
                      setEditor((prev) => {
                        const nextChoices = prev.choices.filter(
                          (_, i) => i !== cIndex
                        );
                        let nextCorrect = prev.correctChoiceIndex;
                        if (nextCorrect !== undefined) {
                          if (nextCorrect === cIndex) nextCorrect = undefined;
                          else if (nextCorrect > cIndex)
                            nextCorrect = nextCorrect - 1;
                        }
                        return {
                          ...prev,
                          choices: nextChoices,
                          correctChoiceIndex: nextCorrect,
                        };
                      })
                    }
                    sx={{ mt: 0.5 }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() =>
                  setEditor((prev) => ({
                    ...prev,
                    choices: [...prev.choices, ''],
                  }))
                }
              >
                Ajouter un choix
              </Button>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: 2 }}>
          <Button onClick={() => setEditorOpen(false)} color="inherit">
            Annuler
          </Button>
          <Button
            variant="contained"
            disabled={saving || !editor.label.trim()}
            onClick={() => void handleSave()}
          >
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={quickThemeForQuestionId !== null}
        onClose={() => {
          if (!quickThemeSaving) setQuickThemeForQuestionId(null);
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Nouvelle thématique</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            size="small"
            label="Nom de la thématique"
            value={quickThemeName}
            onChange={(e) => setQuickThemeName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && quickThemeName.trim()) {
                e.preventDefault();
                void handleQuickCreateAndAssignTheme();
              }
            }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => setQuickThemeForQuestionId(null)}
            color="inherit"
            disabled={quickThemeSaving}
          >
            Annuler
          </Button>
          <Button
            variant="contained"
            disabled={quickThemeSaving || !quickThemeName.trim()}
            onClick={() => void handleQuickCreateAndAssignTheme()}
          >
            {quickThemeSaving ? 'Création…' : 'Créer et assigner'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteId !== null} onClose={() => setDeleteId(null)}>
        <DialogTitle>Supprimer la question</DialogTitle>
        <DialogContent>
          <Typography>
            Cette question sera retirée de tous les QCM qui l’utilisent.
            Continuer ?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)} color="inherit">
            Annuler
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => void handleDeleteQuestion()}
          >
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
}

export default function QuestionBankPage() {
  return (
    <AdminRouteGuard>
      <QuestionBankPageContent />
    </AdminRouteGuard>
  );
}
