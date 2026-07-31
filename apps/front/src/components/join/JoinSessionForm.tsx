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
import { apiGetStudentRoster, isApiMode } from '@/qcm/apiClient';
import {
  clearRememberedParticipantName,
  getRememberedParticipantName,
  setRememberedParticipantName,
} from '@/qcm/participantIdentity';
import { getErrorMessage } from '@kahin/shared-utils';

type JoinSessionFormProps = {
  /** Titre affiché au-dessus du formulaire */
  title?: string;
  /** Sous-texte d’introduction */
  description?: string;
};

type Step = 'pick-name' | 'join';

function findRosterName(names: string[], candidate: string): string | null {
  const key = candidate.trim().toLocaleLowerCase('fr');
  return names.find((n) => n.toLocaleLowerCase('fr') === key) ?? null;
}

export default function JoinSessionForm({
  title = 'Rejoindre une session',
  description = 'Choisissez votre nom dans la liste, puis saisissez le code communiqué par l’animateur.',
}: JoinSessionFormProps) {
  const router = useRouter();
  const { execute: joinSession, loading, error, clearError } = useJoinSession();
  const [code, setCode] = useState('');
  const [names, setNames] = useState<string[]>([]);
  const [rosterLoading, setRosterLoading] = useState(true);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('pick-name');
  const [filter, setFilter] = useState('');
  const [freeName, setFreeName] = useState('');

  const rosterConfigured = names.length > 0;

  useEffect(() => {
    const q = router.query.code;
    if (typeof q !== 'string') return;
    const trimmed = q.trim();
    if (!trimmed) return;
    setCode(trimmed.toUpperCase());
  }, [router.query.code]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setRosterLoading(true);
      setRosterError(null);
      try {
        if (!isApiMode()) {
          if (!cancelled) {
            setNames([]);
            setStep('join');
          }
          return;
        }
        const roster = await apiGetStudentRoster.execute();
        if (cancelled) return;
        setNames(roster.names);
        if (roster.names.length === 0) {
          const remembered = getRememberedParticipantName();
          if (remembered) setFreeName(remembered);
          setStep('join');
          return;
        }
        const remembered = getRememberedParticipantName();
        if (remembered) {
          const match = findRosterName(roster.names, remembered);
          if (match) {
            setSelectedName(match);
            setStep('join');
            return;
          }
          clearRememberedParticipantName();
        }
        setStep('pick-name');
      } catch (e) {
        if (!cancelled) setRosterError(getErrorMessage(e));
      } finally {
        if (!cancelled) setRosterLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredNames = useMemo(() => {
    const q = filter.trim().toLocaleLowerCase('fr');
    if (!q) return names;
    return names.filter((n) => n.toLocaleLowerCase('fr').includes(q));
  }, [names, filter]);

  const handlePickName = (name: string) => {
    setSelectedName(name);
    setRememberedParticipantName(name);
    setStep('join');
  };

  const handleChangeName = () => {
    setSelectedName(null);
    clearRememberedParticipantName();
    setFilter('');
    setStep('pick-name');
  };

  const handleSubmit = async (e: React.FormEvent) => {
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

  if (rosterLoading) {
    return (
      <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ py: 4, px: 2, maxWidth: { xs: 400, md: 560 }, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        {title}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {description}
      </Typography>

      {rosterError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Impossible de charger la liste des élèves : {rosterError}
        </Alert>
      )}

      {step === 'pick-name' && rosterConfigured && (
        <Stack spacing={2}>
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
        </Stack>
      )}

      {step === 'join' && (
        <form onSubmit={handleSubmit}>
          <Stack spacing={2}>
            {rosterConfigured && selectedName && (
              <Alert
                severity="info"
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
                Vous participez en tant que <strong>{selectedName}</strong>.
              </Alert>
            )}

            {!rosterConfigured && (
              <Alert severity="warning">
                La liste des élèves n’est pas encore renseignée. Saisissez votre
                nom manuellement, ou demandez à l’animateur de la configurer.
              </Alert>
            )}

            {!rosterConfigured && (
              <TextField
                fullWidth
                label="Votre nom"
                value={freeName}
                onChange={(e) => setFreeName(e.target.value)}
                required
              />
            )}

            <TextField
              fullWidth
              label="Code session"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              inputProps={{ maxLength: 6 }}
              placeholder="ABC123"
              required
              autoFocus={rosterConfigured}
            />

            <Stack direction="row" spacing={1}>
              {rosterConfigured && (
                <Button
                  type="button"
                  variant="outlined"
                  startIcon={<ArrowBackIcon />}
                  onClick={handleChangeName}
                  disabled={loading}
                >
                  Retour
                </Button>
              )}
              <Button
                type="submit"
                variant="contained"
                disabled={loading || (rosterConfigured && !selectedName)}
                fullWidth
              >
                {loading ? 'Connexion…' : 'Rejoindre'}
              </Button>
            </Stack>
          </Stack>
        </form>
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
