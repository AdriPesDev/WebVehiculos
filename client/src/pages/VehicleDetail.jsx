import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import Badge from '../components/Badge';
import Alert from '../components/Alert';
import SurveyResponsesModal from '../components/SurveyResponsesModal';

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
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [flash, setFlash] = useState(null);

  const [checkoutDriverId, setCheckoutDriverId] = useState('');
  const [destination, setDestination] = useState('');
  const [passengerMode, setPassengerMode] = useState('employee');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [freeName, setFreeName] = useState('');
  const [addingPassenger, setAddingPassenger] = useState(false);

  const [surveyModal, setSurveyModal] = useState(false);
  const [surveyTemplate, setSurveyTemplate] = useState(null);
  const [surveyAnswers, setSurveyAnswers] = useState({});
  const [resetModal, setResetModal] = useState(false);
  const [viewSurveyModal, setViewSurveyModal] = useState(null);

  async function refresh() {
    const res = await api.vehicleDetail(id);
    if (!res.error) setData(res);
  }

  useEffect(() => {
    api.vehicleDetail(id)
      .then(res => {
        if (res.error) setError(res.error);
        else setData(res);
      })
      .catch(() => setError('Error al cargar el vehículo.'));
  }, [id]);

  useEffect(() => {
    if (data && data.surveyTemplate && !surveyTemplate) {
      setSurveyTemplate(data.surveyTemplate);
      setSurveyAnswers({});
    }
  }, [data?.surveyTemplate?.id]);

  if (error) return <Layout><p className="alert alert-error">{error}</p></Layout>;
  if (!data) return <Layout><p>Cargando vehículo...</p></Layout>;

  const { vehicle, vehicleTrips, company, activeTrip, canManageTrip, companyUsers } = data;
  const states = vehicle.states || [];
  const maintenanceHistory = vehicle.maintenanceHistory || [];
  const isAvailable = states.includes('disponible') && !activeTrip;

  async function handleCheckout() {
    const res = await api.checkout(vehicle.id, checkoutDriverId || null, destination || null);
    if (res.ok) {
      setFlash({ type: 'success', message: 'Vehículo en uso.' });
      await refresh();
    } else {
      setFlash({ type: 'error', message: res.error });
    }
  }

  async function confirmCheckin() {
    if (surveyTemplate) {
      for (const q of surveyTemplate.questions) {
        if (q.required && !surveyAnswers[q.id]) {
          setFlash({ type: 'error', message: `La pregunta "${q.text}" es obligatoria.` });
          return;
        }
      }
    }

    const survey = surveyTemplate ? {
      templateId: surveyTemplate.id,
      answers: surveyAnswers,
    } : null;

    const res = await api.checkin(vehicle.id, null, null, survey);
    setSurveyModal(false);
    setSurveyTemplate(null);
    setSurveyAnswers({});
    if (res.ok) {
      setFlash({ type: 'success', message: 'Vehículo devuelto. Viaje completado.' });
      await refresh();
    } else {
      setFlash({ type: 'error', message: res.error });
    }
  }

  async function confirmResetState() {
    setResetModal(false);
    const res = await api.resetVehicleState(vehicle.id);
    if (res.ok) {
      setFlash({ type: 'success', message: 'Estado restablecido a disponible.' });
      await refresh();
    } else {
      setFlash({ type: 'error', message: res.error });
    }
  }

  async function handleAddPassenger(e) {
    e.preventDefault();
    setAddingPassenger(true);
    let passengerName;
    let userId = null;

    if (passengerMode === 'employee') {
      const emp = companyUsers.find(u => u.id === selectedUserId);
      if (!emp) { setFlash({ type: 'error', message: 'Selecciona un empleado.' }); setAddingPassenger(false); return; }
      passengerName = emp.name;
      userId = emp.id;
    } else {
      passengerName = freeName.trim();
      if (!passengerName) { setFlash({ type: 'error', message: 'Escribe el nombre del pasajero.' }); setAddingPassenger(false); return; }
    }

    const res = await api.addPassenger(vehicle.id, passengerName, userId);
    setAddingPassenger(false);
    if (res.ok) {
      setSelectedUserId('');
      setFreeName('');
      setFlash({ type: 'success', message: 'Pasajero añadido.' });
      await refresh();
    } else {
      setFlash({ type: 'error', message: res.error });
    }
  }

  async function handleRemovePassenger(idx) {
    const res = await api.removePassenger(vehicle.id, idx);
    if (res.ok) {
      setFlash({ type: 'success', message: 'Pasajero eliminado.' });
      await refresh();
    } else {
      setFlash({ type: 'error', message: res.error });
    }
  }

  return (
    <Layout>
      <section className="dashboard">
        <div className="dashboard-header">
          <div>
            <h2>{vehicle.model}</h2>
            <p>Matrícula: <strong>{vehicle.plate}</strong> · {company?.name}</p>
          </div>
          <Link to="/dashboard" className="button button-outline">← Volver al panel</Link>
        </div>

        {flash && <Alert type={flash.type} message={flash.message} onClose={() => setFlash(null)} />}

        <div className="admin-cards">
          <div className="admin-card">
            <h3>Estado</h3>
            <Badge states={states} />
          </div>
          <div className="admin-card admin-card-vehicles">
            <h3>Capacidad</h3>
            <span className="stat-number">{vehicle.capacity}</span>
          </div>
          <div className="admin-card admin-card-employees">
            <h3>Ubicación</h3>
            <span className="stat-number" style={{ fontSize: '1.2rem' }}>{vehicle.location}</span>
          </div>
          <div className="admin-card admin-card-requests">
            <h3>Total viajes</h3>
            <span className="stat-number">{vehicleTrips.length}</span>
          </div>
          <div className="admin-card">
            <h3>Km totales</h3>
            <span className="stat-number">{vehicle.totalKm ?? 0}</span>
            <p>kilómetros</p>
          </div>
        </div>

        {/* ── Checkout (vehículo disponible) ── */}
        {isAvailable && (
          <div className="table-section">
            <h3>Registrar salida</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
              {(user?.role === 'admin' || user?.role === 'superadmin') && (
                <div className="field-group">
                  <label htmlFor="checkout-driver">Conductor</label>
                  <select id="checkout-driver" className="input-inline" value={checkoutDriverId} onChange={e => setCheckoutDriverId(e.target.value)}>
                    {user?.role !== 'superadmin' && <option value="">Yo mismo</option>}
                    {companyUsers
                      .filter(u => user?.role === 'superadmin' || u.id !== user?.id)
                      .map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                  </select>
                </div>
              )}
              <div className="field-group">
                <label htmlFor="checkout-dest">Destino</label>
                <input
                  id="checkout-dest"
                  type="text"
                  className="input-inline"
                  placeholder="Ciudad o dirección (opcional)"
                  value={destination}
                  onChange={e => setDestination(e.target.value)}
                  style={{ minWidth: 200 }}
                />
              </div>
              <button
                className="button button-outline"
                onClick={handleCheckout}
                disabled={user?.role === 'superadmin' && !checkoutDriverId}
              >
                Registrar salida
              </button>
            </div>
          </div>
        )}

        {/* ── Reseteo de estado (admin, sin viaje activo) ── */}
        {user?.role === 'admin' && !isAvailable && !activeTrip && (
          <div className="table-section" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <p style={{ margin: 0, color: 'var(--muted)' }}>El vehículo aparece como no disponible sin viaje activo registrado.</p>
            <button className="button button-outline" onClick={() => setResetModal(true)}>
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
              {activeTrip.destination && (
                <> &nbsp;·&nbsp; <strong>Destino:</strong> {activeTrip.destination}</>
              )}
            </p>

            {/* Pasajeros */}
            <div style={{ margin: '0.75rem 0' }}>
              <strong>Pasajeros ({activeTrip.passengers?.length ?? 0}):</strong>
              {activeTrip.passengers?.length === 0 && (
                <span style={{ color: 'var(--muted)', marginLeft: '0.5rem' }}>Sin pasajeros aún.</span>
              )}
              <ul style={{ margin: '0.5rem 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {(activeTrip.passengers || []).map((p, i) => (
                  <li key={p.user_id || `${p.name}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>
                      {p.name}
                      {p.user_id && (
                        <span className="badge badge-success" style={{ marginLeft: '0.4rem', fontSize: '0.7rem' }}>
                          empleado
                        </span>
                      )}
                    </span>
                    {canManageTrip && (
                      <button
                        className="button button-small button-danger"
                        onClick={() => handleRemovePassenger(i)}
                        title="Eliminar pasajero"
                      >
                        ✕
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
                    aria-pressed={passengerMode === 'employee'}
                    onClick={() => setPassengerMode('employee')}
                  >
                    Empleado registrado
                  </button>
                  <button
                    type="button"
                    className={`button button-small button-outline${passengerMode === 'free' ? ' is-active' : ''}`}
                    aria-pressed={passengerMode === 'free'}
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
                  + Añadir
                </button>
              </form>
            )}

            {/* Checkin */}
            <div style={{ marginTop: '1.25rem' }}>
              <button className="button button-outline" onClick={() => setSurveyModal(true)}>
                Registrar llegada
              </button>
            </div>
          </div>
        )}

        {/* ── Historial de viajes ── */}
        <div className="table-section">
          <h3>Historial de viajes</h3>
          {vehicleTrips.length === 0 ? (
            <p style={{ color: 'var(--muted)' }}>
              {user?.role === 'empleado'
                ? 'No tienes viajes registrados en este vehículo.'
                : 'Sin viajes registrados.'}
            </p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Conductor</th><th>Destino</th><th>Salida</th><th>Entrada</th><th>Duración</th><th>Km</th><th>Pasajeros</th><th>Survey</th><th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {vehicleTrips.map(t => (
                  <tr key={t.id}>
                    <td>{t.driverName}</td>
                    <td>{t.destination || '—'}</td>
                    <td>{new Date(t.checkoutTime).toLocaleString('es-ES')}</td>
                    <td>{t.checkinTime ? new Date(t.checkinTime).toLocaleString('es-ES') : '—'}</td>
                    <td>{duration(t.checkoutTime, t.checkinTime)}</td>
                    <td>{t.km == null ? '—' : `${t.km} km`}</td>
                    <td>
                      {(t.passengers?.length ?? 0) > 0
                        ? `${t.passengers.length} (${t.passengers.map(p => p.name).join(', ')})`
                        : '0'}
                    </td>
                    <td>
                      {t.status === 'completed' && t.survey ? (
                        <button
                          className="button button-small button-outline"
                          onClick={() => setViewSurveyModal({ survey: t.survey, trip: t })}
                        >
                          Ver
                        </button>
                      ) : (
                        '—'
                      )}
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
          )}
        </div>

        {/* ── Historial de mantenimientos ── */}
        {maintenanceHistory.length > 0 && (
          <div className="table-section">
            <h3>Historial de mantenimientos</h3>
            <table>
              <thead>
                <tr>
                  <th>Inicio</th><th>Fin</th><th>Duración</th><th>Motivo</th><th>Factura</th>
                </tr>
              </thead>
              <tbody>
                {maintenanceHistory.map((m, i) => (
                  <tr key={m.start || i}>
                    <td>{new Date(m.start).toLocaleString('es-ES')}</td>
                    <td>{m.end ? new Date(m.end).toLocaleString('es-ES') : 'En curso'}</td>
                    <td>{duration(m.start, m.end)}</td>
                    <td>{m.reason || '—'}</td>
                    <td>
                      {m.invoicePath
                        ? <a href={m.invoicePath} target="_blank" rel="noreferrer" className="button button-small button-outline">Ver</a>
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Modal: restablecer estado ── */}
      {resetModal && (
        <>
          <button type="button" className="modal-overlay" aria-label="Cerrar" onClick={() => setResetModal(false)} />
          <dialog open className="modal-box" aria-labelledby="reset-modal-title">
            <h3 id="reset-modal-title">Restablecer a disponible</h3>
            <p>El vehículo pasará a estado <strong>disponible</strong> aunque no haya un viaje registrado. Usa esto solo si el estado es incorrecto.</p>
            <div className="modal-actions">
              <button className="button button-outline" onClick={() => setResetModal(false)}>Cancelar</button>
              <button className="button button-primary" onClick={confirmResetState}>Restablecer</button>
            </div>
          </dialog>
        </>
      )}

      {/* ── Modal: encuesta de devolución ── */}
      {surveyModal && (
        <>
          <button type="button" className="modal-overlay" aria-label="Cerrar" onClick={() => setSurveyModal(false)} />
          <dialog open className="modal-box modal-survey" aria-labelledby="survey-title">
            <h3 id="survey-title">Registrar llegada</h3>
            {surveyTemplate ? (
              <>
                <p style={{ color: 'var(--muted)', marginTop: 0 }}>Responde las preguntas de la encuesta.</p>
                {surveyTemplate.questions.map((q) => (
                  <div key={q.id} className="field">
                    <label htmlFor={`q-${q.id}`}>
                      {q.text}
                      {q.required && <span style={{ color: 'var(--danger)' }}>*</span>}
                    </label>
                    {q.type === 'text' && (
                      <input
                        id={`q-${q.id}`}
                        type="text"
                        value={surveyAnswers[q.id] || ''}
                        onChange={(e) => setSurveyAnswers({ ...surveyAnswers, [q.id]: e.target.value })}
                        placeholder="Escribe tu respuesta..."
                      />
                    )}
                    {q.type === 'number' && (
                      <input
                        id={`q-${q.id}`}
                        type="number"
                        value={surveyAnswers[q.id] || ''}
                        onChange={(e) => setSurveyAnswers({ ...surveyAnswers, [q.id]: e.target.value })}
                        placeholder="Escribe un número..."
                      />
                    )}
                    {q.type === 'km' && (
                      <input
                        id={`q-${q.id}`}
                        type="number"
                        min="0"
                        value={surveyAnswers[q.id] || ''}
                        onChange={(e) => setSurveyAnswers({ ...surveyAnswers, [q.id]: e.target.value })}
                        placeholder="ej. 142"
                      />
                    )}
                    {q.type === 'radio' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {q.options.map((opt, idx) => (
                          <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                            <input
                              type="radio"
                              name={q.id}
                              value={opt}
                              checked={surveyAnswers[q.id] === opt}
                              onChange={() => setSurveyAnswers({ ...surveyAnswers, [q.id]: opt })}
                            />
                            {opt}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </>
            ) : (
              <p style={{ color: 'var(--muted)' }}>No hay encuesta asignada a este vehículo. Confirma la devolución para completar el viaje.</p>
            )}

            <div className="modal-actions">
              <button className="button button-outline" onClick={() => setSurveyModal(false)}>Cancelar</button>
              <button className="button button-primary" onClick={confirmCheckin}>Confirmar llegada</button>
            </div>
          </dialog>
        </>
      )}

      {viewSurveyModal && surveyTemplate && (
        <SurveyResponsesModal
          open={!!viewSurveyModal}
          onClose={() => setViewSurveyModal(null)}
          survey={viewSurveyModal.survey}
          template={surveyTemplate}
        />
      )}
    </Layout>
  );
}
