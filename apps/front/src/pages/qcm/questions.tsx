import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  ListItemText,
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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import Layout from '@/components/Layout';
import AdminRouteGuard from '@/components/AdminRouteGuard';
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

function QuestionBankPageContent() {
  const [themes, setThemes] = useState<ThemeDto[]>([]);
  const [themeFilter, setThemeFilter] = useState<string>('all');
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

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [themeList, summaries] = await Promise.all([
        apiListThemes.execute(),
        apiListQuestions.execute({
          summaries: true,
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
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [themeFilter]);

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
    try {
      const q = await apiGetQuestion.execute(id);
      if (!q) {
        setError('Question introuvable');
        return;
      }
      const type: QuestionType = q.type === 'word_cloud' ? 'word_cloud' : 'qcm';
      const correctChoiceIndex =
        type === 'qcm' && q.correctChoiceId
          ? q.choices.findIndex((c) => c.id === q.correctChoiceId)
          : undefined;
      setEditor({
        id: q.id,
        label: q.label,
        type,
        choices:
          type === 'word_cloud'
            ? []
            : q.choices.length
              ? q.choices.map((c) => c.label)
              : ['', ''],
        correctChoiceIndex:
          correctChoiceIndex != null && correctChoiceIndex >= 0
            ? correctChoiceIndex
            : undefined,
        timerSeconds: q.timerSeconds ?? (type === 'word_cloud' ? 180 : 10),
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
        editor.type === 'word_cloud'
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
      await apiSaveQuestion.execute({
        id: editor.id,
        label: editor.label.trim(),
        type: editor.type,
        choices,
        correctChoiceIndex,
        timerSeconds: editor.timerSeconds,
        themeId: editor.themeId,
      });
      setEditorOpen(false);
      await load();
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
    try {
      await apiDeleteQuestion.execute(id);
      await load();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  const handleCreateTheme = async () => {
    const name = newThemeName.trim();
    if (!name) return;
    try {
      await apiCreateTheme.execute(name);
      setNewThemeName('');
      await load();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  const handleDeleteTheme = async (themeId: string) => {
    try {
      await apiDeleteTheme.execute(themeId);
      if (themeFilter === themeId) setThemeFilter('all');
      await load();
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
        await load();
        return;
      }
      const type: QuestionType = q.type === 'word_cloud' ? 'word_cloud' : 'qcm';
      const correctChoiceIndex =
        type === 'qcm' && q.correctChoiceId
          ? q.choices.findIndex((c) => c.id === q.correctChoiceId)
          : undefined;
      await apiSaveQuestion.execute({
        id: q.id,
        label: q.label,
        type,
        choices:
          type === 'word_cloud'
            ? []
            : q.choices.map((c) => ({ label: c.label })),
        correctChoiceIndex:
          correctChoiceIndex != null && correctChoiceIndex >= 0
            ? correctChoiceIndex
            : undefined,
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

  return (
    <Layout>
      <Head>
        <title>Banque de questions</title>
      </Head>
      <Box sx={layout.pagePaddingAuto}>
        <Typography variant="h4" gutterBottom>
          Banque de questions
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Organisez vos questions par thématique, puis composez vos QCM en les
          réutilisant.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Thématiques
          </Typography>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            sx={{ mb: 2 }}
          >
            <TextField
              size="small"
              label="Nouvelle thématique"
              value={newThemeName}
              onChange={(e) => setNewThemeName(e.target.value)}
              fullWidth
            />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => void handleCreateTheme()}
              sx={{ flexShrink: 0 }}
            >
              Ajouter
            </Button>
          </Stack>
          <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1}>
            {themes.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                Aucune thématique pour l’instant.
              </Typography>
            )}
            {themes.map((t) => (
              <Chip
                key={t.id}
                label={t.name}
                onDelete={() => void handleDeleteTheme(t.id)}
                variant={themeFilter === t.id ? 'filled' : 'outlined'}
                onClick={() => setThemeFilter(t.id)}
              />
            ))}
          </Stack>
        </Paper>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          sx={{ mb: 2 }}
          alignItems={{ sm: 'center' }}
        >
          <TextField
            size="small"
            label="Rechercher"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ flex: 1 }}
          />
          <FormControl size="small" sx={{ minWidth: 180 }}>
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
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openCreate}
          >
            Nouvelle question
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
              <ListItem
                key={item.id}
                sx={{
                  px: 0,
                  py: 1.25,
                  alignItems: 'flex-start',
                  borderBottom: 1,
                  borderColor: 'divider',
                  gap: 1,
                }}
                secondaryAction={
                  <Stack direction="row" spacing={0.25}>
                    <IconButton
                      edge="end"
                      aria-label="Modifier"
                      onClick={() => void openEdit(item.id)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      edge="end"
                      aria-label="Supprimer"
                      onClick={() => setDeleteId(item.id)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                }
              >
                <ListItemText
                  sx={{ pr: 10 }}
                  primary={item.label}
                  secondary={
                    <Stack
                      direction="row"
                      flexWrap="wrap"
                      useFlexGap
                      spacing={1}
                      alignItems="center"
                      sx={{ mt: 0.75 }}
                      component="span"
                    >
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        component="span"
                      >
                        {item.type === 'word_cloud'
                          ? 'Nuage de mots'
                          : `${item.choiceCount} choix`}
                      </Typography>
                      <FormControl
                        size="small"
                        sx={{ minWidth: 160, maxWidth: 240 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Select
                          displayEmpty
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
                              return (
                                <Chip
                                  size="small"
                                  label="Sans thématique"
                                  variant="outlined"
                                  sx={{ height: 24 }}
                                />
                              );
                            }
                            return (
                              <Chip
                                size="small"
                                color="primary"
                                label={
                                  themeNameById.get(String(selected)) ??
                                  'Thématique'
                                }
                                sx={{
                                  height: 24,
                                  fontWeight: 600,
                                }}
                              />
                            );
                          }}
                          sx={{
                            '& .MuiSelect-select': {
                              py: 0.5,
                              pr: '28px !important',
                              display: 'flex',
                              alignItems: 'center',
                            },
                            '& fieldset': {
                              borderColor: item.themeId
                                ? 'primary.main'
                                : undefined,
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
                  }
                  secondaryTypographyProps={{ component: 'div' }}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Box>

      <Dialog
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            m: { xs: 1, sm: 2 },
            width: { xs: 'calc(100% - 16px)', sm: undefined },
            maxHeight: '90vh',
          },
        }}
      >
        <DialogTitle>
          {editor.id ? 'Modifier la question' : 'Nouvelle question'}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <FormControl size="small" fullWidth>
              <InputLabel id="editor-type">Type</InputLabel>
              <Select
                labelId="editor-type"
                label="Type"
                value={editor.type}
                onChange={(e) => {
                  const type = e.target.value as QuestionType;
                  setEditor((prev) =>
                    type === 'word_cloud'
                      ? {
                          ...prev,
                          type,
                          choices: [],
                          correctChoiceIndex: undefined,
                          timerSeconds: 180,
                        }
                      : {
                          ...prev,
                          type,
                          choices:
                            prev.choices.length > 0 ? prev.choices : ['', ''],
                          timerSeconds:
                            prev.timerSeconds === 180 ? 10 : prev.timerSeconds,
                        }
                  );
                }}
              >
                <MenuItem value="qcm">QCM</MenuItem>
                <MenuItem value="word_cloud">Nuage de mots</MenuItem>
              </Select>
            </FormControl>
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
              value={editor.label}
              onChange={(e) =>
                setEditor((prev) => ({ ...prev, label: e.target.value }))
              }
            />
            <TextField
              label="Durée (secondes)"
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
            />
            {editor.type === 'qcm' && (
              <>
                <Divider />
                {editor.choices.map((choice, cIndex) => (
                  <Stack
                    key={cIndex}
                    direction="row"
                    spacing={0.75}
                    alignItems="flex-start"
                  >
                    <TextField
                      size="small"
                      label={`Choix ${cIndex + 1}`}
                      value={choice}
                      onChange={(e) =>
                        setEditor((prev) => ({
                          ...prev,
                          choices: prev.choices.map((c, i) =>
                            i === cIndex ? e.target.value : c
                          ),
                        }))
                      }
                      sx={{ flex: 1 }}
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
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
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
