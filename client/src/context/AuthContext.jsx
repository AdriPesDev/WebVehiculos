/* eslint-disable react-refresh/only-export-components */
import PropTypes from "prop-types";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .me()
      .then((data) => {
        const u = data?.user ?? null;
        setUser(u);
        if (u) {
          localStorage.setItem(
            "usuario",
            JSON.stringify({
              id_usuario: u.id_usuario || u.id,
              nombre: u.nombre || u.name,
              email: u.email,
              rol: u.rol || u.role,
              id_empresa: u.id_empresa || u.company_id,
              activo: u.activo ?? u.active,
            }),
          );
        }
      })
      .catch(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("usuario");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const res = await api.login(email, password);
    setUser(res);
    return res;
  }

  function logout() {
    api.logout();
    setUser(null);
  }

  function hasRole(roles) {
    if (!user) return false;
    const allowed = Array.isArray(roles) ? roles : [roles];
    return allowed.includes(user.rol || user.role);
  }

  const value = useMemo(
    () => ({
      user,
      setUser,
      loading,
      login,
      logout,
      hasRole,
      isAuthenticated: !!user,
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
