import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { register } from '../services/auth';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import Alert from '../components/Alert';

function EyeIcon({ open }) {
  return open ? (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

EyeIcon.propTypes = { open: PropTypes.bool.isRequired };

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  async function handleSubmit(e) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      console.log('Register.jsx - Starting registration for:', email);
      const usuario = await register(fullName, email, password);
      console.log('Register.jsx - Usuario received:', usuario);
      if (!usuario) {
        throw new Error('No se recibió información del usuario');
      }
      // Guardar contraseña en sessionStorage para usarla en login automático después de crear empresa
      sessionStorage.setItem('temp_password', password);
      sessionStorage.setItem('temp_email', email);
      setUser(usuario);
      console.log('Register.jsx - User set in context, navigating to dashboard');
      navigate('/dashboard');
    } catch (err) {
      console.error('Register.jsx - Error:', err);
      setError(err.message || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout>
      <div style={{ maxWidth: 420, margin: '4rem auto' }}>
        <h2>Crear cuenta</h2>
        <Alert type="error" message={error} onClose={() => setError(null)} />
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="field">
            <label htmlFor="reg-name">Nombre completo</label>
            <input
              id="reg-name"
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              required
              placeholder="Tu nombre"
            />
          </div>
          <div className="field">
            <label htmlFor="reg-email">Correo electrónico</label>
            <input
              id="reg-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="usuario@empresa.com"
            />
          </div>
          <div className="field">
            <label htmlFor="reg-password">Contraseña</label>
            <div className="password-wrapper">
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Mínimo 8 caracteres"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
          </div>
          <div className="field">
            <label htmlFor="reg-confirm">Repetir contraseña</label>
            <div className="password-wrapper">
              <input
                id="reg-confirm"
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Repite tu contraseña"
                style={passwordMismatch ? { borderColor: 'var(--danger)' } : undefined}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirm(v => !v)}
                aria-label={showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                <EyeIcon open={showConfirm} />
              </button>
            </div>
            {passwordMismatch && (
              <span style={{ fontSize: '0.82rem', color: 'var(--danger)' }}>
                Las contraseñas no coinciden.
              </span>
            )}
          </div>
          <button type="submit" className="button button-primary" disabled={loading || passwordMismatch || !fullName.trim() || !email.trim() || !password || !confirmPassword}>
            {loading ? 'Registrando...' : 'Crear cuenta'}
          </button>
        </form>
        <p style={{ marginTop: '1rem', textAlign: 'center' }}>
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </p>
      </div>
    </Layout>
  );
}
