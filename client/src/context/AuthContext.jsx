/* eslint-disable react-refresh/only-export-components */
import PropTypes from "prop-types";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = cargando, null = no autenticado

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
              id_usuario: u.id,
              nombre: u.nombre || u.name,
              email: u.email,
              rol: u.rol || u.role,
              id_empresa: u.company_id,
              activo: u.active,
            }),
          );
        }
      })
      .catch(() => setUser(null));
  }, []);

  const value = useMemo(() => ({ user, setUser }), [user, setUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export function useAuth() {
  return useContext(AuthContext);
}
