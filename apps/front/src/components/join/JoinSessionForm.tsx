import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Typography,
  TextField,
  Button,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Divider,
} from '@mui/material';
import { useJoinSession } from '@/qcm/hooks/useJoinSession';
import { isApiMode } from '@/qcm/apiClient';
import {
  clearMicrosoftToken,
  fetchMicrosoftAuthStatus,
  getMicrosoftToken,
  readMicrosoftIdentity,
  setMicrosoftToken,
  startMicrosoftLogin,
  type MicrosoftAuthStatus,
  type MicrosoftIdentity,
} from '@/qcm/microsoftAuth';

type JoinSessionFormProps = {
  /** Titre affiché au-dessus du formulaire */
  title?: string;
  /** Sous-texte d’introduction */
  description?: string;
};

export default function JoinSessionForm({
  title = 'Rejoindre une session',
  description = "Saisissez le code communiqué par l'animateur et votre nom.",
}: JoinSessionFormProps) {
  const router = useRouter();
  const { execute: joinSession, loading, error, clearError } = useJoinSession();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [msStatus, setMsStatus] = useState<MicrosoftAuthStatus>({
    enabled: false,
    required: false,
  });
  const [msIdentity, setMsIdentity] = useState<MicrosoftIdentity | null>(null);
  const [msError, setMsError] = useState<string | null>(null);

  // Pré-remplir le code + récupérer le retour OAuth Microsoft.
  useEffect(() => {
    if (!router.isReady) return;

    const q = router.query.code;
    if (typeof q === 'string') {
      const trimmed = q.trim();
      if (trimmed) setCode(trimmed.toUpperCase());
    }

    const tokenParam = router.query.microsoft_token;
    const errParam = router.query.microsoft_error;
    const hasToken = typeof tokenParam === 'string' && Boolean(tokenParam.trim());
    const hasErr = typeof errParam === 'string' && Boolean(errParam.trim());

    if (hasToken) {
      const token = (tokenParam as string).trim();
      setMicrosoftToken(token);
      setMsIdentity(readMicrosoftIdentity(token));
    } else {
      setMsIdentity(readMicrosoftIdentity());
    }

    if (hasErr) {
      setMsError((errParam as string).trim());
    }

    if (hasToken || hasErr) {
      const nextQuery = { ...router.query };
      delete nextQuery.microsoft_token;
      delete nextQuery.microsoft_error;
      void router.replace(
        { pathname: router.pathname, query: nextQuery },
        undefined,
        { shallow: true }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- une seule fois quand la query est prête
  }, [router.isReady]);

  useEffect(() => {
    if (!isApiMode()) return;
    let cancelled = false;
    fetchMicrosoftAuthStatus().then((status) => {
      if (!cancelled) setMsStatus(status);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleMicrosoftLogin = () => {
    startMicrosoftLogin({
      sessionCode: code.trim().toUpperCase(),
      returnPath: window.location.pathname || '/',
    });
  };

  const handleDisconnectMicrosoft = () => {
    clearMicrosoftToken();
    setMsIdentity(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const microsoftToken = getMicrosoftToken();
    const identity = readMicrosoftIdentity(microsoftToken);
    if (msStatus.required && !identity) {
      setMsError('Connectez-vous avec votre compte Microsoft de l’école.');
      return;
    }
    const result = await joinSession({
      code: code.trim().toUpperCase(),
      participantName: identity?.name || name.trim() || 'Participant',
      ...(microsoftToken && identity ? { microsoftToken } : {}),
    });
    if (result) {
      const q = new URLSearchParams({
        sessionId: result.session.id,
        participantId: result.participant.id,
      });
      router.push(`/session/participant?${q.toString()}`);
    }
  };

  const showManualName = !msStatus.required && !msIdentity;
  const joinDisabled =
    loading ||
    !code.trim() ||
    (msStatus.required && !msIdentity) ||
    (showManualName && !name.trim());

  return (
    <Box sx={{ py: 4, px: 2, maxWidth: { xs: 400, md: 560 }, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        {title}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {msStatus.enabled
          ? msStatus.required
            ? 'Saisissez le code de session, puis connectez-vous avec votre compte Microsoft de l’école. Votre nom officiel sera utilisé pour le classement.'
            : 'Saisissez le code de session. Connectez-vous avec Microsoft pour utiliser votre vrai nom, ou saisissez-le manuellement.'
          : description}
      </Typography>
      {msError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setMsError(null)}>
          {msError}
        </Alert>
      )}
      <form onSubmit={handleSubmit}>
        <Stack spacing={2}>
          <TextField
            fullWidth
            label="Code session"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            inputProps={{ maxLength: 6 }}
            placeholder="ABC123"
            required
          />
          {msStatus.enabled && (
            <>
              {msIdentity ? (
                <Alert
                  severity="success"
                  action={
                    <Button
                      color="inherit"
                      size="small"
                      onClick={handleDisconnectMicrosoft}
                    >
                      Changer
                    </Button>
                  }
                >
                  Connecté : <strong>{msIdentity.name}</strong>
                  {msIdentity.email ? ` (${msIdentity.email})` : ''}
                </Alert>
              ) : (
                <Button
                  type="button"
                  variant={msStatus.required ? 'contained' : 'outlined'}
                  onClick={handleMicrosoftLogin}
                  disabled={!isApiMode()}
                >
                  Se connecter avec Microsoft
                </Button>
              )}
              {showManualName && <Divider>ou</Divider>}
            </>
          )}
          {showManualName && (
            <TextField
              fullWidth
              label="Votre nom"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required={!msStatus.required}
            />
          )}
          <Button type="submit" variant="contained" disabled={joinDisabled}>
            {loading ? 'Connexion…' : 'Rejoindre'}
          </Button>
        </Stack>
      </form>
      <Dialog open={Boolean(error)} onClose={clearError}>
        <DialogTitle>Erreur</DialogTitle>
        <DialogContent>
          <Typography>
            {error?.message === 'Session not found'
              ? 'Cette session n’existe pas ou le code est incorrect. Vérifiez le code et réessayez.'
              : error?.message === 'Session is already finished'
                ? 'Cette session est déjà terminée.'
                : error?.message === 'Microsoft authentication required'
                  ? 'Connectez-vous avec votre compte Microsoft de l’école pour rejoindre.'
                  : error?.message === 'Invalid or expired Microsoft token'
                    ? 'Votre session Microsoft a expiré. Reconnectez-vous puis réessayez.'
                    : (error?.message ?? 'Une erreur est survenue.')}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={clearError} variant="contained" autoFocus>
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
