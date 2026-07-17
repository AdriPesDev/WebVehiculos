import { useEffect, useState } from 'react';
import { api } from '../services/api';
import Layout from '../components/Layout';
import DashboardAdmin from './DashboardAdmin';
import DashboardEmpleado from './DashboardEmpleado';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.dashboard()
      .then(res => {
        if (res.error) setError(res.error);
        else setData(res);
      })
      .catch(() => setError('Error al cargar el panel.'));
  }, []);

  if (error) return <Layout><p className="alert alert-error">{error}</p></Layout>;
  if (!data) return <Layout><p className="alert alert-info">Cargando panel...</p></Layout>;

  if (data.role === 'admin')      return <DashboardAdmin data={data} />;
  if (data.role === 'empleado')   return <DashboardEmpleado data={data} />;

  return <Layout><p>Rol no reconocido.</p></Layout>;
}
