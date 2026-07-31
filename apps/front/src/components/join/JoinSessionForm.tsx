import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useJoinSession } from '@/qcm/hooks/useJoinSession';
import {
  apiGetSessionJoinInfo,
  isApiMode,
  type SessionJoinInfoDto,
} from '@/qcm/apiClient';
import {
  clearRememberedParticipantName,
  getRememberedParticipantName,
  setRememberedParticipantName,
} from '@/qcm/participantIdentity';
import { getErrorMessage } from '@kahin/shared-utils';

type JoinSessionFormProps = {
  title?: string;
  description?: string;
};

type Step = 'code' | 'identity' | 'confirm';

function findRosterName(names: string[], candidate: string): string | null {
  const key = candidate.trim().toLocaleLowerCase('fr');
  return names.find((n) => n.toLocaleLowerCase('fr') === key) ?? null;
}

export default function JoinSessionForm({
  title = 'Rejoindre une session',
  description = 'Saisissez le code communiqué par l’animateur, puis choisissez votre nom.',
}: JoinSessionFormProps) {
  const router = useRouter();
  const { execute: joinSession, loading, error, clearError } = useJoinSession();
  const [code, setCode] = useState('');
  const [step, setStep] = useState<Step>('code');
  const [joinInfo, setJoinInfo] = useState<SessionJoinInfoDto | null>(null);
  const [infoLoading, setInfoLoading] = useState(false);
  const [infoError, setInfoError] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [freeName, setFreeName] = useState('');
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const q = router.query.code;
    if (typeof q !== 'string') return;
    const trimmed = q.trim();
    if (!trimmed) return;
    setCode(trimmed.toUpperCase());
  }, [router.query.code]);

  const rosterConfigured = Boolean(
    joinInfo && !joinInfo.freeRegistration && joinInfo.names.length > 0
  );

  const filteredNames = useMemo(() => {
    if (!joinInfo) return [];
    const q = filter.trim().toLocaleLowerCase('fr');
    if (!q) return joinInfo.names;
    return joinInfo.names.filter((n) => n.toLocaleLowerCase('fr').includes(q));
  }, [joinInfo, filter]);

  const resolveCode = async (rawCode: string) => {
    const normalized = rawCode.trim().toUpperCase();
    if (!normalized) return;
    setInfoLoading(true);
    setInfoError(null);
    try {
      if (!isApiMode()) {
        setJoinInfo({
          sessionId: '',
          code: normalized,
          classId: null,
          className: null,
          names: [],
          freeRegistration: true,
        });
        setStep('identity');
        return;
      }
      const info = await apiGetSessionJoinInfo.execute(normalized);
      setJoinInfo(info);
      setCode(info.code);

      if (!info.freeRegistration && info.names.length > 0) {
        const remembered = getRememberedParticipantName();
        if (remembered) {
          const match = findRosterName(info.names, remembered);
          if (match) {
            setSelectedName(match);
            setStep('confirm');
            return;
          }
        }
        setSelectedName(null);
        setStep('identity');
      } else {
        const remembered = getRememberedParticipantName();
        if (remembered) setFreeName(remembered);
        setStep('identity');
      }
    } catch (e) {
      setInfoError(getErrorMessage(e));
    } finally {
      setInfoLoading(false);
    }
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await resolveCode(code);
  };

  const handlePickName = (name: string) => {
    setSelectedName(name);
    setRememberedParticipantName(name);
    setStep('confirm');
  };

  const handleChangeName = () => {
    setSelectedName(null);
    clearRememberedParticipantName();
    setFilter('');
    setStep('identity');
  };

  const handleBackToCode = () => {
    setJoinInfo(null);
    setSelectedName(null);
    setFilter('');
    setInfoError(null);
    setStep('code');
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const participantName = rosterConfigured
      ? selectedName?.trim()
      : freeName.trim() || 'Participant';
    if (!participantName) return;
    setRememberedParticipantName(participantName);
    const result = await joinSession({
      code: code.trim().toUpperCase(),
      participantName,
    });
    if (result) {
      const q = new URLSearchParams({
        sessionId: result.session.id,
        participantId: result.participant.id,
      });
      router.push(`/session/participant?${q.toString()}`);
    }
  };

  const joinErrorMessage = (() => {
    if (!error) return null;
    if (error.message === 'Session not found') {
      return 'Cette session n’existe pas ou le code est incorrect. Vérifiez le code et réessayez.';
    }
    if (error.message === 'Session is already finished') {
      return 'Cette session est déjà terminée.';
    }
    if (error.message === 'Name not in student roster') {
      return 'Ce nom n’est pas dans la liste de la classe. Revenez en arrière et choisissez un nom de la liste.';
    }
    return error.message ?? 'Une erreur est survenue.';
  })();

  return (
    <Box sx={{ py: 4, px: 2, maxWidth: { xs: 400, md: 560 }, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        {title}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {description}
      </Typography>

      {step === 'code' && (
        <form onSubmit={handleCodeSubmit}>
          <Stack spacing={2}>
            {infoError && <Alert severity="error">{infoError}</Alert>}
            <TextField
              fullWidth
              label="Code session"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              inputProps={{ maxLength: 6 }}
              placeholder="ABC123"
              required
              autoFocus
            />
            <Button
              type="submit"
              variant="contained"
              disabled={infoLoading || !code.trim()}
            >
              {infoLoading ? 'Vérification…' : 'Continuer'}
            </Button>
          </Stack>
        </form>
      )}

      {step === 'identity' && joinInfo && rosterConfigured && (
        <Stack spacing={2}>
          <Alert
            severity="info"
            action={
              <Button color="inherit" size="small" onClick={handleBackToCode}>
                Changer de code
              </Button>
            }
          >
            Session <strong>{joinInfo.code}</strong>
            {joinInfo.className ? (
              <>
                {' '}
                — classe <strong>{joinInfo.className}</strong>
              </>
            ) : null}
          </Alert>
          <Typography variant="subtitle1" fontWeight={600}>
            Qui êtes-vous ?
          </Typography>
          <TextField
            fullWidth
            label="Rechercher mon nom"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            autoFocus
            placeholder="Tapez quelques lettres…"
          />
          <List
            dense
            disablePadding
            sx={{
              maxHeight: 360,
              overflow: 'auto',
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
            }}
          >
            {filteredNames.length === 0 && (
              <Box sx={{ px: 2, py: 2 }}>
                <Typography color="text.secondary" variant="body2">
                  Aucun nom ne correspond.
                </Typography>
              </Box>
            )}
            {filteredNames.map((name) => (
              <ListItemButton
                key={name}
                onClick={() => handlePickName(name)}
                divider
              >
                <ListItemText primary={name} />
              </ListItemButton>
            ))}
          </List>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={handleBackToCode}
          >
            Retour
          </Button>
        </Stack>
      )}

      {step === 'identity' && joinInfo && !rosterConfigured && (
        <form onSubmit={handleJoin}>
          <Stack spacing={2}>
            <Alert
              severity="info"
              action={
                <Button color="inherit" size="small" onClick={handleBackToCode}>
                  Changer de code
                </Button>
              }
            >
              Session <strong>{joinInfo.code}</strong> — inscription libre
            </Alert>
            <TextField
              fullWidth
              label="Votre nom"
              value={freeName}
              onChange={(e) => setFreeName(e.target.value)}
              required
              autoFocus
            />
            <Stack direction="row" spacing={1}>
              <Button
                type="button"
                variant="outlined"
                startIcon={<ArrowBackIcon />}
                onClick={handleBackToCode}
                disabled={loading}
              >
                Retour
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={loading || !freeName.trim()}
                fullWidth
              >
                {loading ? 'Connexion…' : 'Rejoindre'}
              </Button>
            </Stack>
          </Stack>
        </form>
      )}

      {step === 'confirm' && joinInfo && selectedName && (
        <form onSubmit={handleJoin}>
          <Stack spacing={2}>
            <Alert
              severity="info"
              action={
                <Button color="inherit" size="small" onClick={handleChangeName}>
                  Changer
                </Button>
              }
            >
              Vous participez en tant que <strong>{selectedName}</strong>
              {joinInfo.className ? <> ({joinInfo.className})</> : null}.
            </Alert>
            <Stack direction="row" spacing={1}>
              <Button
                type="button"
                variant="outlined"
                startIcon={<ArrowBackIcon />}
                onClick={handleChangeName}
                disabled={loading}
              >
                Retour
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                fullWidth
              >
                {loading ? 'Connexion…' : 'Rejoindre'}
              </Button>
            </Stack>
          </Stack>
        </form>
      )}

      {infoLoading && step !== 'code' && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      <Dialog open={Boolean(error)} onClose={clearError}>
        <DialogTitle>Erreur</DialogTitle>
        <DialogContent>
          <Typography>{joinErrorMessage}</Typography>
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
