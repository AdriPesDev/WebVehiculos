import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import DashboardAdmin from './DashboardAdmin';
import DashboardEmpleado from './DashboardEmpleado';
import DashboardSuperadmin from './DashboardSuperadmin';
import DashboardNoCompany from './DashboardNoCompany';

export default function Dashboard() {
  const { user } = useAuth();

  if (!user) return <Layout><p className="alert alert-info">Cargando...</p></Layout>;

  if (user.rol === 'admin')      return <DashboardAdmin />;
  if (user.rol === 'empleado')   return <DashboardEmpleado />;
  if (user.rol === 'superadmin') return <DashboardSuperadmin />;
  if (user.rol === 'sin_empresa') return <DashboardNoCompany />;

  return <Layout><p>Rol no reconocido.</p></Layout>;
}
