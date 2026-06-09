import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';

export default function DashboardNoCompany() {
  const { user } = useAuth();

  return (
    <Layout>
      <section className="dashboard">
        <div className="dashboard-header">
          <h2>Bienvenido, {user?.nombre}</h2>
          <p>Aún no perteneces a ninguna empresa.</p>
        </div>

        <div className="admin-cards">
          <div className="admin-card admin-card-vehicles" style={{ textAlign: 'center' }}>
            <h3>🏢 Crear empresa</h3>
            <p>Crea tu propia empresa y gestiona tu flota.</p>
            <Link to="/company/create" className="button button-primary">Crear empresa</Link>
          </div>
          <div className="admin-card admin-card-employees" style={{ textAlign: 'center' }}>
            <h3>🤝 Unirse a empresa</h3>
            <p>Solicita unirte a una empresa ya registrada.</p>
            <Link to="/company/list" className="button button-outline">Ver empresas</Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
