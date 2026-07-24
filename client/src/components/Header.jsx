import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BrandLogo from './BrandLogo';
import Icon from './icons';

const PORTAL_URL = import.meta.env.VITE_PORTAL_URL || 'http://localhost:5173';

export default function Header() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'light');

  function handleLogout() {
    // Limpia el token y los datos del usuario del localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    // Limpia el estado de React
    setUser(null);
    // Redirige al inicio
    navigate('/');
  }

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('theme', next);
    setTheme(next);
  }

  return (
    <header className="topbar">
      <div className="topbar-content">
        <Link to="/" className="brand-logo" aria-label="Nethive Fleet — inicio">
          <BrandLogo variant="light" height={30} />
        </Link>
        <nav>
          <button
            type="button"
            className="topbar-icon-btn"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
            aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
          </button>
          {user && (
            <>
              <a
                href={PORTAL_URL}
                target="nethive-portal"
                onClick={(e) => {
                  e.preventDefault();
                  // Reengancha con la pestaña del portal y cierra esta; si el
                  // popup se bloquea, cae a la navegación normal del enlace.
                  if (window.open(PORTAL_URL, "nethive-portal")) window.close();
                  else window.location.href = PORTAL_URL;
                }}
                className="topbar-icon-btn"
                title="Ir al portal"
                aria-label="Ir al portal"
              >
                <Icon name="globe" />
              </a>
              <button
                type="button"
                className="topbar-icon-btn"
                onClick={handleLogout}
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
              >
                <Icon name="logout" />
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
