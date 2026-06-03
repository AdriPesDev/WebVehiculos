import PropTypes from 'prop-types';
import { Navigate } from 'react-router-dom';
import { getUsuarioActual, estaAutenticado } from '../services/auth';

function RutaProtegida({ children, roles = [] }) {
  if (!estaAutenticado()) {
    return <Navigate to="/login" />;
  }

  const usuario = getUsuarioActual();

  if (roles.length > 0 && !roles.includes(usuario?.rol)) {
    return <Navigate to="/no-autorizado" />;
  }

  return children;
}

RutaProtegida.propTypes = {
  children: PropTypes.node.isRequired,
  roles: PropTypes.arrayOf(PropTypes.string),
};

export default RutaProtegida;