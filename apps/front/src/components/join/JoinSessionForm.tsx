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
} from '@mui/material';
import { useJoinSession } from '@/qcm/hooks/useJoinSession';

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

  // Pré-remplir le code de session si l'URL contient `?code=...` (ex: scan QR).
  useEffect(() => {
    const q = router.query.code;
    if (typeof q !== 'string') return;
    const trimmed = q.trim();
    if (!trimmed) return;
    setCode(trimmed.toUpperCase());
  }, [router.query.code]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await joinSession({
      code: code.trim().toUpperCase(),
      participantName: name.trim() || 'Participant',
    });
    if (result) {
      router.push(
        `/session/${result.session.id}?participantId=${result.participant.id}`
      );
    }
  };

  return (
    <Box sx={{ py: 4, px: 2, maxWidth: { xs: 400, md: 560 }, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        {title}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {description}
      </Typography>
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
          <TextField
            fullWidth
            label="Votre nom"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Button type="submit" variant="contained" disabled={loading}>
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
