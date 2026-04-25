import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // localStorage = "remember me" sessions; sessionStorage = tab-only sessions
    const stored = localStorage.getItem('auth_user') ?? sessionStorage.getItem('auth_user');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.user_type) {
          setUser(parsed);
        } else {
          localStorage.removeItem('auth_user');
          localStorage.removeItem('auth_token');
          sessionStorage.removeItem('auth_user');
          sessionStorage.removeItem('auth_token');
        }
      } catch {
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_token');
        sessionStorage.removeItem('auth_user');
        sessionStorage.removeItem('auth_token');
      }
    }
    setLoading(false);
  }, []);

  const login = (userData, token, rememberMe = false) => {
    setUser(userData);
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem('auth_user', JSON.stringify(userData));
    if (token) storage.setItem('auth_token', token);
    // Clear the other storage to avoid stale sessions
    const other = rememberMe ? sessionStorage : localStorage;
    other.removeItem('auth_user');
    other.removeItem('auth_token');
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_user');
    sessionStorage.removeItem('auth_token');
  };

  const updateUser = (updates) => {
    const updated = { ...user, ...updates };
    setUser(updated);
    // Write back to whichever storage holds the active session
    const storage = localStorage.getItem('auth_user') ? localStorage : sessionStorage;
    storage.setItem('auth_user', JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;
