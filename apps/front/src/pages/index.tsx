import Head from 'next/head';
import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Stack,
  List,
  ListItem,
  CircularProgress,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Paper,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import Link from 'next/link';
import Layout from '@/components/Layout';
import JoinSessionForm from '@/components/join/JoinSessionForm';
import LoadingScreen from '@/components/common/LoadingScreen';
import { siteName } from '@/config/site';
import { layout } from '@/config/layout';
import { apiListQuizzes, apiDeleteQuiz, isApiMode } from '@/qcm/apiClient';
import type { QuizSummary } from '@/qcm/apiClient';
import { getErrorMessage } from '@kahin/shared-utils';
import { useAdminAuth } from '@/contexts/AdminAuthContext';

const homeNavButtonSx = {
  py: 1,
  fontSize: { xs: '0.8rem', sm: '0.875rem' },
  justifyContent: 'center',
  textAlign: 'center',
  whiteSpace: 'normal',
  lineHeight: 1.3,
} as const;

function loadQuizzes(
  setQuizzes: (q: QuizSummary[]) => void,
  setLoading: (l: boolean) => void,
  setError: (e: string | null) => void
) {
  if (!isApiMode()) return;
  setLoading(true);
  setError(null);
  apiListQuizzes
    .execute()
    .then(setQuizzes)
    .catch((e) => setError(getErrorMessage(e)))
    .finally(() => setLoading(false));
}

