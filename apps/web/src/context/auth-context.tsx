import React, { createContext, useContext, useCallback, type ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAuthMe, loginAuth, logoutAuth } from '../services/api';
import { queryKeys } from '../hooks/api/query-keys';
import { toast } from 'sonner';

export interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  isLoggingIn: boolean;
  isLoggingOut: boolean;
  error: string | null;
  login: (apiKey: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();

  // 1. Verificação contínua e inicial de sessão via Cookie HttpOnly
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.auth.me(),
    queryFn: fetchAuthMe,
    staleTime: 60_000,
    retry: false,
  });

  const isAuthenticated = Boolean(data?.authenticated);

  // 2. Mutação de Login via API Key
  const loginMutation = useMutation({
    mutationFn: (apiKey: string) => loginAuth(apiKey),
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.auth.me(), { authenticated: true });
      queryClient.invalidateQueries({ queryKey: queryKeys.files.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
      toast.success('Chave de acesso validada! Sessão iniciada.');
    },
    onError: (err: any) => {
      const msg = err.message || 'API Key inválida. Verifique sua chave de acesso.';
      toast.error(msg);
    },
  });

  // 3. Mutação de Logout
  const logoutMutation = useMutation({
    mutationFn: logoutAuth,
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.auth.me(), { authenticated: false });
      queryClient.removeQueries({ queryKey: queryKeys.files.all });
      toast.info('Sessão encerrada.');
    },
    onError: (err: any) => {
      const msg = err.message || 'Falha ao encerrar sessão.';
      toast.error(msg);
    },
  });

  const login = useCallback(
    async (apiKey: string): Promise<boolean> => {
      try {
        await loginMutation.mutateAsync(apiKey);
        return true;
      } catch {
        return false;
      }
    },
    [loginMutation]
  );

  const logout = useCallback(async (): Promise<void> => {
    await logoutMutation.mutateAsync();
  }, [logoutMutation]);

  const error = loginMutation.error?.message ?? logoutMutation.error?.message ?? null;

  const value: AuthContextType = {
    isAuthenticated,
    isLoading,
    isLoggingIn: loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    error,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um <AuthProvider>');
  }
  return context;
};
