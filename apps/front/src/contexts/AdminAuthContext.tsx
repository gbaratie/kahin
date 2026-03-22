import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  apiAuthLogin,
  clearAdminToken,
  getAdminToken,
  setAdminToken,
  setAdminUnauthorizedHandler,
  isApiMode,
  isAdminBypassMode,
} from '@/qcm/apiClient';

export type AdminAuthContextValue = {
  isAdmin: boolean;
  /** False tant que le jeton sessionStorage n’a pas été lu (mode API uniquement). */
  authResolved: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  loginDialogOpen: boolean;
  openLoginDialog: () => void;
  closeLoginDialog: () => void;
  loginSubmitting: boolean;
  loginError: string | null;
  clearLoginError: () => void;
  showAdminLoginUi: boolean;
};

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  /** Icône connexion / déconnexion : uniquement si l’API est utilisée (auth réelle). */
  const showAdminLoginUi = isApiMode();

  useEffect(() => {
    setToken(getAdminToken());
    setHydrated(true);
  }, []);

  const logout = useCallback(() => {
    clearAdminToken();
    setToken(null);
    setLoginDialogOpen(false);
    setLoginError(null);
  }, []);

  useEffect(() => {
    setAdminUnauthorizedHandler(logout);
    return () => setAdminUnauthorizedHandler(null);
  }, [logout]);

  const login = useCallback(async (username: string, password: string) => {
    setLoginError(null);
    setLoginSubmitting(true);
    try {
      const { token: t } = await apiAuthLogin.execute(username, password);
      setAdminToken(t);
      setToken(t);
      setLoginDialogOpen(false);
    } catch (e) {
      setLoginError(e instanceof Error ? e.message : 'Connexion impossible');
      throw e;
    } finally {
      setLoginSubmitting(false);
    }
  }, []);

  const isAdmin = useMemo(() => {
    if (!isApiMode() && isAdminBypassMode()) return true;
    if (!isApiMode()) return false;
    if (!hydrated) return false;
    return Boolean(token);
  }, [token, hydrated]);

  const authResolved = useMemo(
    () => !isApiMode() || isAdminBypassMode() || hydrated,
    [hydrated]
  );

  const value = useMemo<AdminAuthContextValue>(
    () => ({
      isAdmin,
      authResolved,
      login,
      logout,
      loginDialogOpen,
      openLoginDialog: () => {
        setLoginError(null);
        setLoginDialogOpen(true);
      },
      closeLoginDialog: () => setLoginDialogOpen(false),
      loginSubmitting,
      loginError,
      clearLoginError: () => setLoginError(null),
      showAdminLoginUi,
    }),
    [
      isAdmin,
      authResolved,
      login,
      logout,
      loginDialogOpen,
      loginSubmitting,
      loginError,
      showAdminLoginUi,
    ]
  );

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider');
  }
  return ctx;
}
