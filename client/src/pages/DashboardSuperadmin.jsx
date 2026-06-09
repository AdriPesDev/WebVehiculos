import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { api } from '../services/api';
import Layout from '../components/Layout';
import Alert from '../components/Alert';
import Badge from '../components/Badge';
import Drawer from '../components/Drawer';
import SurveyBuilderModal from '../components/SurveyBuilderModal';

const PAGE_SIZE = 10;

function Paginacion({ total, pagina, onCambiar }) {
  const totalPaginas = Math.ceil(total / PAGE_SIZE);
  if (totalPaginas <= 1) return null;
  return (
    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.75rem', alignItems: 'center' }}>
      <button
        className="button button-small button-outline"
        disabled={pagina === 1}
        onClick={() => onCambiar(pagina - 1)}
      >← Anterior</button>
      <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
        {pagina} / {totalPaginas}
      </span>
      <button
        className="button button-small button-outline"
        disabled={pagina === totalPaginas}
        onClick={() => onCambiar(pagina + 1)}
      >Siguiente →</button>
    </div>
  );
}

Paginacion.propTypes = {
  total: PropTypes.number.isRequired,
  pagina: PropTypes.number.isRequired,
  onCambiar: PropTypes.func.isRequired,
};

export default function DashboardSuperadmin({ data: initialData }) {
  const [data, setData]                   = useState(initialData);
  const [flash, setFlash]                 = useState(null);
  const [encuestas, setEncuestas]         = useState([]);
  const [deleteModal, setDeleteModal]     = useState(null);
  const [deleteVehicleModal, setDeleteVehicleModal] = useState(null);
  const [maintModal, setMaintModal]       = useState(null);
  const [maintLoading, setMaintLoading]   = useState(false);
  const [endMaintModal, setEndMaintModal] = useState(null);
  const [removeWorkerModal, setRemoveWorkerModal] = useState(null);
  const [drawerOpen, setDrawerOpen]       = useState(false);
  const [drawerTab, setDrawerTab]         = useState('vehicle');
  const [surveyModalOpen, setSurveyModalOpen] = useState(false);
  const [deleteSurveyModal, setDeleteSurveyModal] = useState(null);

  // Paginación
  const [paginaEmpresas, setPaginaEmpresas]   = useState(1);
  const [paginaUsuarios, setPaginaUsuarios]   = useState(1);
  const [paginaVehiculos, setPaginaVehiculos] = useState(1);
  const [paginaEncuestas, setPaginaEncuestas] = useState(1);

  // Filtros
  const [filtroEmpresa, setFiltroEmpresa]   = useState('');
  const [filtroUsuario, setFiltroUsuario]   = useState('');
  const [filtroVehiculo, setFiltroVehiculo] = useState('');

  const { companies, users, vehicles } = data;

  useEffect(() => {
    api.getSuperadminEncuestas().then(setEncuestas);
  }, []);

  async function recargar() {
    const updated = await api.dashboard();
    setData(updated);
    api.getSuperadminEncuestas().then(setEncuestas);
  }

  // Filtrado
  const empresasFiltradas  = companies.filter(c => c.name?.toLowerCase().includes(filtroEmpresa.toLowerCase()));
  const usuariosFiltrados  = users.filter(u =>
    u.name?.toLowerCase().includes(filtroUsuario.toLowerCase()) ||
    u.email?.toLowerCase().includes(filtroUsuario.toLowerCase())
  );
  const vehiculosFiltrados = vehicles.filter(v =>
    v.plate?.toLowerCase().includes(filtroVehiculo.toLowerCase()) ||
    v.model?.toLowerCase().includes(filtroVehiculo.toLowerCase()) ||
    v.nombre_empresa?.toLowerCase().includes(filtroVehiculo.toLowerCase())
  );

  // Paginado
  const empresasPag  = empresasFiltradas.slice((paginaEmpresas - 1) * PAGE_SIZE, paginaEmpresas * PAGE_SIZE);
  const usuariosPag  = usuariosFiltrados.slice((paginaUsuarios - 1) * PAGE_SIZE, paginaUsuarios * PAGE_SIZE);
  const vehiculosPag = vehiculosFiltrados.slice((paginaVehiculos - 1) * PAGE_SIZE, paginaVehiculos * PAGE_SIZE);
  const encuestasPag = encuestas.slice((paginaEncuestas - 1) * PAGE_SIZE, paginaEncuestas * PAGE_SIZE);

  const inMaintenance = vehicles.filter(v =>
    (v.states || []).some(s => s === 'mantenimiento')
  ).length;

  async function confirmMaintenance() {
    setMaintLoading(true);
    const res = await api.startMaintenance(maintModal.vehicleId, maintModal.reason);
    setMaintModal(null);
    setMaintLoading(false);
    if (res.ok) { setFlash({ type: 'success', message: 'Mantenimiento iniciado.' }); await recargar(); }
    else setFlash({ type: 'error', message: res.error });
  }

  async function confirmEndMaintenance() {
    const { vehicleId } = endMaintModal;
    setEndMaintModal(null);
    setMaintLoading(true);
    const res = await api.endMaintenance(vehicleId);
    setMaintLoading(false);
    if (res.ok) { setFlash({ type: 'success', message: 'Mantenimiento finalizado.' }); await recargar(); }
    else setFlash({ type: 'error', message: res.error });
  }

  async function confirmDeleteVehicle() {
    const { vehicleId } = deleteVehicleModal;
    setDeleteVehicleModal(null);
    const res = await api.deleteVehicle(vehicleId);
    if (res.ok) { setFlash({ type: 'success', message: 'Vehículo eliminado.' }); setData(d => ({ ...d, vehicles: d.vehicles.filter(v => v.id !== vehicleId) })); }
    else setFlash({ type: 'error', message: res.error });
  }

  async function confirmRemoveWorker() {
    const { userId, userName } = removeWorkerModal;
    setRemoveWorkerModal(null);
    const res = await api.removeEmployee(userId);
    if (res.ok) {
      setFlash({ type: 'success', message: `${userName} desvinculado.` });
      setData(d => ({ ...d, users: d.users.map(u => u.id === userId ? { ...u, role: 'sin_empresa', company_id: null } : u) }));
    } else setFlash({ type: 'error', message: res.error });
  }

  async function confirmDeleteCompany() {
    const { companyId, companyName } = deleteModal;
    setDeleteModal(null);
    const res = await api.deleteCompany(companyId);
    if (res.ok) { setFlash({ type: 'success', message: `Empresa "${companyName}" eliminada.` }); setData(d => ({ ...d, companies: d.companies.filter(c => c.id !== companyId) })); }
    else setFlash({ type: 'error', message: res.error });
  }

  async function confirmDeleteSurvey() {
    const { surveyId } = deleteSurveyModal;
    setDeleteSurveyModal(null);
    const res = await api.deleteSurvey(surveyId);
    if (res.ok) { setFlash({ type: 'success', message: 'Pregunta eliminada.' }); setEncuestas(e => e.filter(s => s.id !== surveyId)); }
    else setFlash({ type: 'error', message: res.error });
  }

  return (
    <Layout>
      <section className="dashboard">
        <div className="dashboard-header">
          <h2>Panel de superadministrador</h2>
          <p>Vista global del sistema Nethive</p>
        </div>

        {flash && <Alert type={flash.type} message={flash.message} onClose={() => setFlash(null)} />}

        <div className="dashboard-actions">
          <button className="button button-outline" onClick={() => { setDrawerTab('vehicle'); setDrawerOpen(true); }}>🚗➕ Añadir vehículo</button>
          <button className="button button-outline" onClick={() => { setDrawerTab('employee'); setDrawerOpen(true); }}>👷➕ Añadir empleado</button>
          <button className="button button-outline" onClick={() => setSurveyModalOpen(true)}>📋➕ Añadir encuesta</button>
        </div>

        {/* Tarjetas */}
        <div className="admin-cards">
          <div className="admin-card admin-card-vehicles">
            <h3>🏢 Empresas</h3>
            <span className="stat-number">{companies.length}</span>
            <p>registradas</p>
          </div>
          <div className="admin-card admin-card-employees">
            <h3>👥 Usuarios</h3>
            <span className="stat-number">{users.length}</span>
            <p>en el sistema</p>
          </div>
          <div className="admin-card admin-card-requests">
            <h3>🚗 Vehículos</h3>
            <span className="stat-number">{vehicles.length}</span>
            <p>en flota global</p>
          </div>
          <div className="admin-card">
            <h3>🔧 En mantenimiento</h3>
            <span className="stat-number">{inMaintenance}</span>
            <p>vehículos</p>
          </div>
        </div>

        {/* Empresas */}
        <div className="table-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ margin: 0 }}>Empresas registradas</h3>
            <input
              type="text" placeholder="Filtrar..." value={filtroEmpresa}
              onChange={e => { setFiltroEmpresa(e.target.value); setPaginaEmpresas(1); }}
              style={{ padding: '0.4rem 0.75rem', borderRadius: '0.375rem', border: '1px solid var(--border)', fontSize: '0.85rem' }}
            />
          </div>
          <table>
            <thead><tr><th>Nombre</th><th>Vehículos</th><th>Empleados</th><th>Acciones</th></tr></thead>
            <tbody>
              {empresasPag.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)', padding: '1.5rem' }}>Sin resultados.</td></tr>}
              {empresasPag.map(c => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{vehicles.filter(v => v.company_id === c.id).length}</td>
                  <td>{users.filter(u => u.company_id === c.id && u.role === 'empleado').length}</td>
                  <td>
                    <button className="button button-small button-danger" onClick={() => setDeleteModal({ companyId: c.id, companyName: c.name, confirmed: false })}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Paginacion total={empresasFiltradas.length} pagina={paginaEmpresas} onCambiar={setPaginaEmpresas} />
        </div>

        {/* Usuarios */}
        <div className="table-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ margin: 0 }}>Usuarios del sistema</h3>
            <input
              type="text" placeholder="Filtrar..." value={filtroUsuario}
              onChange={e => { setFiltroUsuario(e.target.value); setPaginaUsuarios(1); }}
              style={{ padding: '0.4rem 0.75rem', borderRadius: '0.375rem', border: '1px solid var(--border)', fontSize: '0.85rem' }}
            />
          </div>
          <table>
            <thead><tr><th>Nombre</th><th>Email</th><th>Empresa</th><th>Rol</th><th>Acciones</th></tr></thead>
            <tbody>
              {usuariosPag.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)', padding: '1.5rem' }}>Sin resultados.</td></tr>}
              {usuariosPag.filter(u => u.role !== 'superadmin').map(u => {
                const company = companies.find(c => c.id === u.company_id);
                return (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>{company?.name || <span style={{ color: 'var(--muted)' }}>Sin empresa</span>}</td>
                    <td><span className="badge">{u.role}</span></td>
                    <td>
                      {u.company_id && (
                        <button className="button button-small button-danger" onClick={() => setRemoveWorkerModal({ userId: u.id, userName: u.name })}>
                          Quitar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <Paginacion total={usuariosFiltrados.filter(u => u.role !== 'superadmin').length} pagina={paginaUsuarios} onCambiar={setPaginaUsuarios} />
        </div>

        {/* Vehículos */}
        <div className="table-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ margin: 0 }}>Vehículos del sistema</h3>
            <input
              type="text" placeholder="Filtrar..." value={filtroVehiculo}
              onChange={e => { setFiltroVehiculo(e.target.value); setPaginaVehiculos(1); }}
              style={{ padding: '0.4rem 0.75rem', borderRadius: '0.375rem', border: '1px solid var(--border)', fontSize: '0.85rem' }}
            />
          </div>
          <table>
            <thead><tr><th>Modelo</th><th>Matrícula</th><th>Empresa</th><th>Tipo</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              {vehiculosPag.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)', padding: '1.5rem' }}>Sin resultados.</td></tr>}
              {vehiculosPag.map(v => {
                const states = v.states || [];
                const inMaint = states.includes('mantenimiento');
                return (
                  <tr key={v.id}>
                    <td>{v.model}</td>
                    <td>{v.plate}</td>
                    <td>{v.nombre_empresa || '—'}</td>
                    <td>{v.tipo !== '—' ? v.tipo : '—'}</td>
                    <td><Badge states={states} /></td>
                    <td className="table-actions">
                      <Link to={`/vehicle/${v.id}`} className="button button-small button-outline">Ver</Link>
                      {inMaint
                        ? <button className="button button-small button-warning" disabled={maintLoading} onClick={() => setEndMaintModal({ vehicleId: v.id, vehicleName: v.model })}>Fin mant.</button>
                        : <button className="button button-small button-warning" disabled={maintLoading} onClick={() => setMaintModal({ vehicleId: v.id, vehicleName: v.model, reason: '' })}>Mantenimiento</button>
                      }
                      <button className="button button-small button-danger" onClick={() => setDeleteVehicleModal({ vehicleId: v.id, vehicleName: v.model })}>Eliminar</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <Paginacion total={vehiculosFiltrados.length} pagina={paginaVehiculos} onCambiar={setPaginaVehiculos} />
        </div>

        {/* Encuestas */}
        <div className="table-section">
          <h3>Preguntas de encuesta del sistema</h3>
          <table>
            <thead><tr><th>Empresa</th><th>Pregunta</th><th>Tipo</th><th>Vehículos</th><th>Obligatoria</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              {encuestasPag.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--muted)', padding: '1.5rem' }}>No hay preguntas creadas todavía.</td></tr>}
              {encuestasPag.map(s => (
                <tr key={s.id}>
                  <td>{s.nombre_empresa || '—'}</td>
                  <td>{s.text}</td>
                  <td><span className="badge">{s.type}</span></td>
                  <td>{s.vehicleName}</td>
                  <td>{s.required ? '✓' : '—'}</td>
                  <td><span className={`badge ${s.active ? 'badge-success' : 'badge-warning'}`}>{s.active ? 'Activa' : 'Inactiva'}</span></td>
                  <td>
                    <button className="button button-small button-danger" onClick={() => setDeleteSurveyModal({ surveyId: s.id, surveyName: s.text })}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Paginacion total={encuestas.length} pagina={paginaEncuestas} onCambiar={setPaginaEncuestas} />
        </div>
      </section>

      {/* Modales */}
      {endMaintModal && (
        <>
          <button type="button" className="modal-overlay" aria-label="Cerrar" onClick={() => setEndMaintModal(null)} />
          <dialog open className="modal-box">
            <h3>Finalizar mantenimiento</h3>
            <p>Vehículo: <strong>{endMaintModal.vehicleName}</strong></p>
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
          <dialog open className="modal-box">
            <h3>Iniciar mantenimiento</h3>
            <p>Vehículo: <strong>{maintModal.vehicleName}</strong></p>
            <textarea rows={3} placeholder="Motivo (opcional)" value={maintModal.reason} onChange={e => setMaintModal(m => ({ ...m, reason: e.target.value }))} autoFocus />
            <div className="modal-actions">
              <button className="button button-outline" onClick={() => setMaintModal(null)}>Cancelar</button>
              <button className="button button-warning" onClick={confirmMaintenance}>Iniciar</button>
            </div>
          </dialog>
        </>
      )}

      {deleteVehicleModal && (
        <>
          <button type="button" className="modal-overlay" aria-label="Cerrar" onClick={() => setDeleteVehicleModal(null)} />
          <dialog open className="modal-box">
            <h3>Eliminar vehículo</h3>
            <p>¿Seguro que quieres eliminar <strong>{deleteVehicleModal.vehicleName}</strong>? Esta acción es permanente.</p>
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
          <dialog open className="modal-box">
            <h3>Eliminar empresa</h3>
            <p>Esta acción es <strong>permanente e irreversible</strong>. Se eliminarán todos los vehículos de <strong>{deleteModal.companyName}</strong> y sus empleados quedarán sin empresa.</p>
            <div className="modal-checkbox">
              <input id="confirm-delete-company" type="checkbox" checked={deleteModal.confirmed} onChange={e => setDeleteModal(m => ({ ...m, confirmed: e.target.checked }))} />
              <label htmlFor="confirm-delete-company">Entiendo las consecuencias y quiero eliminar esta empresa permanentemente</label>
            </div>
            <div className="modal-actions">
              <button className="button button-outline" onClick={() => setDeleteModal(null)}>Cancelar</button>
              <button className="button button-danger" onClick={confirmDeleteCompany} disabled={!deleteModal.confirmed}>Eliminar empresa</button>
            </div>
          </dialog>
        </>
      )}

      {removeWorkerModal && (
        <>
          <button type="button" className="modal-overlay" aria-label="Cerrar" onClick={() => setRemoveWorkerModal(null)} />
          <dialog open className="modal-box">
            <h3>Quitar trabajador</h3>
            <p>¿Seguro que quieres desvincular a <strong>{removeWorkerModal.userName}</strong> de su empresa?</p>
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
          <dialog open className="modal-box">
            <h3>Eliminar pregunta</h3>
            <p>¿Seguro que quieres eliminar la pregunta <strong>"{deleteSurveyModal.surveyName}"</strong>? Los viajes completados conservarán sus respuestas.</p>
            <div className="modal-actions">
              <button className="button button-outline" onClick={() => setDeleteSurveyModal(null)}>Cancelar</button>
              <button className="button button-danger" onClick={confirmDeleteSurvey}>Eliminar</button>
            </div>
          </dialog>
        </>
      )}

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onVehicleAdded={v => { setData(d => ({ ...d, vehicles: [...d.vehicles, v] })); setFlash({ type: 'success', message: 'Vehículo añadido.' }); }}
        onEmployeeAdded={u => { setData(d => ({ ...d, users: [...d.users, u] })); setFlash({ type: 'success', message: 'Empleado añadido.' }); }}
        initialTab={drawerTab}
        isSuperadmin={true}
        companies={companies}
      />

      <SurveyBuilderModal
        open={surveyModalOpen}
        onClose={() => setSurveyModalOpen(false)}
        companyVehicles={vehicles}
        onSurveyCreated={() => { setFlash({ type: 'success', message: 'Encuesta creada.' }); api.getSuperadminEncuestas().then(setEncuestas); setSurveyModalOpen(false); }}
        isSuperadmin={true}
        companies={companies}
      />
    </Layout>
  );
}

DashboardSuperadmin.propTypes = {
  data: PropTypes.object.isRequired,
};
