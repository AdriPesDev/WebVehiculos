/* eslint-disable react-refresh/only-export-components */
import PropTypes from 'prop-types';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = cargando, null = no autenticado

  useEffect(() => {
    api.me()
      .then(data => setUser(data?.user ?? null))
      .catch(() => setUser(null));
  }, []);

  const value = useMemo(() => ({ user, setUser }), [user, setUser]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export function useAuth() {
  return useContext(AuthContext);
}
