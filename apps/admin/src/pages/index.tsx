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
} from '@mui/material';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { siteName } from '@/config/site';
import { apiListQuizzes, isApiMode } from '@/qcm/apiClient';
import type { QuizSummary } from '@/qcm/apiClient';

export default function AdminHomePage() {
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isApiMode()) return;
    setLoading(true);
    setError(null);
    apiListQuizzes
      .execute()
      .then(setQuizzes)
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <Head>
        <title>{siteName}</title>
        <meta
          name="description"
          content="Créez et lancez des QCM interactifs."
        />
      </Head>
      <Box sx={{ py: 4, px: 2, maxWidth: 480, mx: 'auto' }}>
        <Typography variant="h4" gutterBottom>
          {siteName}
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Créez un QCM et lancez une session pour vos participants.
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
                        >
                          Lancer
                        </Button>
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
