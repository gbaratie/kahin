import Head from 'next/head';
import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Stack,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  CircularProgress,
  Alert,
  IconButton,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { siteName } from '@/config/site';
import { apiListQuizzes, apiDeleteQuiz, isApiMode } from '@/qcm/apiClient';
import type { QuizSummary } from '@/qcm/apiClient';

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
    .catch((e) => setError(e instanceof Error ? e.message : 'Erreur'))
    .finally(() => setLoading(false));
}

export default function HomePage() {
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadQuizzes(setQuizzes, setLoading, setError);
  }, []);

  const handleDelete = async (q: QuizSummary) => {
    if (
      !window.confirm(
        `Supprimer le QCM « ${q.title} » ? Cette action est irréversible.`
      )
    )
      return;
    setDeletingId(q.id);
    setError(null);
    try {
      await apiDeleteQuiz.execute(q.id);
      setQuizzes((prev) => prev.filter((item) => item.id !== q.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la suppression');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Layout>
      <Head>
        <title>{siteName}</title>
        <meta
          name="description"
          content="Créez et lancez des QCM interactifs, ou rejoignez une session."
        />
      </Head>
      <Box sx={{ py: 4, px: 2, maxWidth: 480, mx: 'auto' }}>
        <Typography variant="h4" gutterBottom>
          {siteName}
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Créez un QCM et lancez une session, ou rejoignez une session avec le
          code communiqué par l&apos;animateur.
        </Typography>
        <Stack spacing={2}>
          <Button
            component={Link}
            href="/qcm/create"
            variant="contained"
            size="large"
            fullWidth
          >
            Créer un QCM
          </Button>
          <Button
            component={Link}
            href="/join"
            variant="outlined"
            size="large"
            fullWidth
          >
            Rejoindre une session
          </Button>

          {isApiMode() && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                QCM existants
              </Typography>
              {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              )}
              {error && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  {error}
                </Alert>
              )}
              {!loading && !error && quizzes.length === 0 && (
                <Typography color="text.secondary" variant="body2">
                  Aucun QCM pour le moment. Créez-en un ci-dessus.
                </Typography>
              )}
              {!loading && !error && quizzes.length > 0 && (
                <List dense disablePadding>
                  {quizzes.map((q) => (
                    <ListItem
                      key={q.id}
                      sx={{
                        px: 0,
                        borderBottom: 1,
                        borderColor: 'divider',
                      }}
                    >
                      <ListItemText primary={q.title} />
                      <ListItemSecondaryAction>
                        <Button
                          component={Link}
                          href={`/qcm/launch?quizId=${encodeURIComponent(q.id)}`}
                          size="small"
                          variant="outlined"
                          sx={{ mr: 0.5 }}
                        >
                          Lancer
                        </Button>
                        <IconButton
                          component={Link}
                          href={`/qcm/edit/${encodeURIComponent(q.id)}`}
                          aria-label="Modifier le QCM"
                          size="small"
                          color="primary"
                          sx={{ mr: 0.5 }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          aria-label="Supprimer le QCM"
                          size="small"
                          color="primary"
                          disabled={deletingId === q.id}
                          onClick={() => handleDelete(q)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          )}
        </Stack>
      </Box>
    </Layout>
  );
}
