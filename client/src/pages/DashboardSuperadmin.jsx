import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { api } from '../services/api';
import Layout from '../components/Layout';
import Alert from '../components/Alert';
import Badge from '../components/Badge';
import Drawer from '../components/Drawer';
import SurveyBuilderModal from '../components/SurveyBuilderModal';
import Icon from '../components/icons';
import CollapsibleSection from '../components/CollapsibleSection';

export default function DashboardSuperadmin({ data: initialData }) {
  const [data, setData] = useState(initialData);
  const [flash, setFlash] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleteVehicleModal, setDeleteVehicleModal] = useState(null);
  const [maintModal, setMaintModal] = useState(null);
  const [maintLoading, setMaintLoading] = useState(false);
  const [endMaintModal, setEndMaintModal] = useState(null);
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [removeWorkerModal, setRemoveWorkerModal] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState('vehicle');
  const [surveyModalOpen, setSurveyModalOpen] = useState(false);
  const [companySurveys, setCompanySurveys] = useState([]);
  const [deleteSurveyModal, setDeleteSurveyModal] = useState(null);

  const { companies, users, vehicles } = data;

  useEffect(() => {
    loadSurveys();
  }, []);

  async function loadSurveys() {
    const res = await api.getSurveys();
    if (res.surveys) setCompanySurveys(res.surveys);
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
    const res = await api.endMaintenance(vehicleId, invoiceFile);
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

  async function confirmDeleteVehicle() {
    const { vehicleId } = deleteVehicleModal;
    setDeleteVehicleModal(null);
    const res = await api.deleteVehicle(vehicleId);
    if (res.ok) {
      setFlash({ type: 'success', message: 'Vehículo eliminado.' });
      setData(d => ({ ...d, vehicles: d.vehicles.filter(v => v.id !== vehicleId) }));
    } else {
      setFlash({ type: 'error', message: res.error });
    }
  }

  async function confirmRemoveWorker() {
    const { userId, userName } = removeWorkerModal;
    setRemoveWorkerModal(null);
    const res = await api.removeEmployee(userId);
    if (res.ok) {
      setFlash({ type: 'success', message: `${userName} ha sido desvinculado de su empresa.` });
      setData(d => ({ ...d, users: d.users.map(u => u.id === userId ? { ...u, role: 'sin_empresa', company_id: null } : u) }));
    } else {
      setFlash({ type: 'error', message: res.error });
    }
  }

  async function confirmDeleteCompany() {
    const { companyId, companyName } = deleteModal;
    setDeleteModal(null);
    const res = await api.deleteCompany(companyId);
    if (res.ok) {
      setFlash({ type: 'success', message: `Empresa "${companyName}" eliminada.` });
      setData(d => ({ ...d, companies: d.companies.filter(c => c.id !== companyId) }));
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

  function onVehicleAdded(vehicle) {
    setData(d => ({ ...d, vehicles: [...d.vehicles, vehicle] }));
    setFlash({ type: 'success', message: 'Vehículo añadido.' });
  }

  function onEmployeeAdded(user) {
    setData(d => ({ ...d, users: [...d.users, user] }));
    setFlash({ type: 'success', message: 'Empleado añadido.' });
  }

  const inMaintenance = vehicles.filter(v =>
    (v.states || []).some(s => s === 'mantenimiento' || s === 'maintenance')
  ).length;

  return (
    <Layout>
      <section className="dashboard">
        <div className="dashboard-header">
          <h2>Panel de superadministrador</h2>
          <p>Vista global del sistema Nethive</p>
        </div>

        {flash && <Alert type={flash.type} message={flash.message} onClose={() => setFlash(null)} />}

        <div className="dashboard-actions">
          <button className="button button-outline" onClick={() => { setDrawerTab('vehicle'); setDrawerOpen(true); }}>
            <Icon name="van" size={18} /> Añadir vehículo
          </button>
          <button className="button button-outline" onClick={() => { setDrawerTab('employee'); setDrawerOpen(true); }}>
            <Icon name="user" size={18} /> Añadir empleado
          </button>
          <button className="button button-outline" onClick={() => setSurveyModalOpen(true)}>
            <Icon name="clipboard" size={18} /> Añadir encuesta
          </button>
        </div>

        <div className="admin-cards">
          <div className="admin-card admin-card-vehicles">
            <h3><Icon name="building" size={16} className="h-icon" /> Empresas</h3>
            <span className="stat-number">{companies.length}</span>
            <p>registradas</p>
          </div>
          <div className="admin-card admin-card-employees">
            <h3><Icon name="users" size={16} className="h-icon" /> Usuarios</h3>
            <span className="stat-number">{users.length}</span>
            <p>en el sistema</p>
          </div>
          <div className="admin-card admin-card-requests">
            <h3><Icon name="van" size={16} className="h-icon" /> Vehículos</h3>
            <span className="stat-number">{vehicles.length}</span>
            <p>en flota global</p>
          </div>
          <div className="admin-card">
            <h3><Icon name="wrench" size={16} className="h-icon" /> En mantenimiento</h3>
            <span className="stat-number">{inMaintenance}</span>
            <p>vehículos</p>
          </div>
        </div>

        <CollapsibleSection title="Empresas registradas">
          <table>
            <thead>
              <tr>
                <th>Nombre</th><th>Email</th><th>Vehículos</th><th>Empleados</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {companies.map(c => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.email}</td>
                  <td>{vehicles.filter(v => v.company_id === c.id).length}</td>
                  <td>{users.filter(u => u.company_id === c.id && u.role === 'empleado').length}</td>
                  <td>
                    <button
                      className="icon-btn icon-btn-danger"
                      title="Eliminar empresa"
                      aria-label="Eliminar empresa"
                      onClick={() => setDeleteModal({ companyId: c.id, companyName: c.name, confirmed: false })}
                    >
                      <Icon name="trash" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CollapsibleSection>

        <CollapsibleSection title="Trabajadores del sistema">
          <table>
            <thead>
              <tr>
                <th>Nombre</th><th>Email</th><th>Empresa</th><th>Rol</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.filter(u => u.role !== 'superadmin' && u.company_id).length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)', padding: '1.5rem' }}>No hay trabajadores registrados.</td></tr>
              )}
              {users
                .filter(u => u.role !== 'superadmin' && u.company_id)
                .sort((a, b) => {
                  const ca = companies.find(c => c.id === a.company_id)?.name || '';
                  const cb = companies.find(c => c.id === b.company_id)?.name || '';
                  return ca.localeCompare(cb, 'es');
                })
                .map(u => {
                const company = companies.find(c => c.id === u.company_id);
                return (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>{company?.name || '—'}</td>
                    <td><span className="badge">{u.role.charAt(0).toUpperCase() + u.role.slice(1)}</span></td>
                    <td>
                      <button
                        className="icon-btn icon-btn-danger"
                        title="Quitar del sistema"
                        aria-label="Quitar del sistema"
                        onClick={() => setRemoveWorkerModal({ userId: u.id, userName: u.name })}
                      >
                        <Icon name="trash" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CollapsibleSection>

        <CollapsibleSection title="Vehículos del sistema">
          <table>
            <thead>
              <tr>
                <th>Modelo</th><th>Matrícula</th><th>Empresa</th><th>Estado</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {[...vehicles]
                .sort((a, b) => {
                  const ca = companies.find(c => c.id === a.company_id)?.name || '';
                  const cb = companies.find(c => c.id === b.company_id)?.name || '';
                  return ca.localeCompare(cb, 'es');
                })
                .map(v => {
                const company = companies.find(c => c.id === v.company_id);
                const states = v.states || [];
                const inMaint = states.includes('mantenimiento') || states.includes('maintenance');
                return (
                  <tr key={v.id}>
                    <td>{v.model}</td>
                    <td>{v.plate}</td>
                    <td>{company?.name || '—'}</td>
                    <td><Badge states={states} /></td>
                    <td className="table-actions">
                      <Link to={`/vehicle/${v.id}`} className="icon-btn icon-btn-accent" title="Ver detalles" aria-label="Ver detalles">
                        <Icon name="eye" />
                      </Link>
                      {inMaint ? (
                        <button className="icon-btn icon-btn-warning" title="Finalizar mantenimiento" aria-label="Finalizar mantenimiento" disabled={maintLoading} onClick={() => handleEndMaintenance(v.id, v.model)}>
                          <Icon name="check" />
                        </button>
                      ) : (
                        <button className="icon-btn icon-btn-warning" title="Poner en mantenimiento" aria-label="Poner en mantenimiento" disabled={maintLoading} onClick={() => setMaintModal({ vehicleId: v.id, vehicleName: v.model, reason: '' })}>
                          <Icon name="wrench" />
                        </button>
                      )}
                      <button className="icon-btn icon-btn-danger" title="Eliminar vehículo" aria-label="Eliminar vehículo" onClick={() => setDeleteVehicleModal({ vehicleId: v.id, vehicleName: v.model })}>
                        <Icon name="trash" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CollapsibleSection>

        <CollapsibleSection title="Encuestas del sistema">
          <table>
            <thead>
              <tr>
                <th>Empresa</th><th>Vehículo</th><th>Nº Preguntas</th><th>Fecha creación</th><th>Estado</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {companySurveys.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)', padding: '1.5rem' }}>No hay encuestas creadas todavía.</td></tr>
              )}
              {companySurveys.map(s => {
                const company = companies.find(c => c.id === s.companyId);
                return (
                  <tr key={s.id}>
                    <td>{company?.name || '—'}</td>
                    <td>{s.vehicleName}</td>
                    <td>{s.questions.length}</td>
                    <td>{new Date(s.createdAt).toLocaleDateString('es-ES')}</td>
                    <td><span className={`badge ${s.active ? 'badge-success' : 'badge-warning'}`}>{s.active ? 'Activa' : 'Inactiva'}</span></td>
                    <td>
                      <button
                        className="icon-btn icon-btn-danger"
                        title="Eliminar encuesta"
                        aria-label="Eliminar encuesta"
                        onClick={() => setDeleteSurveyModal({ surveyId: s.id, surveyName: s.vehicleName })}
                      >
                        <Icon name="trash" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CollapsibleSection>
      </section>

      {endMaintModal && (
        <>
          <button type="button" className="modal-overlay" aria-label="Cerrar" onClick={() => setEndMaintModal(null)} />
          <dialog open className="modal-box" aria-labelledby="endmaint-sa-title">
            <h3 id="endmaint-sa-title">Finalizar mantenimiento</h3>
            <p>Vehículo: <strong>{endMaintModal.vehicleName}</strong></p>
            <div className="field">
              <label htmlFor="invoice-file-sa" className="button button-outline file-btn">
                <Icon name="paperclip" size={16} /> {invoiceFile ? invoiceFile.name : 'Adjuntar factura (opcional)'}
              </label>
              <input
                id="invoice-file-sa"
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

      {maintModal && (
        <>
          <button type="button" className="modal-overlay" aria-label="Cerrar" onClick={() => setMaintModal(null)} />
          <dialog open className="modal-box" aria-labelledby="maint-sa-title">
            <h3 id="maint-sa-title">Iniciar mantenimiento</h3>
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

      {deleteVehicleModal && (
        <>
          <button type="button" className="modal-overlay" aria-label="Cerrar" onClick={() => setDeleteVehicleModal(null)} />
          <dialog open className="modal-box" aria-labelledby="del-vehicle-sa-title">
            <h3 id="del-vehicle-sa-title">Eliminar vehículo</h3>
            <p>
              ¿Seguro que quieres eliminar <strong>{deleteVehicleModal.vehicleName}</strong>?
              Esta acción es permanente y no se puede deshacer.
            </p>
            <div className="modal-actions">
              <button className="button button-outline" onClick={() => setDeleteVehicleModal(null)}>Cancelar</button>
              <button className="button button-danger" onClick={confirmDeleteVehicle}>Eliminar</button>
            </div>
          </dialog>
        </>
      )}

      {deleteModal && (
        <>
          <button type="button" className="modal-overlay" aria-label="Cerrar" onClick={() => setDeleteModal(null)} />
          <dialog open className="modal-box" aria-labelledby="del-company-title">
            <h3 id="del-company-title">Eliminar empresa</h3>
            <p>
              Esta acción es <strong>permanente e irreversible</strong>. Se eliminarán todos los
              vehículos de <strong>{deleteModal.companyName}</strong> y sus empleados quedarán sin empresa asignada.
            </p>
            <div className="modal-checkbox">
              <input
                id="confirm-delete-company"
                type="checkbox"
                checked={deleteModal.confirmed}
                onChange={e => setDeleteModal(m => ({ ...m, confirmed: e.target.checked }))}
              />
              <label htmlFor="confirm-delete-company">
                Entiendo las consecuencias y quiero eliminar esta empresa permanentemente
              </label>
            </div>
            <div className="modal-actions">
              <button className="button button-outline" onClick={() => setDeleteModal(null)}>Cancelar</button>
              <button
                className="button button-danger"
                onClick={confirmDeleteCompany}
                disabled={!deleteModal.confirmed}
              >
                Eliminar empresa
              </button>
            </div>
          </dialog>
        </>
      )}

      {removeWorkerModal && (
        <>
          <button type="button" className="modal-overlay" aria-label="Cerrar" onClick={() => setRemoveWorkerModal(null)} />
          <dialog open className="modal-box" aria-labelledby="remove-worker-title">
            <h3 id="remove-worker-title">Quitar trabajador</h3>
            <p>
              ¿Seguro que quieres desvincular a <strong>{removeWorkerModal.userName}</strong> de su empresa?
              El usuario quedará sin empresa asignada.
            </p>
            <div className="modal-actions">
              <button className="button button-outline" onClick={() => setRemoveWorkerModal(null)}>Cancelar</button>
              <button className="button button-danger" onClick={confirmRemoveWorker}>Quitar</button>
            </div>
          </dialog>
        </>
      )}

      {deleteSurveyModal && (
        <>
          <button type="button" className="modal-overlay" aria-label="Cerrar" onClick={() => setDeleteSurveyModal(null)} />
          <dialog open className="modal-box" aria-labelledby="delete-survey-title">
            <h3 id="delete-survey-title">Eliminar encuesta</h3>
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
        isSuperadmin={true}
        companies={companies}
      />

      <SurveyBuilderModal
        open={surveyModalOpen}
        onClose={() => setSurveyModalOpen(false)}
        companyVehicles={vehicles}
        onSurveyCreated={() => {
          setFlash({ type: 'success', message: 'Encuesta creada y asignada.' });
          loadSurveys();
        }}
        isSuperadmin={true}
        companies={companies}
      />
    </Layout>
  );
}

DashboardSuperadmin.propTypes = {
  data: PropTypes.object.isRequired,
};
