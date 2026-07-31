import Head from 'next/head';
import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import Layout from '@/components/Layout';
import AdminRouteGuard from '@/components/AdminRouteGuard';
import { layout } from '@/config/layout';
import {
  apiGetStudentRoster,
  apiUpdateStudentRoster,
  isApiMode,
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

export default function StudentRosterPage() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [nameCount, setNameCount] = useState(0);

  useEffect(() => {
    if (!isApiMode()) {
      setLoading(false);
      setError('API non configurée : impossible de charger la liste.');
      return;
    }
    setLoading(true);
    setError(null);
    apiGetStudentRoster
      .execute()
      .then((roster) => {
        setText(namesToText(roster.names));
        setNameCount(roster.names.length);
      })
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSavedMessage(null);
    try {
      const roster = await apiUpdateStudentRoster.execute(textToNames(text));
      setText(namesToText(roster.names));
      setNameCount(roster.names.length);
      setSavedMessage(
        roster.names.length === 0
          ? 'Liste vidée. Tant qu’elle est vide, les élèves saisissent leur nom librement.'
          : `Liste enregistrée : ${roster.names.length} élève${roster.names.length > 1 ? 's' : ''}.`
      );
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminRouteGuard>
      <Layout>
        <Head>
          <title>Liste des élèves</title>
        </Head>
        <Box sx={layout.pagePaddingAuto}>
          <Typography variant="h4" gutterBottom>
            Liste des élèves
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Renseignez un nom par ligne (classe / année). Les participants
            choisiront leur nom dans cette liste pour rejoindre une session. Le
            navigateur de chaque élève peut mémoriser son choix.
          </Typography>

          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {savedMessage && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {savedMessage}
            </Alert>
          )}

          {!loading && (
            <Stack spacing={2}>
              <TextField
                label="Noms des élèves"
                multiline
                minRows={12}
                fullWidth
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setSavedMessage(null);
                }}
                placeholder={'Alice Martin\nBob Dupont\nCharlie Bernard'}
                helperText={`${textToNames(text).length} nom(s) — actuellement enregistré(s) : ${nameCount}`}
              />
              <Button
                variant="contained"
                size="large"
                onClick={handleSave}
                disabled={saving || !isApiMode()}
              >
                {saving ? 'Enregistrement…' : 'Enregistrer la liste'}
              </Button>
            </Stack>
          )}
        </Box>
      </Layout>
    </AdminRouteGuard>
  );
}
