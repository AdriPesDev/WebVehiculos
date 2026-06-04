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
  const [companySurveys, setCompanySurveys] = useState([]);
  const [deleteSurveyModal, setDeleteSurveyModal] = useState(null);

  const [approveModal, setApproveModal] = useState(null);
  const [maintModal, setMaintModal] = useState(null);
  const [maintLoading, setMaintLoading] = useState(false);
  const [endMaintModal, setEndMaintModal] = useState(null);
  const [invoiceFile, setInvoiceFile] = useState(null);

  const company = data?.company || { name: 'Cargando...' };
  const companyVehicles = data?.companyVehicles || [];
  const companyUsers = data?.companyUsers || [];
  const pendingRequests = data?.pendingRequests || [];
  const activeTrips = data?.activeTrips || [];

  const [deleteModal, setDeleteModal] = useState(null);
  const [removeEmpModal, setRemoveEmpModal] = useState(null);

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
  }, []);

  const loadSurveys = useCallback(async () => {
    try {
      const res = await api.getSurveys();
      if (res.surveys) {
        setCompanySurveys(res.surveys);
      }
    } catch {
      // Surveys endpoint no disponible en la API, continuar sin ellas
      setCompanySurveys([]);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await loadSurveys();
    })();
  }, [loadSurveys]);

  if (!data) return <Layout><p className="alert alert-info">Cargando panel...</p></Layout>;

  async function confirmApprove(role) {
    const { requestId, userName } = approveModal;
    setApproveModal(null);
    const res = await api.approveRequest(requestId, role);
    if (res.ok) {
      const label = role === 'admin' ? 'administrador' : 'empleado';
      setFlash({ type: 'success', message: `${userName} aprobado como ${label}.` });
      setData(d => ({ ...d, pendingRequests: d.pendingRequests.filter(r => r.id !== requestId) }));
    } else {
      setFlash({ type: 'error', message: res.error });
    }
  }

  async function handleReject(requestId) {
    const res = await api.rejectRequest(requestId);
    if (res.ok) {
      setFlash({ type: 'success', message: 'Solicitud rechazada.' });
      setData(d => ({ ...d, pendingRequests: d.pendingRequests.filter(r => r.id !== requestId) }));
    } else {
      setFlash({ type: 'error', message: res.error });
    }
  }

  async function confirmMaintenance() {
    setMaintLoading(true);
    const res = await api.startMaintenance(maintModal.vehicleId, maintModal.reason);
    setMaintModal(null);
    setMaintLoading(false);
    if (res.ok) {
      setFlash({ type: 'success', message: 'Mantenimiento iniciado.' });
      const updated = await api.dashboard();
      setData(updated);
    } else {
      setFlash({ type: 'error', message: res.error });
    }
  }

  function handleEndMaintenance(vehicleId, vehicleName) {
    setInvoiceFile(null);
    setEndMaintModal({ vehicleId, vehicleName });
  }

  async function confirmEndMaintenance() {
    const { vehicleId } = endMaintModal;
    setEndMaintModal(null);
    setMaintLoading(true);
    const res = await api.endMaintenance(vehicleId);
    setInvoiceFile(null);
    setMaintLoading(false);
    if (res.ok) {
      setFlash({ type: 'success', message: 'Mantenimiento finalizado.' });
      const updated = await api.dashboard();
      setData(updated);
    } else {
      setFlash({ type: 'error', message: res.error });
    }
  }

  async function confirmDelete() {
    const { vehicleId } = deleteModal;
    setDeleteModal(null);
    const res = await api.deleteVehicle(vehicleId);
    if (res.ok) {
      setFlash({ type: 'success', message: 'Vehículo eliminado.' });
      setData(d => ({ ...d, companyVehicles: d.companyVehicles.filter(v => (v.id || v.id_vehiculo) !== vehicleId) }));
    } else {
      setFlash({ type: 'error', message: res.error });
    }
  }

  async function confirmRemoveEmployee() {
    const { userId } = removeEmpModal;
    setRemoveEmpModal(null);
    const res = await api.removeEmployee(userId);
    if (res.ok) {
      setFlash({ type: 'success', message: 'Empleado retirado.' });
      setData(d => ({ ...d, companyUsers: d.companyUsers.filter(u => u.id !== userId) }));
    } else {
      setFlash({ type: 'error', message: res.error });
    }
  }

  async function confirmDeleteSurvey() {
    const { surveyId } = deleteSurveyModal;
    setDeleteSurveyModal(null);
    const res = await api.deleteSurvey(surveyId);
    if (res.ok) {
      setFlash({ type: 'success', message: 'Encuesta eliminada.' });
      setCompanySurveys(s => s.filter(srv => srv.id !== surveyId));
    } else {
      setFlash({ type: 'error', message: res.error });
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
                  <th>Usuario</th><th>Email</th><th>Fecha</th><th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pendingRequests.map(r => (
                  <tr key={r.id}>
                    <td>{r.userName}</td>
                    <td>{r.userEmail}</td>
                    <td>{new Date(r.createdAt).toLocaleDateString('es-ES')}</td>
                    <td>
                      <button className="button button-outline" onClick={() => setApproveModal({ requestId: r.id, userName: r.userName })}>Aprobar</button>
                      {' '}
                      <button className="button button-danger" onClick={() => handleReject(r.id)}>Rechazar</button>
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
                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)', padding: '1.5rem' }}>No hay vehículos en la flota todavía.</td></tr>
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
                      {inMaint ? (
                        <button className="button button-small button-warning" disabled={maintLoading} onClick={() => handleEndMaintenance(vehicleId, v.modelo || v.model)}>
                          Acabar mant.
                        </button>
                      ) : (
                        <button
                          className="button button-small button-warning"
                          disabled={maintLoading}
                          onClick={() => setMaintModal({ vehicleId: vehicleId, vehicleName: v.modelo || v.model, reason: '' })}
                        >
                          Mantenimiento
                        </button>
                      )}
                      <button
                        className="button button-small button-danger"
                        onClick={() => setDeleteModal({ vehicleId: vehicleId, vehicleName: v.modelo || v.model })}
                      >
                        Eliminar
                      </button>
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
                <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)', padding: '1.5rem' }}>No hay trabajadores en la empresa todavía.</td></tr>
              )}
              {companyUsers.map(u => (
                <tr key={u.id}>
                  <td>{u.nombre}</td>
                  <td>{u.email}</td>
                  <td><span className="badge">{u.rol.charAt(0).toUpperCase() + u.rol.slice(1)}</span></td>
                  <td>
                    {u.rol === 'empleado' && (
                      <button className="button button-small button-danger" onClick={() => setRemoveEmpModal({ userId: u.id, userName: u.nombre })}>
                        Quitar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="table-section">
          <h3>Encuestas de empresa</h3>
          <table>
            <thead>
              <tr>
                <th>Vehículo</th><th>Nº Preguntas</th><th>Fecha creación</th><th>Estado</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {companySurveys.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)', padding: '1.5rem' }}>No hay encuestas creadas todavía.</td></tr>
              )}
              {companySurveys.map(s => (
                <tr key={s.id}>
                  <td>{s.vehicleName}</td>
                  <td>{s.questions.length}</td>
                  <td>{new Date(s.createdAt).toLocaleDateString('es-ES')}</td>
                  <td><span className={`badge ${s.active ? 'badge-success' : 'badge-warning'}`}>{s.active ? 'Activa' : 'Inactiva'}</span></td>
                  <td>
                    <button
                      className="button button-small button-danger"
                      onClick={() => setDeleteSurveyModal({ surveyId: s.id, surveyName: s.vehicleName })}
                    >
                      Eliminar
                    </button>
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Modal: aprobar solicitud ── */}
      {approveModal && (
        <>
          <button type="button" className="modal-overlay" aria-label="Cerrar" onClick={() => setApproveModal(null)} />
          <dialog open className="modal-box" aria-labelledby="approve-modal-title">
            <h3 id="approve-modal-title">Aprobar solicitud</h3>
            <p>¿Con qué rol quieres añadir a <strong>{approveModal.userName}</strong> a la empresa?</p>
            <div className="modal-actions">
              <button className="button button-outline" onClick={() => setApproveModal(null)}>Cancelar</button>
              <button className="button button-outline" onClick={() => confirmApprove('empleado')}>Empleado</button>
              <button className="button button-primary" onClick={() => confirmApprove('admin')}>Administrador</button>
            </div>
          </dialog>
        </>
      )}

      {/* ── Modal: finalizar mantenimiento ── */}
      {endMaintModal && (
        <>
          <button type="button" className="modal-overlay" aria-label="Cerrar" onClick={() => setEndMaintModal(null)} />
          <dialog open className="modal-box" aria-labelledby="endmaint-modal-title">
            <h3 id="endmaint-modal-title">Finalizar mantenimiento</h3>
            <p>Vehículo: <strong>{endMaintModal.vehicleName}</strong></p>
            <div className="field">
              <label htmlFor="invoice-file-admin" className="button button-outline file-btn">
                📎 {invoiceFile ? invoiceFile.name : 'Adjuntar factura (opcional)'}
              </label>
              <input
                id="invoice-file-admin"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                style={{ display: 'none' }}
                onChange={e => setInvoiceFile(e.target.files[0] || null)}
              />
            </div>
            <div className="modal-actions">
              <button className="button button-outline" onClick={() => setEndMaintModal(null)}>Cancelar</button>
              <button className="button button-primary" onClick={confirmEndMaintenance}>Finalizar</button>
            </div>
          </dialog>
        </>
      )}

      {/* ── Modal: motivo de mantenimiento ── */}
      {maintModal && (
        <>
          <button type="button" className="modal-overlay" aria-label="Cerrar" onClick={() => setMaintModal(null)} />

          <dialog open className="modal-box" aria-labelledby="maint-modal-title">
            <h3 id="maint-modal-title">Iniciar mantenimiento</h3>
            <p>Vehículo: <strong>{maintModal.vehicleName}</strong></p>
            <textarea
              rows={3}
              placeholder="Motivo del mantenimiento (opcional)"
              value={maintModal.reason}
              onChange={e => setMaintModal(m => ({ ...m, reason: e.target.value }))}
              autoFocus
            />
            <div className="modal-actions">
              <button className="button button-outline" onClick={() => setMaintModal(null)}>Cancelar</button>
              <button className="button button-warning" onClick={confirmMaintenance}>Iniciar mantenimiento</button>
            </div>
          </dialog>
        </>
      )}

      {/* ── Modal: confirmar eliminación ── */}
      {deleteModal && (
        <>
          <button type="button" className="modal-overlay" aria-label="Cerrar" onClick={() => setDeleteModal(null)} />
          <dialog open className="modal-box" aria-labelledby="delete-modal-title">
            <h3 id="delete-modal-title">Eliminar vehículo</h3>
            <p>
              ¿Seguro que quieres eliminar <strong>{deleteModal.vehicleName}</strong>?
              Esta acción es permanente y no se puede deshacer.
            </p>
            <div className="modal-actions">
              <button className="button button-outline" onClick={() => setDeleteModal(null)}>Cancelar</button>
              <button className="button button-danger" onClick={confirmDelete}>Eliminar</button>
            </div>
          </dialog>
        </>
      )}

      {/* ── Modal: quitar empleado ── */}
      {removeEmpModal && (
        <>
          <button type="button" className="modal-overlay" aria-label="Cerrar" onClick={() => setRemoveEmpModal(null)} />
          <dialog open className="modal-box" aria-labelledby="remove-emp-modal-title">
            <h3 id="remove-emp-modal-title">Quitar empleado</h3>
            <p>
              ¿Seguro que quieres quitar a <strong>{removeEmpModal.userName}</strong> de la empresa?
              El empleado perderá el acceso y quedará sin empresa asignada.
            </p>
            <div className="modal-actions">
              <button className="button button-outline" onClick={() => setRemoveEmpModal(null)}>Cancelar</button>
              <button className="button button-danger" onClick={confirmRemoveEmployee}>Quitar empleado</button>
            </div>
          </dialog>
        </>
      )}

      {/* ── Modal: eliminar encuesta ── */}
      {deleteSurveyModal && (
        <>
          <button type="button" className="modal-overlay" aria-label="Cerrar" onClick={() => setDeleteSurveyModal(null)} />
          <dialog open className="modal-box" aria-labelledby="delete-survey-modal-title">
            <h3 id="delete-survey-modal-title">Eliminar encuesta</h3>
            <p>
              ¿Seguro que quieres eliminar la encuesta de <strong>{deleteSurveyModal.surveyName}</strong>?
              Los viajes completados conservarán sus respuestas, pero los nuevos viajes no tendrán encuesta.
            </p>
            <div className="modal-actions">
              <button className="button button-outline" onClick={() => setDeleteSurveyModal(null)}>Cancelar</button>
              <button className="button button-danger" onClick={confirmDeleteSurvey}>Eliminar encuesta</button>
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
          loadSurveys();
        }}
      />
    </Layout>
  );
}
