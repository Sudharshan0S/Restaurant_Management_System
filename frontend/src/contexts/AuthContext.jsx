import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api, { getToken, setToken } from "../api";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => !!getToken());

  useEffect(() => {
    if (!getToken()) return;
    api.get("/api/auth/me")
      .then((r) => setUser(r.data.user))
      .catch((e) => { if (e?.response?.status === 401) setToken(null); setUser(null); })
      .finally(() => setLoading(false));
  }, []);

  const finish = (r) => { setToken(r.data.token); setUser(r.data.user); return r.data.user; };
  const register = useCallback(async (form) => finish(await api.post("/api/auth/register", form)), []);
  const login = useCallback(async (form) => finish(await api.post("/api/auth/login", form)), []);
  const adminLogin = useCallback(async (form) => finish(await api.post("/api/auth/admin/login", form)), []);
  const logout = useCallback(async () => { setToken(null); setUser(null); }, []);

  const value = useMemo(() => ({ user, loading, isAdmin: user?.role === "admin", isCustomer: user?.role === "customer", register, login, adminLogin, logout }), [user, loading, register, login, adminLogin, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
