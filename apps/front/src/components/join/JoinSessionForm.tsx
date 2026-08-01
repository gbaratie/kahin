import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link as MuiLink,
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
import { navItemRules } from '@/config/site';
import { layout } from '@/config/layout';
import SessionCodeField from '@/components/common/SessionCodeField';

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
    <Box sx={{ ...layout.sessionViewport, maxWidth: { xs: 400, md: 480 } }}>
      <Typography
        variant="h5"
        sx={{ fontWeight: 700, fontSize: { xs: '1.35rem', sm: '1.5rem' } }}
      >
        {title}
      </Typography>
      <Typography
        color="text.secondary"
        variant="body2"
        sx={{ mt: 0.5, mb: 2 }}
      >
        {description}
      </Typography>

      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {step === 'code' && (
          <form
            onSubmit={handleCodeSubmit}
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              minHeight: 0,
            }}
          >
            <Stack spacing={1.5} sx={{ flex: 1 }}>
              {infoError && <Alert severity="error">{infoError}</Alert>}
              <SessionCodeField
                value={code}
                onChange={setCode}
                autoFocus
                disabled={infoLoading}
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={infoLoading || code.trim().length < 1}
              >
                {infoLoading ? 'Vérification…' : 'Continuer'}
              </Button>
            </Stack>
          </form>
        )}

        {step === 'identity' && joinInfo && rosterConfigured && (
          <Stack spacing={1.5} sx={{ flex: 1, minHeight: 0 }}>
            <Alert
              severity="info"
              sx={{ py: 0.5 }}
              action={
                <Button color="inherit" size="small" onClick={handleBackToCode}>
                  Changer
                </Button>
              }
            >
              Session <strong>{joinInfo.code}</strong>
              {joinInfo.className ? (
                <>
                  {' '}
                  — <strong>{joinInfo.className}</strong>
                </>
              ) : null}
            </Alert>
            <Typography variant="subtitle2" fontWeight={600}>
              Qui êtes-vous ?
            </Typography>
            <TextField
              fullWidth
              size="small"
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
                flex: 1,
                minHeight: 0,
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
            <Stack spacing={1.5}>
              <Alert
                severity="info"
                sx={{ py: 0.5 }}
                action={
                  <Button
                    color="inherit"
                    size="small"
                    onClick={handleBackToCode}
                  >
                    Changer
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
                  size="large"
                >
                  {loading ? 'Connexion…' : 'Rejoindre'}
                </Button>
              </Stack>
            </Stack>
          </form>
        )}

        {step === 'confirm' && joinInfo && selectedName && (
          <form onSubmit={handleJoin}>
            <Stack spacing={1.5}>
              <Alert
                severity="info"
                sx={{ py: 0.5 }}
                action={
                  <Button
                    color="inherit"
                    size="small"
                    onClick={handleChangeName}
                  >
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
                  size="large"
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
      </Box>

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ mt: 2, textAlign: 'center' }}
      >
        <MuiLink component={Link} href={navItemRules.href} underline="hover">
          Règles du jeu
        </MuiLink>
      </Typography>

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
