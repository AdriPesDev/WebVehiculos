import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Header() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    // Limpia el token y los datos del usuario del localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    // Limpia el estado de React
    setUser(null);
    // Redirige al inicio
    navigate('/');
  }

  return (
    <header className="topbar">
      <div className="topbar-content">
        <Link to="/" className="brand-logo">
          <img src="/logo-nethive.png" alt="Nethive" />
        </Link>
        <nav>
          <Link to="/">Inicio</Link>
          {user && (
            <>
              <Link to="/dashboard">Panel</Link>
              <button
                type="button"
                className="button button-secondary nav-btn"
                onClick={handleLogout}
              >
                Cerrar sesión
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
