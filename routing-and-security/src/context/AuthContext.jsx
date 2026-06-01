import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

const STORAGE_KEY = 'auth_token';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => sessionStorage.getItem(STORAGE_KEY));
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!sessionStorage.getItem(STORAGE_KEY));

  // Calls POST /api/login with real credentials.
  // Returns { ok: true } or { ok: false, error: string }.
  const login = async (email, password) => {
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const { error } = await res.json();
        return { ok: false, error: error ?? 'Invalid credentials' };
      }

      const { token: jwt } = await res.json();

      sessionStorage.setItem(STORAGE_KEY, jwt);
      setToken(jwt);
      setIsLoggedIn(true);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Network error — is the backend running?' };
    }
  };

  const logout = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    setIsLoggedIn(false);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