export default function HomePage() {
  const { isAdmin, authResolved } = useAdminAuth();
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmQuiz, setDeleteConfirmQuiz] =
    useState<QuizSummary | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    loadQuizzes(setQuizzes, setLoading, setError);
  }, [isAdmin]);

  const handleDeleteClick = (q: QuizSummary) => {
    setDeleteConfirmQuiz(q);
  };

  const handleDeleteConfirm = async () => {
    const q = deleteConfirmQuiz;
    if (!q) return;
    setDeleteConfirmQuiz(null);
    setDeletingId(q.id);
    setError(null);
    try {
      await apiDeleteQuiz.execute(q.id);
      setQuizzes((prev) => prev.filter((item) => item.id !== q.id));
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmQuiz(null);
  };

  if (isApiMode() && !authResolved) {
    return (
      <Layout>
        <Head>
          <title>{siteName}</title>
        </Head>
        <LoadingScreen title={siteName} />
      </Layout>
    );
  }

  if (!isAdmin) {
    return (
      <Layout>
        <Head>
          <title>{siteName}</title>
          <meta
            name="description"
            content="Rejoignez une session QCM avec le code communiqué par l'animateur."
          />
        </Head>
        <JoinSessionForm
          title={siteName}
          description="Saisissez le code affiché à l’écran, puis choisissez votre nom."
        />
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>{siteName}</title>
        <meta
          name="description"
          content="Créez et lancez des QCM interactifs, ou rejoignez une session."
        />
      </Head>
      <Box sx={{ ...layout.pagePaddingAuto, py: { xs: 2, sm: 4 } }}>
        <Typography
          variant="h4"
          gutterBottom
          sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}
        >
          {siteName}
        </Typography>
        <Typography
          color="text.secondary"
          sx={{
            mb: { xs: 2, sm: 3 },
            display: { xs: 'none', sm: 'block' },
          }}
        >
          Gérez une banque de questions par thématique, composez des QCM
          réutilisables, ou rejoignez une session avec le code de
          l&apos;animateur.
        </Typography>

        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: { xs: 2, md: 3 },
            alignItems: 'stretch',
          }}
        >
          <Box
            sx={{
              width: { md: 220 },
              flexShrink: 0,
              display: 'grid',
              gridTemplateColumns: { xs: '1fr 1fr', md: '1fr' },
              gap: 1,
            }}
          >
            <Button
              component={Link}
              href="/qcm/questions"
              variant="contained"
              size="medium"
              fullWidth
              sx={homeNavButtonSx}
            >
              Banque de questions
            </Button>
            <Button
              component={Link}
              href="/qcm/create"
              variant="outlined"
              size="medium"
              fullWidth
              sx={homeNavButtonSx}
            >
              Créer un QCM
            </Button>
            <Button
              component={Link}
              href="/qcm/classes"
              variant="outlined"
              size="medium"
              fullWidth
              sx={homeNavButtonSx}
            >
              Classes
            </Button>
            <Button
              component={Link}
              href="/join"
              variant="outlined"
              size="medium"
              fullWidth
              sx={homeNavButtonSx}
            >
              Rejoindre
            </Button>
          </Box>

          {isApiMode() && (
            <Paper
              variant="outlined"
              sx={{
                flex: 1,
                minWidth: 0,
                p: { xs: 1.5, sm: 2 },
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                spacing={1}
                sx={{ mb: 1.5 }}
              >
                <Typography
                  variant="h6"
                  sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}
                >
                  QCM existants
                </Typography>
                <Button
                  component={Link}
                  href="/qcm/create"
                  size="small"
                  startIcon={<AddIcon />}
                  sx={{
                    display: { xs: 'none', sm: 'inline-flex' },
                    flexShrink: 0,
                  }}
                >
                  Nouveau
                </Button>
              </Stack>
              {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress size={28} />
                </Box>
              )}
              {error && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  {error}
                </Alert>
              )}
              {!loading && !error && quizzes.length === 0 && (
                <Typography
                  color="text.secondary"
                  variant="body2"
                  sx={{ py: 2 }}
                >
                  Aucun QCM pour le moment. Créez-en un pour commencer.
                </Typography>
              )}
              {!loading && !error && quizzes.length > 0 && (
                <List disablePadding>
                  {quizzes.map((q) => (
                    <ListItem
                      key={q.id}
                      disableGutters
                      sx={{
                        px: 0,
                        py: { xs: 1.25, sm: 1.5 },
                        borderBottom: 1,
                        borderColor: 'divider',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        '&:last-child': { borderBottom: 0 },
                      }}
                    >
                      <Typography
                        variant="body1"
                        sx={{
                          flex: 1,
                          minWidth: 0,
                          fontWeight: 500,
                          fontSize: { xs: '0.95rem', sm: '1.05rem' },
                          wordBreak: 'break-word',
                          overflowWrap: 'anywhere',
                        }}
                      >
                        {q.title}
                      </Typography>
                      <Stack
                        direction="row"
                        spacing={0.25}
                        alignItems="center"
                        sx={{ flexShrink: 0 }}
                      >
                        <Button
                          component={Link}
                          href={`/qcm/launch?quizId=${encodeURIComponent(q.id)}`}
                          size="small"
                          variant="contained"
                          sx={{ px: { xs: 1, sm: 1.5 } }}
                        >
                          Lancer
                        </Button>
                        <IconButton
                          component={Link}
                          href={`/qcm/edit/quiz?quizId=${encodeURIComponent(q.id)}`}
                          aria-label="Modifier le QCM"
                          size="small"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          aria-label="Supprimer le QCM"
                          size="small"
                          disabled={deletingId === q.id}
                          onClick={() => handleDeleteClick(q)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </ListItem>
                  ))}
                </List>
              )}
            </Paper>
          )}
        </Box>
      </Box>

      <Dialog
        open={deleteConfirmQuiz !== null}
        onClose={handleDeleteCancel}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
        PaperProps={{
          sx: { borderRadius: 2, minWidth: 320 },
        }}
      >
        <DialogTitle id="delete-dialog-title">Supprimer le QCM</DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            {deleteConfirmQuiz && (
              <>
                Supprimer le QCM « {deleteConfirmQuiz.title} » ? Les questions
                restent dans la banque et pourront être réutilisées.
              </>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, pt: 0 }}>
          <Button onClick={handleDeleteCancel} color="inherit">
            Annuler
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            autoFocus
          >
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
}
