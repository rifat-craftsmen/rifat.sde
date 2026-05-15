import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState(null);
  const [csrfToken, setCsrfToken] = useState(null);

  // Calls POST /api/login with real credentials.
  // On success, fetches a CSRF token and stores both in memory.
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

      // Fetch a CSRF token immediately after login so it is ready for
      // any subsequent state-changing requests in this session.
      const csrfRes = await fetch('/api/csrf-token');
      const { csrfToken: csrf } = await csrfRes.json();

      setToken(jwt);
      setCsrfToken(csrf);
      setIsLoggedIn(true);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Network error — is the backend running?' };
    }
  };

  const logout = () => {
    setIsLoggedIn(false);
    setToken(null);
    setCsrfToken(null);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, token, csrfToken, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
