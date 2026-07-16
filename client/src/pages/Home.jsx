import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import Icon from '../components/icons';

export default function Home() {
  const { user } = useAuth();

  return (
    <Layout>
      <section className="hero-centered">
        <span className="hero-label">Plataforma de gestión de flotas</span>
        <h1 className="hero-title">El control de tu flota,<br />donde lo necesitas.</h1>
        <p className="hero-subtitle">
          Nethive centraliza vehículos, empleados y viajes en una única plataforma,
          pensada para equipos que necesitan claridad y eficiencia.
        </p>
        {user ? (
          <Link to="/dashboard" className="button button-primary">Ir al panel</Link>
        ) : (
          <div className="hero-actions">
            <Link to="/login" className="button button-primary">Iniciar sesión</Link>
            <Link to="/register" className="button button-ghost">Crear cuenta</Link>
          </div>
        )}
      </section>

      <section className="features">
        <p className="features-label">Diseñado para cada rol</p>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon"><Icon name="building" size={24} /></div>
            <h3>Para empresas</h3>
            <p>Gestiona tu flota al completo, aprueba solicitudes de empleados y supervisa el estado y los mantenimientos de cada vehículo desde un único panel.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><Icon name="users" size={24} /></div>
            <h3>Para empleados</h3>
            <p>Registra salidas y llegadas, añade pasajeros a tus viajes y consulta tu historial de actividad en cualquier momento y desde cualquier dispositivo.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><Icon name="shield" size={24} /></div>
            <h3>Para administradores</h3>
            <p>Visualiza todos los viajes activos en tiempo real, controla el estado de la flota y accede al historial completo por vehículo y conductor.</p>
          </div>
        </div>
      </section>
    </Layout>
  );
}
