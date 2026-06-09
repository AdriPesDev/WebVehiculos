import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import Layout from '../components/Layout';
import Badge from '../components/Badge';
import Alert from '../components/Alert';
import Drawer from '../components/Drawer';
import SurveyBuilderModal from '../components/SurveyBuilderModal';

export default function DashboardAdmin() {
  const [data, setData] = useState(null);
  const [flash, setFlash] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState('vehicle');
  const [surveyModalOpen, setSurveyModalOpen] = useState(false);

  const [surveyResponsesModal, setSurveyResponsesModal] = useState(null);
  const [surveyResponses, setSurveyResponses] = useState([]);
  const [questionHistoryModal, setQuestionHistoryModal] = useState(null);
  const [questionHistory, setQuestionHistory] = useState([]);

  const company = data?.company || { name: 'Cargando...' };
  const companyVehicles = data?.companyVehicles || [];
  const companyUsers = data?.companyUsers || [];
  const pendingRequests = data?.pendingRequests || [];
  const activeTrips = data?.activeTrips || [];

  const [removeEmpModal, setRemoveEmpModal] = useState(null);
  const [surveyQuestions, setSurveyQuestions] = useState([]);
  const [loadingSurveys, setLoadingSurveys] = useState(false);
  const [surveyFilterMode, setSurveyFilterMode] = useState('all'); // 'all' o 'vehicle'
  const [selectedVehicleForSurvey, setSelectedVehicleForSurvey] = useState('');
  const [editQuestionModal, setEditQuestionModal] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [confirmDeleteQuestionModal, setConfirmDeleteQuestionModal] = useState(null);

  useEffect(() => {
    api.dashboard()
      .then(res => {
        console.log('DashboardAdmin data:', res);
        setData(res || {});
      })
      .catch(err => {
        console.error('Failed to load dashboard:', err);
        setData({});
      });

    // Cargar preguntas automáticamente
    loadSurveyQuestions();
  }, []);

  if (!data) return <Layout><p className="alert alert-info">Cargando panel...</p></Layout>;

  async function confirmApprove(requestId) {
    try {
      await api.approveRequest(requestId);
      setFlash({ type: 'success', message: 'Solicitud aprobada. Usuario añadido como empleado.' });
      const updated = await api.dashboard();
      setData(updated);
    } catch (err) {
      setFlash({ type: 'error', message: err.message });
    }
  }

  async function handleReject(requestId) {
    try {
      await api.rejectRequest(requestId);
      setFlash({ type: 'success', message: 'Solicitud rechazada.' });
      const updated = await api.dashboard();
      setData(updated);
    } catch (err) {
      setFlash({ type: 'error', message: err.message });
    }
  }


  async function confirmRemoveEmployee() {
    const { userId } = removeEmpModal;
    setRemoveEmpModal(null);
    try {
      await api.removeEmployee(userId);
      setFlash({ type: 'success', message: 'Empleado desactivado. Sus datos históricos se conservan.' });
      const updated = await api.dashboard();
      setData(updated);
    } catch (err) {
      setFlash({ type: 'error', message: err.message });
    }
  }


  function openDrawer(tab) {
    setDrawerTab(tab);
    setDrawerOpen(true);
  }

  function onVehicleAdded(vehicle) {
    setData(d => ({ ...d, companyVehicles: [...d.companyVehicles, vehicle] }));
    setFlash({ type: 'success', message: 'Vehículo añadido.' });
  }

  function onEmployeeAdded(user) {
    setData(d => ({ ...d, companyUsers: [...d.companyUsers, user] }));
    setFlash({ type: 'success', message: 'Empleado añadido.' });
  }

  async function loadSurveyResponses(usoId) {
    try {
      const res = await api.getSurveyResponses(usoId);
      if (res.ok) {
        setSurveyResponses(res.respuestas || []);
        setSurveyResponsesModal({ usoId });
      } else {
        setFlash({ type: 'error', message: 'Error al cargar respuestas.' });
      }
    } catch (err) {
      setFlash({ type: 'error', message: err.message });
    }
  }

  async function loadSurveyQuestions(vehicleId = null) {
    setLoadingSurveys(true);
    try {
      const res = await api.getAllSurveyQuestions();
      let questions = [];
      if (Array.isArray(res)) {
        questions = res;
      } else if (res?.preguntas && Array.isArray(res.preguntas)) {
        questions = res.preguntas;
      } else if (res?.data && Array.isArray(res.data)) {
        questions = res.data;
      }

      if (vehicleId) {
        const vid = Number(vehicleId);
        const filtered = questions.filter(q => {
          const veh = q.vehiculos;
          if (!veh || veh.length === 0) return true; // sin vehiculo asignado = global
          return veh.some(v => (typeof v === 'object' ? (v.id_vehiculo || v.id) : Number(v)) === vid);
        });
        setSurveyQuestions(filtered);
      } else {
        setSurveyQuestions(questions);
      }
    } catch (err) {
      setFlash({ type: 'error', message: 'Error al cargar preguntas.' });
      setSurveyQuestions([]);
    }
    setLoadingSurveys(false);
  }

  async function loadQuestionHistory(question) {
    try {
      const res = await api.getSurveyHistory(question.id_pregunta);
      if (res.ok) {
        setQuestionHistory(res.respuestas || []);
        setQuestionHistoryModal({ preguntaId: question.id_pregunta, texto: question.texto });
      } else {
        setFlash({ type: 'error', message: 'Error al cargar historial.' });
      }
    } catch (err) {
      setFlash({ type: 'error', message: err.message });
    }
  }

  function handleDeactivateQuestion(questionId) {
    setConfirmDeleteQuestionModal(questionId);
  }

  async function confirmDeleteQuestion() {
    const questionId = confirmDeleteQuestionModal;
    setConfirmDeleteQuestionModal(null);

    try {
      await api.deactivateQuestion(questionId);
      setFlash({ type: 'success', message: 'Pregunta desactivada.' });
      setSurveyQuestions(prev => prev.filter(q => q.id_pregunta !== questionId));
    } catch (err) {
      setFlash({ type: 'error', message: 'Error: ' + err.message });
    }
  }


  function openEditQuestionModal(question) {
    setEditQuestionModal(question);
    setEditingText(question.texto);
  }

  async function handleUpdateQuestion() {
    if (!editingText.trim()) {
      setFlash({ type: 'error', message: 'La pregunta no puede estar vacía.' });
      return;
    }

    try {
      await api.updateQuestion(editQuestionModal.id_pregunta, editingText.trim());
      setFlash({ type: 'success', message: 'Pregunta actualizada.' });
      setEditQuestionModal(null);
      await loadSurveyQuestions();
    } catch (err) {
      setFlash({ type: 'error', message: err.message });
    }
  }


  return (
    <Layout>
      <section className="dashboard">
        <div className="dashboard-header">
          <div>
            <h2>Panel administrativo</h2>
            <p>Empresa: <strong>{company.name}</strong></p>
          </div>
          <div className="dashboard-actions">
            <button className="button button-outline" onClick={() => openDrawer('vehicle')}>
              🚗➕ Añadir vehículo
            </button>
            <button className="button button-outline" onClick={() => openDrawer('employee')}>
              👷➕ Añadir empleado
            </button>
            <button className="button button-outline" onClick={() => setSurveyModalOpen(true)}>
              📋➕ Añadir encuesta
            </button>
          </div>
        </div>

        {flash && <Alert type={flash.type} message={flash.message} onClose={() => setFlash(null)} />}

        <div className="admin-cards">
          <div className="admin-card admin-card-vehicles">
            <h3>🚗 Vehículos</h3>
            <span className="stat-number">{companyVehicles.length}</span>
            <p>en flota</p>
          </div>
          <div className="admin-card admin-card-employees">
            <h3>👥 Empleados</h3>
            <span className="stat-number">{companyUsers.filter(u => u.rol === 'empleado').length}</span>
            <p>empleados activos</p>
          </div>
          <div className="admin-card admin-card-requests">
            <h3>⏳ Solicitudes</h3>
            <span className="stat-number">{pendingRequests.length}</span>
            <p>por revisar</p>
          </div>
        </div>

        {pendingRequests.length > 0 && (
          <div className="table-section">
            <h3>Solicitudes de membresía pendientes</h3>
            <table>
              <thead>
                <tr>
                  <th>Usuario</th><th>Fecha</th><th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pendingRequests.map(r => (
                  <tr key={r.id_solicitud}>
                    <td>{r.nombre_usuario || r.userName || '—'}</td>
                    <td>{new Date(r.fecha_solicitud).toLocaleDateString('es-ES')}</td>
                    <td>
                      <button className="button button-outline" onClick={() => confirmApprove(r.id_solicitud)}>Aprobar</button>
                      {' '}
                      <button className="button button-danger" onClick={() => handleReject(r.id_solicitud)}>Rechazar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="table-section">
          <h3>Vehículos de la empresa</h3>
          <table>
            <thead>
              <tr>
                <th>Matrícula</th><th>Marca</th><th>Modelo</th><th>Estado</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {companyVehicles.length === 0 && (
                <tr><td colSpan={5} className="empty-state">No hay vehículos en la flota todavía.</td></tr>
              )}
              {companyVehicles.map(v => {
                const vehicleId = v.id || v.id_vehiculo;
                const estado = v.estado || v.states || 'disponible';
                const inMaint = Array.isArray(estado) ? estado.includes('mantenimiento') : estado === 'mantenimiento';
                let estadoClass = 'badge-success';
                if (inMaint) {
                  estadoClass = 'badge-danger';
                } else if (Array.isArray(estado) ? estado.includes('en_uso') || estado.includes('ocupado') : estado === 'en_uso' || estado === 'ocupado') {
                  estadoClass = 'badge-warning';
                }
                const estadoDisplay = Array.isArray(estado) ? estado.map(s => s.replaceAll('_', ' ').charAt(0).toUpperCase() + s.replaceAll('_', ' ').slice(1)).join(', ') : estado.replaceAll('_', ' ').charAt(0).toUpperCase() + estado.replaceAll('_', ' ').slice(1);
                return (
                  <tr key={vehicleId}>
                    <td>{v.matricula || v.plate}</td>
                    <td>{v.marca || v.brand || 'N/A'}</td>
                    <td>{v.modelo || v.model}</td>
                    <td>{Array.isArray(estado) ? <Badge states={estado} /> : <span className={`badge ${estadoClass}`}>{estadoDisplay}</span>}</td>
                    <td className="table-actions">
                      <Link to={`/vehicle/${vehicleId}`} className="button button-small button-outline">Detalles</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="table-section">
          <h3>Empleados de la empresa</h3>
          <table>
            <thead>
              <tr>
                <th>Nombre</th><th>Email</th><th>Rol</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {companyUsers.length === 0 && (
                <tr><td colSpan={4} className="empty-state">No hay trabajadores en la empresa todavía.</td></tr>
              )}
              {companyUsers.filter(u => u.activo !== false).map(u => (
                <tr key={u.id_usuario || u.id}>
                  <td>{u.nombre}</td>
                  <td>{u.email}</td>
                  <td><span className="badge">{u.rol.charAt(0).toUpperCase() + u.rol.slice(1)}</span></td>
                  <td>
                    {u.rol === 'empleado' && (
                      <button className="button button-small button-danger" onClick={() => setRemoveEmpModal({ userId: u.id_usuario, userName: u.nombre })}>
                        Quitar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {activeTrips.length > 0 && (
          <div className="table-section">
            <h3>Viajes en curso ({activeTrips.length})</h3>
            <table>
              <thead>
                <tr>
                  <th>Vehículo</th><th>Matrícula</th><th>Conductor</th><th>Destino</th><th>Salida</th><th>Pasajeros</th><th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {activeTrips.map(t => (
                  <tr key={t.id}>
                    <td>{t.vehicleModel}</td>
                    <td>{t.vehiclePlate}</td>
                    <td>{t.driverName}</td>
                    <td>{t.destination || '—'}</td>
                    <td>{new Date(t.checkoutTime).toLocaleString('es-ES')}</td>
                    <td>{t.passengers?.length ?? 0}</td>
                    <td>
                      <Link to={`/vehicle/${t.vehicle_id}`} className="button button-small button-outline">
                        Gestionar
                      </Link>
                      <button
                        className="button button-small button-outline"
                        onClick={() => loadSurveyResponses(t.id)}
                      >
                        Respuestas
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="table-section">
          <h3>Gestión de encuestas</h3>

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <button
              className={`button ${surveyFilterMode === 'all' ? 'button-primary' : 'button-outline'}`}
              onClick={() => {
                setSurveyFilterMode('all');
                setSelectedVehicleForSurvey('');
                loadSurveyQuestions();
              }}
            >
              Todas las preguntas
            </button>
            <button
              className={`button ${surveyFilterMode === 'vehicle' ? 'button-primary' : 'button-outline'}`}
              onClick={() => {
                setSurveyFilterMode('vehicle');
                setSurveyQuestions([]);
                setSelectedVehicleForSurvey('');
              }}
            >
              Por vehículo
            </button>
          </div>

          {surveyFilterMode === 'vehicle' && (
            <div className="select-field">
              <label htmlFor="vehicle-select">Selecciona un vehículo</label>
              <select
                id="vehicle-select"
                value={selectedVehicleForSurvey}
                onChange={(e) => {
                  const vehicleId = e.target.value;
                  setSelectedVehicleForSurvey(vehicleId);
                  if (vehicleId) {
                    loadSurveyQuestions(vehicleId);
                  } else {
                    setSurveyQuestions([]);
                  }
                }}
              >
                <option value="">-- Selecciona un vehículo --</option>
                {companyVehicles.map(v => (
                  <option key={v.id_vehiculo || v.id} value={v.id_vehiculo || v.id}>
                    {v.matricula || v.plate} - {v.marca || v.brand} {v.modelo || v.model}
                  </option>
                ))}
              </select>
            </div>
          )}

          {surveyFilterMode === 'vehicle' && !selectedVehicleForSurvey ? (
            <p className="empty-state">
              Selecciona un vehículo para ver sus preguntas.
            </p>
          ) : (
            <>
              {loadingSurveys && (
                <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '1rem' }}>Cargando preguntas...</p>
              )}

              {surveyQuestions.length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th>Pregunta</th>
                      <th>Tipo</th>
                      <th>Obligatoria</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {surveyQuestions.map(q => (
                      <tr key={q.id_pregunta} style={q.activa === false ? { opacity: 0.6 } : undefined}>
                        <td>{q.texto}</td>
                        <td>{q.tipo_respuesta}</td>
                        <td>{q.obligatoria ? 'Sí' : 'No'}</td>
                        <td>
                          <span className={`badge ${q.activa === false ? 'badge-danger' : 'badge-success'}`}>
                            {q.activa === false ? 'Inactiva' : 'Activa'}
                          </span>
                        </td>
                        <td className="table-cell-actions">
                          <button
                            className="button button-small button-outline"
                            onClick={() => loadQuestionHistory(q)}
                            title="Ver historial de respuestas"
                          >
                            Historial
                          </button>
                          <button
                            className="button button-small button-outline"
                            onClick={() => openEditQuestionModal(q)}
                            title="Editar pregunta"
                          >
                            Editar
                          </button>
                          {q.activa !== false && (
                            <button
                              className="button button-small button-danger"
                              onClick={() => handleDeactivateQuestion(q.id_pregunta)}
                              title="Desactivar pregunta"
                            >
                              Desactivar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="empty-state">
                  {surveyFilterMode === 'vehicle' ? 'No hay preguntas para este vehículo.' : 'No hay preguntas creadas todavía.'}
                </p>
              )}
            </>
          )}
        </div>
      </section>

      {/* ── Modal: aprobar solicitud ── */}

      {/* ── Modal: quitar empleado ── */}
      {removeEmpModal && (
        <>
          <button type="button" className="modal-overlay" aria-label="Cerrar" onClick={() => setRemoveEmpModal(null)} />
          <dialog open className="modal-box" aria-labelledby="remove-emp-modal-title">
            <h3 id="remove-emp-modal-title">Desactivar empleado</h3>
            <p>
              ¿Seguro que quieres desactivar a <strong>{removeEmpModal.userName}</strong>?
              Perderá el acceso pero sus datos e historial de viajes se conservarán.
            </p>
            <div className="modal-actions">
              <button className="button button-outline" onClick={() => setRemoveEmpModal(null)}>Cancelar</button>
              <button className="button button-danger" onClick={confirmRemoveEmployee}>Desactivar</button>
            </div>
          </dialog>
        </>
      )}

      {/* ── Modal: eliminar encuesta ── */}
      {/* ── Modal: respuestas de encuesta ── */}
      {surveyResponsesModal && (
        <>
          <button type="button" className="modal-overlay" aria-label="Cerrar" onClick={() => setSurveyResponsesModal(null)} />
          <dialog open className="modal-box" aria-labelledby="survey-responses-modal-title">
            <h3 id="survey-responses-modal-title">Respuestas de encuesta</h3>
            {surveyResponses.length === 0 ? (
              <p style={{ color: 'var(--muted)' }}>No hay respuestas registradas para este viaje.</p>
            ) : (
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {surveyResponses.map((resp, i) => (
                  <div key={i} style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                    <strong>{resp.texto_pregunta}</strong>
                    <p style={{ marginTop: '0.5rem', color: 'var(--muted)' }}>
                      {resp.valor_numero && `${resp.valor_numero} km`}
                      {resp.texto_opcion && resp.texto_opcion}
                      {resp.valor_texto && resp.valor_texto}
                      {resp.valor_boolean !== null && resp.valor_boolean !== undefined && (resp.valor_boolean ? 'Sí' : 'No')}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <div className="modal-actions">
              <button className="button button-outline" onClick={() => setSurveyResponsesModal(null)}>Cerrar</button>
            </div>
          </dialog>
        </>
      )}

      {/* ── Modal: historial de pregunta ── */}
      {questionHistoryModal && (
        <>
          <button type="button" className="modal-overlay" aria-label="Cerrar" onClick={() => setQuestionHistoryModal(null)} />
          <dialog open className="modal-box" aria-labelledby="q-history-title">
            <h3 id="q-history-title" style={{ marginBottom: '0.25rem' }}>Historial de respuestas</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: 0, marginBottom: '1rem' }}>
              {questionHistoryModal.texto}
            </p>
            {questionHistory.length === 0 ? (
              <p style={{ color: 'var(--muted)' }}>No hay respuestas registradas para esta pregunta.</p>
            ) : (
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {questionHistory.map((resp, i) => {
                  const valor = resp.valor_texto || resp.valor_opcion
                    || (resp.valor_numero != null ? String(resp.valor_numero) : null)
                    || (resp.valor_boolean != null ? (resp.valor_boolean ? 'Sí' : 'No') : null);
                  return (
                    <div key={resp.id_respuesta || i} style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <strong>{resp.nombre_conductor || '—'}</strong>
                        <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                          {resp.fecha_salida ? new Date(resp.fecha_salida).toLocaleDateString('es-ES') : '—'}
                        </span>
                      </div>
                      <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                        {[resp.marca, resp.modelo, resp.matricula ? `(${resp.matricula})` : null].filter(Boolean).join(' ')}
                      </span>
                      <p style={{ margin: '0.25rem 0 0', color: valor ? 'inherit' : 'var(--muted)', fontStyle: valor ? 'normal' : 'italic' }}>
                        {valor || 'Sin respuesta'}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="modal-actions">
              <button className="button button-outline" onClick={() => setQuestionHistoryModal(null)}>Cerrar</button>
            </div>
          </dialog>
        </>
      )}

      {/* ── Modal: editar pregunta ── */}
      {editQuestionModal && (
        <>
          <button type="button" className="modal-overlay" aria-label="Cerrar" onClick={() => setEditQuestionModal(null)} />
          <dialog open className="modal-box" aria-labelledby="edit-question-modal-title">
            <h3 id="edit-question-modal-title">Editar pregunta</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              <strong>Tipo:</strong> {editQuestionModal.tipo_respuesta}
            </p>
            <div className="field">
              <label htmlFor="question-text">Texto de la pregunta</label>
              <textarea
                id="question-text"
                value={editingText}
                onChange={(e) => setEditingText(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid var(--border)',
                  borderRadius: '0.25rem',
                  fontFamily: 'inherit',
                  minHeight: '100px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div className="modal-actions">
              <button className="button button-outline" onClick={() => setEditQuestionModal(null)}>Cancelar</button>
              <button className="button button-primary" onClick={handleUpdateQuestion}>Guardar</button>
            </div>
          </dialog>
        </>
      )}

      {/* ── Modal: confirmar eliminación de pregunta ── */}
      {confirmDeleteQuestionModal && (
        <>
          <button type="button" className="modal-overlay" aria-label="Cerrar" onClick={() => setConfirmDeleteQuestionModal(null)} />
          <dialog open className="modal-box" aria-labelledby="confirm-delete-question-title">
            <h3 id="confirm-delete-question-title">Desactivar pregunta</h3>
            <p>
              ¿Seguro que quieres desactivar esta pregunta? Los datos históricos se conservarán.
            </p>
            <div className="modal-actions">
              <button className="button button-outline" onClick={() => setConfirmDeleteQuestionModal(null)}>Cancelar</button>
              <button className="button button-danger" onClick={confirmDeleteQuestion}>Desactivar</button>
            </div>
          </dialog>
        </>
      )}

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onVehicleAdded={onVehicleAdded}
        onEmployeeAdded={onEmployeeAdded}
        initialTab={drawerTab}
        companyLocation={company.location}
      />

      <SurveyBuilderModal
        open={surveyModalOpen}
        onClose={() => setSurveyModalOpen(false)}
        companyVehicles={companyVehicles}
        onSurveyCreated={() => {
          setFlash({ type: 'success', message: 'Encuesta creada y asignada.' });
          setSurveyModalOpen(false);
        }}
      />
    </Layout>
  );
}
