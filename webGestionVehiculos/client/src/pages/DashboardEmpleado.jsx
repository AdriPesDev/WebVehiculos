import { useLayoutEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import Layout from '../components/Layout';
import Badge from '../components/Badge';
import Alert from '../components/Alert';

export default function DashboardEmpleado() {
  const [data, setData] = useState(null);
  const [flash, setFlash] = useState(null);

  useLayoutEffect(() => {
    api.dashboard().then(setData).catch(err => console.error('Error loading dashboard:', err));
    // eslint-disable-next-line react-hooks/set-state-in-effect
  }, []);

  if (!data) return <Layout><p className="alert alert-info">Cargando panel...</p></Layout>;

  const company = data?.company || { name: 'Mi Empresa' };
  const companyVehicles = data?.companyVehicles || [];
  const activeTrips = data?.activeTrips || [];
  const userTrips = Array.isArray(activeTrips) ? activeTrips : [];

  async function handleCheckin(usoId) {
    try {
      const res = await api.checkin(usoId, '');
      if (res.ok) {
        setFlash({ type: 'success', message: 'Vehículo devuelto.' });
        const updated = await api.dashboard();
        setData(updated);
      } else {
        setFlash({ type: 'error', message: res.error });
      }
    } catch (err) {
      setFlash({ type: 'error', message: err.message });
    }
  }

  return (
    <Layout>
      <section className="dashboard">
        <div className="dashboard-header">
          <h2>Panel de empleado</h2>
          <p>Empresa: <strong>{company.name}</strong></p>
        </div>

        {flash && <Alert type={flash.type} message={flash.message} onClose={() => setFlash(null)} />}

        {activeTrips.length > 0 && activeTrips[0] && (
          <div className="trip-active-card">
            <h3>Tu viaje en curso</h3>
            <p style={{ margin: '0 0 var(--space-sm)' }}>
              <strong>Vehículo:</strong> {activeTrips[0].vehicleModel} ({activeTrips[0].vehiclePlate}) &nbsp;·&nbsp;
              <strong>Salida:</strong> {new Date(activeTrips[0].checkoutTime).toLocaleString('es-ES')}
              {activeTrips[0].destination && (
                <> &nbsp;·&nbsp; <strong>Destino:</strong> {activeTrips[0].destination}</>
              )}
            </p>
            <Link to={`/vehicle/${activeTrips[0].vehicle_id}`} className="button button-small button-outline">
              Gestionar viaje
            </Link>
          </div>
        )}

        <div className="admin-cards">
          <div className="admin-card admin-card-vehicles">
            <h3>🚗 Vehículos</h3>
            <span className="stat-number">{companyVehicles.length}</span>
            <p>disponibles en flota</p>
          </div>
          <div className="admin-card admin-card-employees">
            <h3>🛣️ Mis viajes</h3>
            <span className="stat-number">{userTrips.length}</span>
            <p>viajes realizados</p>
          </div>
        </div>

        <div className="table-section">
          <h3>Vehículos de la empresa</h3>
          <table>
            <thead>
              <tr>
                <th>Modelo</th><th>Matrícula</th><th>Estado</th><th>Ubicación</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {companyVehicles.length === 0 && (
                <tr><td colSpan={5} className="empty-state">No hay vehículos en la flota todavía.</td></tr>
              )}
              {companyVehicles.map(v => {
                const vehicleId = v.id || v.id_vehiculo;
                const modelo = v.modelo || v.model;
                const matricula = v.matricula || v.plate;
                const estado = v.estado || 'desconocido';
                const ubicacion = v.ubicacion || v.location || '—';
                const enUso = estado === 'en_uso';
                return (
                  <tr key={vehicleId}>
                    <td>{modelo}</td>
                    <td>{matricula}</td>
                    <td><Badge estado={estado} /></td>
                    <td>{ubicacion}</td>
                    <td className="table-actions">
                      <Link to={`/vehicle/${vehicleId}`} className="button button-small button-outline">Detalles</Link>
                      {enUso && (
                        <button className="button button-small" onClick={() => handleCheckin(vehicleId)}>
                          Registrar entrada
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {userTrips.length > 0 && (
          <div className="table-section">
            <h3>Mis viajes</h3>
            <table>
              <thead>
                <tr>
                  <th>Vehículo</th><th>Salida</th><th>Entrada</th>
                </tr>
              </thead>
              <tbody>
                {userTrips.map(t => (
                  <tr key={t.id}>
                    <td>{t.vehicleModel}</td>
                    <td>{t.checkoutTime ? new Date(t.checkoutTime).toLocaleString('es-ES') : '—'}</td>
                    <td>{t.checkinTime ? new Date(t.checkinTime).toLocaleString('es-ES') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </Layout>
  );
}
