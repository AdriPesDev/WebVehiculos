import { useState } from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { api } from '../services/api';
import Layout from '../components/Layout';
import Badge from '../components/Badge';
import Alert from '../components/Alert';
import Icon from '../components/icons';
import CollapsibleSection from '../components/CollapsibleSection';

export default function DashboardEmpleado({ data: initialData }) {
  const [data, setData] = useState(initialData);
  const [flash, setFlash] = useState(null);

  const { company, companyVehicles, userTrips, myActiveTrip, activeVehicle } = data;

  async function handleCheckin(vehicleId) {
    const res = await api.checkin(vehicleId, '');
    if (res.ok) {
      setFlash({ type: 'success', message: 'Vehículo devuelto.' });
      const updated = await api.dashboard();
      setData(updated);
    } else {
      setFlash({ type: 'error', message: res.error });
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

        {myActiveTrip && activeVehicle && (
          <div className="trip-active-card">
            <h3>Tu viaje en curso</h3>
            <p style={{ margin: '0 0 0.5rem' }}>
              <strong>Vehículo:</strong> {activeVehicle.model} ({activeVehicle.plate}) &nbsp;·&nbsp;
              <strong>Salida:</strong> {new Date(myActiveTrip.checkoutTime).toLocaleString('es-ES')}
              {myActiveTrip.destination && (
                <> &nbsp;·&nbsp; <strong>Destino:</strong> {myActiveTrip.destination}</>
              )}
            </p>
            {myActiveTrip.passengers?.length > 0 && (
              <p style={{ margin: '0 0 0.75rem', color: 'var(--muted)' }}>
                <strong>Pasajeros:</strong> {myActiveTrip.passengers.map(p => p.name).join(', ')}
              </p>
            )}
            <Link to={`/vehicle/${activeVehicle.id}`} className="button button-small button-primary">
              Gestionar viaje y pasajeros
            </Link>
          </div>
        )}

        <div className="admin-cards">
          <div className="admin-card admin-card-vehicles">
            <h3><Icon name="van" size={16} className="h-icon" /> Vehículos</h3>
            <span className="stat-number">{companyVehicles.length}</span>
            <p>disponibles en flota</p>
          </div>
          <div className="admin-card admin-card-employees">
            <h3><Icon name="route" size={16} className="h-icon" /> Mis viajes</h3>
            <span className="stat-number">{userTrips.length}</span>
            <p>viajes realizados</p>
          </div>
        </div>

        <CollapsibleSection title="Vehículos de la empresa">
          <table>
            <thead>
              <tr>
                <th>Modelo</th><th>Matrícula</th><th>Estado</th><th>Ubicación</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {companyVehicles.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)', padding: '1.5rem' }}>No hay vehículos en la flota todavía.</td></tr>
              )}
              {companyVehicles.map(v => {
                const states = v.states || [];
                const enUso = states.includes('en_uso');
                return (
                  <tr key={v.id}>
                    <td>{v.model}</td>
                    <td>{v.plate}</td>
                    <td><Badge states={states} /></td>
                    <td>{v.location}</td>
                    <td className="table-actions">
                      <Link to={`/vehicle/${v.id}`} className="icon-btn icon-btn-accent" title="Ver detalles" aria-label="Ver detalles">
                        <Icon name="eye" />
                      </Link>
                      {enUso && (
                        <button className="button button-small button-outline" onClick={() => handleCheckin(v.id)}>
                          Registrar entrada
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CollapsibleSection>

        {userTrips.length > 0 && (
          <CollapsibleSection title="Mis viajes">
            <table>
              <thead>
                <tr>
                  <th>Vehículo</th><th>Salida</th><th>Entrada</th><th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {userTrips.map(t => {
                  const vehicle = companyVehicles.find(v => v.id === t.vehicle_id);
                  return (
                    <tr key={t.id}>
                      <td>{vehicle?.model || t.vehicle_id}</td>
                      <td>{new Date(t.checkoutTime).toLocaleString('es-ES')}</td>
                      <td>{t.checkinTime ? new Date(t.checkinTime).toLocaleString('es-ES') : '—'}</td>
                      <td>
                        <span className={`badge ${t.status === 'active' ? 'badge-warning' : 'badge-success'}`}>
                          {t.status === 'active' ? 'En curso' : 'Completado'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CollapsibleSection>
        )}
      </section>
    </Layout>
  );
}

DashboardEmpleado.propTypes = {
  data: PropTypes.object.isRequired,
};
