import React, { useState } from 'react';
import Head from 'next/head';
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
import Layout from '@/components/Layout';
import { useJoinSession } from '@/qcm/hooks/useJoinSession';

export default function JoinPage() {
  const router = useRouter();
  const { execute: joinSession, loading, error, clearError } = useJoinSession();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');

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
    <Layout>
      <Head>
        <title>Rejoindre une session</title>
      </Head>
      <Box sx={{ py: 4, px: 2, maxWidth: 400, mx: 'auto' }}>
        <Typography variant="h4" gutterBottom>
          Rejoindre une session
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Saisissez le code communiqué par l&apos;animateur et votre nom.
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
    </Layout>
  );
}
