import { useState, useEffect, useCallback } from 'react';

const TOKEN_KEY = 'vps-panel-token';
const API_URL = import.meta.env.VITE_API_URL || '';

export function useAuth() {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(TOKEN_KEY);
  });
  const [authRequired, setAuthRequired] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  // Verificar se auth esta habilitada no backend
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Tentar acessar uma rota protegida sem token
        const res = await fetch(`${API_URL}/api/containers`);
        if (res.status === 401) {
          setAuthRequired(true);
          // Se temos token salvo, verificar se ainda e valido
          if (token) {
            const verifyRes = await fetch(`${API_URL}/api/auth/verify`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!verifyRes.ok) {
              // Token invalido, limpar
              localStorage.removeItem(TOKEN_KEY);
              setToken(null);
            }
          }
        } else {
          // Auth nao esta habilitada
          setAuthRequired(false);
        }
      } catch {
        // Erro de rede, assumir que auth nao e necessario
        setAuthRequired(false);
      } finally {
        setChecking(false);
      }
    };

    checkAuth();
  }, [token]);

  const login = useCallback((newToken: string) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
  }, []);

  // Helper para fazer fetch com token
  const authFetch = useCallback(
    async (url: string, init?: RequestInit): Promise<Response> => {
      const headers = new Headers(init?.headers);
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      const fullUrl = url.startsWith('/api') ? `${API_URL}${url}` : url;
      const res = await fetch(fullUrl, { ...init, headers });
      // Se receber 401, fazer logout
      if (res.status === 401 && token) {
        logout();
      }
      return res;
    },
    [token, logout],
  );

  return {
    token,
    authRequired,
    checking,
    isAuthenticated: !authRequired || !!token,
    login,
    logout,
    authFetch,
  };
}
