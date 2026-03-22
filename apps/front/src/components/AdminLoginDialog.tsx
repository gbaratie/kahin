import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Typography,
  Alert,
} from '@mui/material';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { isApiMode } from '@/qcm/apiClient';

export default function AdminLoginDialog() {
  const {
    loginDialogOpen,
    closeLoginDialog,
    login,
    loginSubmitting,
    loginError,
    clearLoginError,
  } = useAdminAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleClose = () => {
    clearLoginError();
    closeLoginDialog();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isApiMode()) return;
    try {
      await login(username, password);
      setPassword('');
    } catch {
      /* erreur déjà dans loginError */
    }
  };

  return (
    <Dialog
      open={loginDialogOpen}
      onClose={handleClose}
      aria-labelledby="admin-login-title"
      PaperProps={{ sx: { borderRadius: 2, minWidth: 320 } }}
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle id="admin-login-title">Connexion animateur</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            {!isApiMode() && (
              <Alert severity="warning">
                Aucune API configurée (<code>NEXT_PUBLIC_API_URL</code>). La
                connexion animateur nécessite l’API, ou activez{' '}
                <code>NEXT_PUBLIC_BYPASS_ADMIN_AUTH=true</code> en
                développement.
              </Alert>
            )}
            {loginError && <Alert severity="error">{loginError}</Alert>}
            <TextField
              autoFocus
              label="Identifiant"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              fullWidth
              autoComplete="username"
              disabled={loginSubmitting || !isApiMode()}
            />
            <TextField
              label="Mot de passe"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              autoComplete="current-password"
              disabled={loginSubmitting || !isApiMode()}
            />
            <Typography variant="caption" color="text.secondary">
              Après connexion, vous pourrez créer et gérer les QCM sur cet
              appareil (session du navigateur).
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} color="inherit" type="button">
            Annuler
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loginSubmitting || !isApiMode()}
          >
            {loginSubmitting ? 'Connexion…' : 'Se connecter'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
