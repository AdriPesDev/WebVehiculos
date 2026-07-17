import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import Badge from '../components/Badge';
import Alert from '../components/Alert';
import Icon from '../components/icons';
import CollapsibleSection from '../components/CollapsibleSection';
import Dropdown from '../components/Dropdown';

function duration(start, end) {
  if (!start) return '—';
  const ms = new Date(end || Date.now()) - new Date(start);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
}

export default function VehicleDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [data, setData]               = useState(null);
  const [error, setError]             = useState(null);
  const [flash, setFlash]             = useState(null);

  const [checkoutDriverId, setCheckoutDriverId] = useState('');
  const [passengerMode, setPassengerMode]   = useState('employee');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [freeName, setFreeName]             = useState('');
  const [addingPassenger, setAddingPassenger] = useState(false);

  const [filtroConductor, setFiltroConductor] = useState('');

  const [surveyModal, setSurveyModal]     = useState(false);
  const [surveyPreguntas, setSurveyPreguntas] = useState([]);
  const [surveyAnswers, setSurveyAnswers] = useState({});
  const [resetModal, setResetModal]       = useState(false);

  async function cargarDetalle() {
    try {
      const res = await api.vehicleDetail(id);
      if (res.error) {
        setError(res.error);
      } else {
        setData(res);
        // Carga la encuesta del viaje activo si existe
        if (res.activeTrip?.id_uso) {
          api.getEncuestaViaje(res.activeTrip.id_uso)
            .then(enc => setSurveyPreguntas(enc?.preguntas || []))
            .catch(() => setSurveyPreguntas([]));
        }
      }
    } catch {
      setError('Error al cargar el vehículo.');
    }
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!mounted) return;
      await cargarDetalle();
    })();
    return () => { mounted = false; };
  }, [id]);

  if (error) return <Layout><p className="alert alert-error">{error}</p></Layout>;
  if (!data)  return <Layout><p>Cargando vehículo...</p></Layout>;

  const { vehicle, vehicleTrips = [], company, activeTrip, canManageTrip, companyUsers = [], maintenanceHistory = [] } = data;
  const states      = vehicle.states || [];
  const isAvailable = states.includes('disponible') && !activeTrip;
  const rol         = user?.rol || user?.role;
  const lastTrip     = vehicleTrips.length > 0
    ? [...vehicleTrips].sort((a, b) => new Date(b.checkoutTime) - new Date(a.checkoutTime))[0]
    : null;

  const conductoresHistorial = [...new Set(vehicleTrips.map(t => t.driverName).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'es'));
  const opcionesConductor = [
    { value: '', label: 'Todos los conductores' },
    ...conductoresHistorial.map(n => ({ value: n, label: n })),
  ];
  const vehicleTripsFiltrados = filtroConductor
    ? vehicleTrips.filter(t => t.driverName === filtroConductor)
    : vehicleTrips;

  // ── Checkout ────────────────────────────────────────────────────────────────
  async function handleCheckout() {
    const res = await api.checkout(vehicle.id);
    if (res.ok) {
      setFlash({ type: 'success', message: 'Vehículo en uso.' });
      setCheckoutDriverId('');
      await cargarDetalle();
    } else {
      setFlash({ type: 'error', message: res.error });
    }
  }

  // ── Checkin con encuesta ─────────────────────────────────────────────────────
  async function confirmCheckin() {
    for (const q of surveyPreguntas) {
      if (q.obligatoria && !surveyAnswers[q.id_pregunta]) {
        setFlash({ type: 'error', message: `La pregunta "${q.texto}" es obligatoria.` });
        return;
      }
    }

    if (surveyPreguntas.length > 0) {
      const respuestas = Object.entries(surveyAnswers).map(([id_pregunta, valor]) => {
        const pregunta = surveyPreguntas.find(p => p.id_pregunta === parseInt(id_pregunta));
        if (!pregunta) return null;
        switch (pregunta.tipo_respuesta) {
          case 'numero':   return { id_pregunta: parseInt(id_pregunta), valor_numero: parseFloat(valor) };
          case 'booleano': return { id_pregunta: parseInt(id_pregunta), valor_boolean: valor === 'true' };
          case 'opciones': return { id_pregunta: parseInt(id_pregunta), id_opcion: parseInt(valor) };
          default:         return { id_pregunta: parseInt(id_pregunta), valor_texto: valor };
        }
      }).filter(Boolean);

      if (respuestas.length > 0) {
        await api.responderEncuesta(activeTrip.id_uso, respuestas).catch(() => {});
      }
    }

    const res = await api.checkin(activeTrip.id_uso);
    setSurveyModal(false);
    setSurveyAnswers({});
    if (res.ok) {
      setFlash({ type: 'success', message: 'Vehículo devuelto. Viaje completado.' });
      await cargarDetalle();
    } else {
      setFlash({ type: 'error', message: res.error });
    }
  }

  // ── Reset estado ─────────────────────────────────────────────────────────────
  async function confirmResetState() {
    setResetModal(false);
    const res = await api.resetVehicleState(vehicle.id);
    if (res.ok) {
      setFlash({ type: 'success', message: 'Estado restablecido a disponible.' });
      await cargarDetalle();
    } else {
      setFlash({ type: 'error', message: res.error });
    }
  }

  // ── Añadir pasajero ──────────────────────────────────────────────────────────
  async function handleAddPassenger(e) {
    e.preventDefault();
    setAddingPassenger(true);

    if (passengerMode === 'employee') {
      const emp = companyUsers.find(u => String(u.id) === String(selectedUserId));
      if (!emp) {
        setFlash({ type: 'error', message: 'Selecciona un empleado.' });
        setAddingPassenger(false);
        return;
      }
      const res = await api.addPassenger(activeTrip.id_uso, emp.id);
      setAddingPassenger(false);
      if (res.ok) {
        setSelectedUserId('');
        setFlash({ type: 'success', message: 'Pasajero añadido.' });
        await cargarDetalle();
      } else {
        setFlash({ type: 'error', message: res.error });
      }
    } else {
      setAddingPassenger(false);
      setFlash({ type: 'error', message: 'Solo se pueden añadir empleados registrados como pasajeros.' });
    }
  }

  // ── Eliminar pasajero ─────────────────────────────────────────────────────────
  async function handleRemovePassenger(id_usuario) {
    const res = await api.removePassenger(activeTrip.id_uso, id_usuario);
    if (res.ok) {
      setFlash({ type: 'success', message: 'Pasajero eliminado.' });
      await cargarDetalle();
    } else {
      setFlash({ type: 'error', message: res.error });
    }
  }

  return (
    <Layout>
      <section className="dashboard">
        <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h2><Icon name="van" size={24} className="h-icon" />{vehicle.model || vehicle.plate}</h2>
            <p>
              Matrícula: <strong>{vehicle.plate}</strong>
              {vehicle.tipo && <> · {vehicle.tipo}</>}
              {company?.name && <> · {company.name}</>}
            </p>
          </div>
          <Link to="/dashboard" className="button button-outline"><Icon name="arrowLeft" size={16} /> Volver al panel</Link>
        </div>

        {flash && <Alert type={flash.type} message={flash.message} onClose={() => setFlash(null)} />}

        {/* ── Tarjetas de info ── */}
        <div className="admin-cards">
          <div className="admin-card">
            <h3><Icon name="shield" size={16} className="h-icon" /> Estado</h3>
            <Badge states={states} />
          </div>
          {vehicle.tipo && (
            <div className="admin-card">
              <h3><Icon name="van" size={16} className="h-icon" /> Tipo</h3>
              <span className="stat-number" style={{ fontSize: '1.1rem' }}>{vehicle.tipo}</span>
            </div>
          )}
          <div className="admin-card admin-card-vehicles">
            <h3><Icon name="users" size={16} className="h-icon" /> Plazas</h3>
            <span className="stat-number">{vehicle.capacity !== '—' ? vehicle.capacity : '—'}</span>
          </div>
          <div className="admin-card admin-card-employees">
            <h3><Icon name="globe" size={16} className="h-icon" /> Ubicación</h3>
            <span className="stat-number" style={{ fontSize: '1.1rem' }}>{vehicle.location}</span>
          </div>
          <div className="admin-card admin-card-requests">
            <h3><Icon name="route" size={16} className="h-icon" /> Total viajes</h3>
            <span className="stat-number">{vehicleTrips.length}</span>
          </div>
          {lastTrip && (
            <div className="admin-card">
              <h3><Icon name="clock" size={16} className="h-icon" /> Última salida</h3>
              <span className="stat-number" style={{ fontSize: '1.1rem' }}>
                {new Date(lastTrip.checkoutTime).toLocaleDateString('es-ES')}
              </span>
            </div>
          )}
        </div>

        {/* ── Checkout ── */}
        {isAvailable && (
          <div className="table-section">
            <h3>Registrar salida</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
              {rol === 'admin' && companyUsers.length > 0 && (
                <div className="field-group">
                  <label htmlFor="checkout-driver">Conductor</label>
                  <select
                    id="checkout-driver"
                    className="input-inline"
                    value={checkoutDriverId}
                    onChange={e => setCheckoutDriverId(e.target.value)}
                  >
                    <option value="">Yo mismo</option>
                    {companyUsers
                      .filter(u => u.id !== user?.id)
                      .map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                  </select>
                </div>
              )}
              <button className="button button-primary" onClick={handleCheckout}>
                Registrar salida
              </button>
            </div>
          </div>
        )}

        {/* ── Reset estado (admin, sin viaje activo) ── */}
        {rol === 'admin' && !isAvailable && !activeTrip && (
          <div className="table-section" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <p style={{ margin: 0, color: 'var(--muted)' }}>El vehículo aparece como no disponible sin viaje activo registrado.</p>
            <button className="button button-ghost" onClick={() => setResetModal(true)}>
              Restablecer a disponible
            </button>
          </div>
        )}

        {/* ── Viaje activo ── */}
        {activeTrip && (
          <div className="trip-active-card">
            <h3>Viaje en curso</h3>
            <p style={{ margin: '0 0 0.5rem' }}>
              <strong>Conductor:</strong> {activeTrip.driverName} &nbsp;·&nbsp;
              <strong>Salida:</strong> {new Date(activeTrip.checkoutTime).toLocaleString('es-ES')} &nbsp;·&nbsp;
              <strong>Duración:</strong> {duration(activeTrip.checkoutTime, null)}
              {activeTrip.destination && activeTrip.destination !== '—' && (
                <> &nbsp;·&nbsp; <strong>Destino:</strong> {activeTrip.destination}</>
              )}
            </p>

            {/* Pasajeros */}
            <div style={{ margin: '0.75rem 0' }}>
              <strong>Pasajeros ({activeTrip.passengers?.length ?? 0}):</strong>
              {(!activeTrip.passengers || activeTrip.passengers.length === 0) && (
                <span style={{ color: 'var(--muted)', marginLeft: '0.5rem' }}>Sin pasajeros aún.</span>
              )}
              <ul style={{ margin: '0.5rem 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {(activeTrip.passengers || []).map(p => (
                  <li key={p.id || p.user_id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>
                      {p.name}
                      <span className="badge badge-success" style={{ marginLeft: '0.4rem', fontSize: '0.7rem' }}>
                        empleado
                      </span>
                    </span>
                    {canManageTrip && (
                      <button
                        className="icon-btn icon-btn-danger"
                        onClick={() => handleRemovePassenger(p.id || p.user_id)}
                        title="Eliminar pasajero"
                        aria-label="Eliminar pasajero"
                      >
                        <Icon name="x" size={16} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Añadir pasajero */}
            {canManageTrip && (
              <form onSubmit={handleAddPassenger} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'flex-end', marginTop: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className={`button button-small button-outline${passengerMode === 'employee' ? ' is-active' : ''}`}
                    onClick={() => setPassengerMode('employee')}
                  >
                    Empleado registrado
                  </button>
                  <button
                    type="button"
                    className={`button button-small button-outline${passengerMode === 'free' ? ' is-active' : ''}`}
                    onClick={() => setPassengerMode('free')}
                  >
                    Nombre libre
                  </button>
                </div>

                {passengerMode === 'employee' ? (
                  <select
                    className="input-inline"
                    value={selectedUserId}
                    onChange={e => setSelectedUserId(e.target.value)}
                  >
                    <option value="">Seleccionar empleado…</option>
                    {companyUsers
                      .filter(u => u.id !== user?.id)
                      .map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    className="input-inline"
                    value={freeName}
                    onChange={e => setFreeName(e.target.value)}
                    placeholder="Nombre del pasajero"
                    style={{ minWidth: 180 }}
                  />
                )}

                <button type="submit" className="button button-small button-outline" disabled={addingPassenger}>
                  <Icon name="plus" size={16} /> Añadir
                </button>
              </form>
            )}

            {/* Checkin */}
            {canManageTrip && (
              <div style={{ marginTop: '1.25rem' }}>
                <button className="button button-outline" onClick={() => setSurveyModal(true)}>
                  Registrar llegada
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Historial de viajes ── */}
        <CollapsibleSection title="Historial de viajes" count={vehicleTrips.length}>
          {vehicleTrips.length === 0 ? (
            <p style={{ color: 'var(--muted)' }}>
              {rol === 'empleado' ? 'No tienes viajes registrados en este vehículo.' : 'Sin viajes registrados.'}
            </p>
          ) : (
            <>
              <div style={{ marginBottom: '0.75rem' }}>
                <Dropdown
                  ariaLabel="Filtrar por conductor"
                  placeholder="Todos los conductores"
                  value={filtroConductor}
                  onChange={setFiltroConductor}
                  options={opcionesConductor}
                  minWidth={220}
                />
              </div>
              <table>
              <thead>
                <tr>
                  <th>Conductor</th><th>Salida</th><th>Entrada</th><th>Duración</th><th>Pasajeros</th><th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {vehicleTripsFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)', padding: '1.5rem' }}>
                      Ningún viaje coincide con el filtro.
                    </td>
                  </tr>
                )}
                {vehicleTripsFiltrados.map(t => (
                  <tr key={t.id}>
                    <td>{t.driverName}</td>
                    <td>{t.checkoutTime ? new Date(t.checkoutTime).toLocaleString('es-ES') : '—'}</td>
                    <td>{t.checkinTime  ? new Date(t.checkinTime).toLocaleString('es-ES')  : '—'}</td>
                    <td>{duration(t.checkoutTime, t.checkinTime)}</td>
                    <td>
                      {(t.passengers?.length ?? 0) > 0
                        ? `${t.passengers.length} (${t.passengers.map(p => p.name).join(', ')})`
                        : '0'}
                    </td>
                    <td>
                      <span className={`badge ${t.status === 'active' ? 'badge-warning' : 'badge-success'}`}>
                        {t.status === 'active' ? 'En curso' : 'Completado'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </>
          )}
        </CollapsibleSection>

        {/* ── Historial de mantenimientos ── */}
        {maintenanceHistory.length > 0 && (
          <CollapsibleSection title="Historial de mantenimientos" count={maintenanceHistory.length}>
            <table>
              <thead>
                <tr>
                  <th>Inicio</th><th>Fin</th><th>Duración</th><th>Motivo</th>
                </tr>
              </thead>
              <tbody>
                {maintenanceHistory.map((m, i) => (
                  <tr key={m.id || i}>
                    <td>{new Date(m.start).toLocaleDateString('es-ES')}</td>
                    <td>{m.end ? new Date(m.end).toLocaleDateString('es-ES') : 'En curso'}</td>
                    <td>{duration(m.start, m.end)}</td>
                    <td>{m.reason || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CollapsibleSection>
        )}
      </section>

      {/* ── Modal: restablecer estado ── */}
      {resetModal && (
        <>
          <button type="button" className="modal-overlay" aria-label="Cerrar" onClick={() => setResetModal(false)} />
          <dialog open className="modal-box" aria-labelledby="reset-modal-title">
            <h3 id="reset-modal-title">Restablecer a disponible</h3>
            <p>El vehículo pasará a estado <strong>disponible</strong>. Usa esto solo si el estado es incorrecto.</p>
            <div className="modal-actions">
              <button className="button button-outline" onClick={() => setResetModal(false)}>Cancelar</button>
              <button className="button button-primary" onClick={confirmResetState}>Restablecer</button>
            </div>
          </dialog>
        </>
      )}

      {/* ── Modal: encuesta de llegada ── */}
      {surveyModal && (
        <>
          <button type="button" className="modal-overlay" aria-label="Cerrar" onClick={() => setSurveyModal(false)} />
          <dialog open className="modal-box modal-survey" aria-labelledby="survey-title">
            <h3 id="survey-title">Registrar llegada</h3>
            {surveyPreguntas.length > 0 ? (
              <>
                <p style={{ color: 'var(--muted)', marginTop: 0 }}>
                  Responde las preguntas antes de confirmar la llegada.
                </p>
                {surveyPreguntas.map(q => (
                  <div key={q.id_pregunta} className="field">
                    <label htmlFor={`q-${q.id_pregunta}`}>
                      {q.texto}
                      {q.obligatoria && <span style={{ color: 'var(--danger)' }}> *</span>}
                    </label>

                    {q.tipo_respuesta === 'texto' && (
                      <input
                        id={`q-${q.id_pregunta}`}
                        type="text"
                        value={surveyAnswers[q.id_pregunta] || ''}
                        onChange={e => setSurveyAnswers({ ...surveyAnswers, [q.id_pregunta]: e.target.value })}
                        placeholder="Escribe tu respuesta..."
                      />
                    )}
                    {q.tipo_respuesta === 'numero' && (
                      <input
                        id={`q-${q.id_pregunta}`}
                        type="number"
                        value={surveyAnswers[q.id_pregunta] || ''}
                        onChange={e => setSurveyAnswers({ ...surveyAnswers, [q.id_pregunta]: e.target.value })}
                        placeholder="Escribe un número..."
                      />
                    )}
                    {q.tipo_respuesta === 'booleano' && (
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        {['true', 'false'].map(val => (
                          <label key={val} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                            <input
                              type="radio"
                              name={`q-${q.id_pregunta}`}
                              value={val}
                              checked={surveyAnswers[q.id_pregunta] === val}
                              onChange={() => setSurveyAnswers({ ...surveyAnswers, [q.id_pregunta]: val })}
                            />
                            {val === 'true' ? 'Sí' : 'No'}
                          </label>
                        ))}
                      </div>
                    )}
                    {q.tipo_respuesta === 'opciones' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {(q.opciones || []).map(opt => (
                          <label key={opt.id_opcion} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                            <input
                              type="radio"
                              name={`q-${q.id_pregunta}`}
                              value={opt.id_opcion}
                              checked={String(surveyAnswers[q.id_pregunta]) === String(opt.id_opcion)}
                              onChange={() => setSurveyAnswers({ ...surveyAnswers, [q.id_pregunta]: opt.id_opcion })}
                            />
                            {opt.texto}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </>
            ) : (
              <p style={{ color: 'var(--muted)' }}>
                No hay encuesta configurada para este vehículo. Confirma la llegada para completar el viaje.
              </p>
            )}
            <div className="modal-actions">
              <button className="button button-outline" onClick={() => setSurveyModal(false)}>Cancelar</button>
              <button className="button button-primary" onClick={confirmCheckin}>Confirmar llegada</button>
            </div>
          </dialog>
        </>
      )}
    </Layout>
  );
}
