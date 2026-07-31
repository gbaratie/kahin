import Head from 'next/head';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import Layout from '@/components/Layout';
import AdminRouteGuard from '@/components/AdminRouteGuard';
import { layout } from '@/config/layout';
import {
  apiCreateClass,
  apiDeleteClass,
  apiGetClass,
  apiListClasses,
  apiUpdateClass,
  isApiMode,
  type SchoolClassSummaryDto,
} from '@/qcm/apiClient';
import { getErrorMessage } from '@kahin/shared-utils';

function namesToText(names: string[]): string {
  return names.join('\n');
}

function textToNames(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export default function ClassesPage() {
  const [classes, setClasses] = useState<SchoolClassSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [className, setClassName] = useState('');
  const [namesText, setNamesText] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] =
    useState<SchoolClassSummaryDto | null>(null);
  const [deleting, setDeleting] = useState(false);

  const reload = useCallback(async () => {
    if (!isApiMode()) {
      setLoading(false);
      setError('API non configurée : impossible de charger les classes.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setClasses(await apiListClasses.execute());
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const openCreate = () => {
    setEditingId(null);
    setClassName('');
    setNamesText('');
    setMessage(null);
    setEditorOpen(true);
  };

  const openEdit = async (summary: SchoolClassSummaryDto) => {
    setMessage(null);
    setError(null);
    try {
      const full = await apiGetClass.execute(summary.id);
      setEditingId(full.id);
      setClassName(full.name);
      setNamesText(namesToText(full.names));
      setEditorOpen(true);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const names = textToNames(namesText);
      if (editingId) {
        await apiUpdateClass.execute(editingId, {
          name: className,
          names,
        });
        setMessage('Classe mise à jour.');
      } else {
        await apiCreateClass.execute({ name: className, names });
        setMessage('Classe créée.');
      }
      setEditorOpen(false);
      await reload();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);
    try {
      await apiDeleteClass.execute(deleteTarget.id);
      setDeleteTarget(null);
      setMessage(`Classe « ${deleteTarget.name} » supprimée.`);
      await reload();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminRouteGuard>
      <Layout>
        <Head>
          <title>Classes</title>
        </Head>
        <Box sx={layout.pagePaddingAuto}>
          <Typography variant="h4" gutterBottom>
            Classes
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Créez plusieurs classes avec leur liste d’élèves. Au lancement d’un
            QCM, choisissez quelle classe utiliser, ou aucune pour l’inscription
            libre.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {message && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {message}
            </Alert>
          )}

          <Button
            variant="contained"
            onClick={openCreate}
            disabled={!isApiMode()}
            sx={{ mb: 2 }}
          >
            Nouvelle classe
          </Button>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : classes.length === 0 ? (
            <Typography color="text.secondary" variant="body2">
              Aucune classe pour le moment.
            </Typography>
          ) : (
            <List dense disablePadding>
              {classes.map((c) => (
                <ListItem
                  key={c.id}
                  sx={{ px: 0, borderBottom: 1, borderColor: 'divider' }}
                >
                  <ListItemText
                    primary={c.name}
                    secondary={`${c.studentCount} élève${c.studentCount > 1 ? 's' : ''}`}
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      aria-label="Modifier"
                      size="small"
                      color="primary"
                      onClick={() => void openEdit(c)}
                      sx={{ mr: 0.5 }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      aria-label="supprimer"
                      size="small"
                      color="primary"
                      onClick={() => setDeleteTarget(c)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </Box>

        <Dialog
          open={editorOpen}
          onClose={() => !saving && setEditorOpen(false)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>
            {editingId ? 'Modifier la classe' : 'Nouvelle classe'}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Nom de la classe"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                fullWidth
                required
                placeholder="3e A"
                autoFocus
              />
              <TextField
                label="Noms des élèves"
                multiline
                minRows={10}
                fullWidth
                value={namesText}
                onChange={(e) => setNamesText(e.target.value)}
                placeholder={'Alice Martin\nBob Dupont'}
                helperText={`${textToNames(namesText).length} nom(s) — un par ligne`}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setEditorOpen(false)} disabled={saving}>
              Annuler
            </Button>
            <Button
              variant="contained"
              onClick={() => void handleSave()}
              disabled={saving || !className.trim()}
            >
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={deleteTarget !== null}
          onClose={() => !deleting && setDeleteTarget(null)}
        >
          <DialogTitle>Supprimer la classe</DialogTitle>
          <DialogContent>
            <DialogContentText>
              {deleteTarget && (
                <>
                  Supprimer la classe « {deleteTarget.name} » ? Les sessions
                  déjà lancées avec cette classe ne seront pas modifiées.
                </>
              )}
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
              color="inherit"
            >
              Annuler
            </Button>
            <Button
              onClick={() => void handleDeleteConfirm()}
              color="error"
              variant="contained"
              disabled={deleting}
            >
              Supprimer
            </Button>
          </DialogActions>
        </Dialog>
      </Layout>
    </AdminRouteGuard>
  );
}
