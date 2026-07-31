import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from '@mui/material';
import Layout from '@/components/Layout';
import AdminRouteGuard from '@/components/AdminRouteGuard';
import LoadingScreen from '@/components/common/LoadingScreen';
import ErrorAlert from '@/components/common/ErrorAlert';
import { useLaunchSession } from '@/qcm/hooks/useLaunchSession';
import { SessionHostView } from '@/qcm/components/SessionHostView';
import { layout } from '@/config/layout';
import {
  apiListClasses,
  isApiMode,
  type SchoolClassSummaryDto,
} from '@/qcm/apiClient';
import { getErrorMessage } from '@kahin/shared-utils';

const FREE_VALUE = '__free__';

function QcmLaunchPageContent() {
  const router = useRouter();
  const quizId =
    typeof router.query.quizId === 'string' ? router.query.quizId : null;
  const {
    execute: launchSession,
    loading,
    error,
    session,
  } = useLaunchSession();

  const [classes, setClasses] = useState<SchoolClassSummaryDto[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [classesError, setClassesError] = useState<string | null>(null);
  const [selected, setSelected] = useState(FREE_VALUE);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setClassesLoading(true);
      setClassesError(null);
      try {
        if (!isApiMode()) {
          if (!cancelled) setClasses([]);
          return;
        }
        const list = await apiListClasses.execute();
        if (!cancelled) setClasses(list);
      } catch (e) {
        if (!cancelled) setClassesError(getErrorMessage(e));
      } finally {
        if (!cancelled) setClassesLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLaunch = () => {
    if (!quizId) return;
    const classId = selected === FREE_VALUE ? null : selected;
    launchSession({ quizId, classId }).catch(() => {});
  };

  if (!quizId) {
    return (
      <Layout>
        <Head>
          <title>Lancer une session</title>
        </Head>
        <Box sx={{ ...layout.pagePaddingAuto }}>
          <Alert severity="warning">Aucun quiz sélectionné.</Alert>
          <Typography sx={{ mt: 2 }}>
            Créez un QCM puis cliquez sur &quot;Créer et lancer&quot;.
          </Typography>
        </Box>
      </Layout>
    );
  }

  if (session) {
    return (
      <Layout>
        <Head>
          <title>Session — {session.code}</title>
        </Head>
        <SessionHostView sessionId={session.id} sessionCode={session.code} />
      </Layout>
    );
  }

  if (loading) {
    return <LoadingScreen title="Lancement…" />;
  }

  if (error) {
    return (
      <Layout>
        <Head>
          <title>Erreur</title>
        </Head>
        <ErrorAlert message={error.message} />
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Lancer une session</title>
      </Head>
      <Box sx={{ ...layout.pagePaddingAuto, maxWidth: 560 }}>
        <Typography variant="h4" gutterBottom>
          Lancer la session
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Choisissez la classe dont les élèves pourront rejoindre, ou laissez
          l&apos;inscription libre.
        </Typography>

        {classesError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {classesError}
          </Alert>
        )}

        {classesLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={3}>
            <FormControl>
              <FormLabel id="class-select-label">Participants</FormLabel>
              <RadioGroup
                aria-labelledby="class-select-label"
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
              >
                <FormControlLabel
                  value={FREE_VALUE}
                  control={<Radio />}
                  label="Sans classe — inscription libre (chacun tape son nom)"
                />
                {classes.map((c) => (
                  <FormControlLabel
                    key={c.id}
                    value={c.id}
                    control={<Radio />}
                    label={`${c.name} (${c.studentCount} élève${c.studentCount > 1 ? 's' : ''})`}
                  />
                ))}
              </RadioGroup>
            </FormControl>

            {classes.length === 0 && (
              <Alert severity="info">
                Aucune classe configurée. Vous pouvez lancer en inscription
                libre, ou créer des classes via le menu « Classes ».
              </Alert>
            )}

            <Button
              variant="contained"
              size="large"
              onClick={handleLaunch}
              disabled={loading}
            >
              Lancer la session
            </Button>
          </Stack>
        )}
      </Box>
    </Layout>
  );
}

export default function QcmLaunchPage() {
  return (
    <AdminRouteGuard>
      <QcmLaunchPageContent />
    </AdminRouteGuard>
  );
}
