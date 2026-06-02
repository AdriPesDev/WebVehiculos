import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function Header() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await api.logout();
    setUser(null);
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
