import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setUnauthorizedHandler, tokenStore } from './api.js';
import { hideSplash } from './splash.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // لو فيه توكن محفوظ، لازم نتأكد منه قبل ما نقرر نعرض صفحة الدخول ولا الداشبورد
  const [loading, setLoading] = useState(() => Boolean(tokenStore.get()));

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, [logout]);

  // أول ما نعرف حالة الدخول (مسجّل ولا لأ) نشيل الـ splash screen
  useEffect(() => {
    if (!loading) hideSplash();
  }, [loading]);

  useEffect(() => {
    if (!tokenStore.get()) return;
    api
      .me()
      .then((res) => setUser(res.user))
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (credentials) => {
    const res = await api.login(credentials);
    tokenStore.set(res.token);
    setUser(res.user);
  }, []);

  const register = useCallback(async (data) => {
    const res = await api.register(data);
    tokenStore.set(res.token);
    setUser(res.user);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
