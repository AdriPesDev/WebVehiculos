import { useState, useEffect } from 'react';
import { api } from '../services/api';
import Layout from '../components/Layout';
import Alert from '../components/Alert';
import Drawer from '../components/Drawer';
import SurveyBuilderModal from '../components/SurveyBuilderModal';

function mapCompany(c) {
  return {
    id: c.id_empresa,
    name: c.nombre,
    total_vehiculos: parseInt(c.num_vehiculos ?? c.total_vehiculos ?? 0) || 0,
    total_usuarios: parseInt(c.num_usuarios ?? c.total_usuarios ?? c.empleados ?? 0) || 0,
    total_usos: parseInt(c.num_usos ?? c.total_usos ?? 0) || 0,
  };
}

function mapUser(u) {
  return {
    id: u.id_usuario,
    nombre: u.nombre,
    email: u.email,
    rol: u.rol,
    activo: u.activo !== false,
    nombre_empresa: u.nombre_empresa ?? u.empresa ?? null,
  };
}

export default function DashboardSuperadmin() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [changeRoleModal, setChangeRoleModal] = useState(null);
  const [toggleActiveModal, setToggleActiveModal] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState('vehicle');
  const [surveyModalOpen, setSurveyModalOpen] = useState(false);
  const [companySurveys, setCompanySurveys] = useState([]);
  const [deleteSurveyModal, setDeleteSurveyModal] = useState(null);
  const [activeTrips, setActiveTrips] = useState([]);

  useEffect(() => {
    loadData();
    loadSurveys();
    loadActiveTrips();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [statsRaw, empresasRaw, usuariosRaw] = await Promise.all([
        api.superadminStats(),
        api.superadminCompanies(),
        api.superadminUsers(),
      ]);
      const usersArray = Array.isArray(usuariosRaw)
        ? usuariosRaw
        : (usuariosRaw?.usuarios ?? usuariosRaw?.data ?? []);
      setData({
        stats: statsRaw?.totales || {},
        companies: (Array.isArray(empresasRaw) ? empresasRaw : []).map(mapCompany),
        users:     usersArray.map(mapUser),
      });
    } catch (err) {
      setFlash({ type: 'error', message: 'Error al cargar datos: ' + err.message });
    }
    setLoading(false);
  }

  async function loadActiveTrips() {
    try {
      const raw = await api.superadminActiveTrips();
      const arr = Array.isArray(raw) ? raw : (raw?.usos ?? raw?.data ?? []);
      setActiveTrips(arr);
    } catch {
      setActiveTrips([]);
    }
  }

  async function loadSurveys() {
    const res = await api.getSurveys();
    if (res.surveys) setCompanySurveys(res.surveys);
  }

  async function confirmChangeRole() {
    const { userId, nombre, newRol } = changeRoleModal;
    setChangeRoleModal(null);
    try {
      await api.superadminUpdateUser(userId, { rol: newRol });
      setFlash({ type: 'success', message: `Rol de ${nombre} cambiado a "${newRol}".` });
      setData(d => ({ ...d, users: d.users.map(u => u.id === userId ? { ...u, rol: newRol } : u) }));
    } catch (err) {
      setFlash({ type: 'error', message: err.message });
    }
  }

  async function confirmToggleActive() {
    const { userId, nombre, activo } = toggleActiveModal;
    setToggleActiveModal(null);
    try {
      await api.superadminUpdateUser(userId, { activo: !activo });
      const accion = activo ? 'desactivada' : 'activada';
      setFlash({ type: 'success', message: `Cuenta de ${nombre} ${accion}.` });
      setData(d => ({ ...d, users: d.users.map(u => u.id === userId ? { ...u, activo: !activo } : u) }));
    } catch (err) {
      setFlash({ type: 'error', message: err.message });
    }
  }

  async function confirmDeleteCompany() {
    const { companyId, companyName } = deleteModal;
    setDeleteModal(null);
    try {
      await api.deleteCompany(companyId);
      setFlash({ type: 'success', message: `Empresa "${companyName}" eliminada.` });
      setData(d => ({ ...d, companies: d.companies.filter(c => c.id !== companyId) }));
    } catch (err) {
      setFlash({ type: 'error', message: err.message });
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

  function onVehicleAdded() {
    loadData();
    setFlash({ type: 'success', message: 'Vehículo añadido.' });
  }

  function onEmployeeAdded() {
    loadData();
    setFlash({ type: 'success', message: 'Empleado añadido.' });
  }

  if (loading) {
    return (
      <Layout>
        <section className="dashboard">
          <div className="dashboard-header">
            <h2>Panel de superadministrador</h2>
          </div>
          <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '2rem' }}>Cargando datos...</p>
        </section>
      </Layout>
    );
  }

  if (!data) {
    return (
      <Layout>
        <section className="dashboard">
          {flash && <Alert type={flash.type} message={flash.message} onClose={() => setFlash(null)} />}
          <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '2rem' }}>No se pudieron cargar los datos.</p>
        </section>
      </Layout>
    );
  }

  const { companies, users, stats } = data;

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
            Añadir vehículo
          </button>
          <button className="button button-outline" onClick={() => { setDrawerTab('employee'); setDrawerOpen(true); }}>
            Añadir empleado
          </button>
          <button className="button button-outline" onClick={() => setSurveyModalOpen(true)}>
            Añadir encuesta
          </button>
        </div>

        <div className="admin-cards">
          <div className="admin-card admin-card-vehicles">
            <h3>Empresas</h3>
            <span className="stat-number">{stats.empresas ?? companies.length}</span>
            <p>registradas</p>
          </div>
          <div className="admin-card admin-card-employees">
            <h3>Usuarios</h3>
            <span className="stat-number">{stats.usuarios ?? users.length}</span>
            <p>en el sistema</p>
          </div>
          <div className="admin-card admin-card-requests">
            <h3>Vehículos</h3>
            <span className="stat-number">{stats.vehiculos ?? 0}</span>
            <p>en flota global</p>
          </div>
          <div className="admin-card">
            <h3>En mantenimiento</h3>
            <span className="stat-number">{stats.mantenimientos_activos ?? 0}</span>
            <p>vehículos</p>
          </div>
        </div>

        <div className="table-section">
          <h3>Empresas registradas</h3>
          <table>
            <thead>
              <tr>
                <th>Nombre</th><th>Vehículos</th><th>Usuarios</th><th>Viajes totales</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {companies.length === 0 && (
                <tr><td colSpan={5} className="empty-state">No hay empresas registradas.</td></tr>
              )}
              {companies.map(c => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.total_vehiculos}</td>
                  <td>{c.total_usuarios}</td>
                  <td>{c.total_usos}</td>
                  <td>
                    <button
                      className="button button-small button-danger"
                      onClick={() => setDeleteModal({ companyId: c.id, companyName: c.name, confirmed: false })}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="table-section">
          <h3>Trabajadores del sistema</h3>
          <table>
            <thead>
              <tr>
                <th>Nombre</th><th>Email</th><th>Empresa</th><th>Rol</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.filter(u => u.rol !== 'superadmin' && u.rol !== 'sin_empresa').length === 0 && (
                <tr><td colSpan={5} className="empty-state">No hay trabajadores registrados.</td></tr>
              )}
              {users
                .filter(u => u.rol !== 'superadmin' && u.rol !== 'sin_empresa')
                .sort((a, b) => (a.nombre_empresa || '').localeCompare(b.nombre_empresa || '', 'es'))
                .map(u => (
                  <tr key={u.id} style={u.activo ? {} : { opacity: 0.55 }}>
                    <td>{u.nombre}</td>
                    <td>{u.email}</td>
                    <td>{u.nombre_empresa || '—'}</td>
                    <td>
                      <span className="badge">{u.rol.charAt(0).toUpperCase() + u.rol.slice(1)}</span>
                      {!u.activo && <span className="badge badge-danger" style={{ marginLeft: '0.4rem' }}>Inactivo</span>}
                    </td>
                    <td className="table-actions">
                      <button
                        className="button button-small button-outline"
                        onClick={() => setChangeRoleModal({ userId: u.id, nombre: u.nombre, currentRol: u.rol, newRol: u.rol })}
                      >
                        Cambiar rol
                      </button>
                      <button
                        className={`button button-small ${u.activo ? 'button-warning' : 'button-success'}`}
                        onClick={() => setToggleActiveModal({ userId: u.id, nombre: u.nombre, activo: u.activo })}
                      >
                        {u.activo ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="table-section">
          <h3>Viajes activos del sistema</h3>
          <table>
            <thead>
              <tr>
                <th>Empresa</th>
                <th>Vehículo</th>
                <th>Conductor</th>
                <th>Destino</th>
                <th>Salida</th>
              </tr>
            </thead>
            <tbody>
              {activeTrips.length === 0 ? (
                <tr><td colSpan={5} className="empty-state">No hay vehículos en uso ahora mismo.</td></tr>
              ) : (
                activeTrips.map(t => (
                  <tr key={t.id_uso ?? t.id}>
                    <td>{t.nombre_empresa ?? t.empresa ?? '—'}</td>
                    <td>
                      {`${t.marca ?? ''} ${t.modelo ?? ''}`.trim() || '—'}
                      {t.matricula && <span style={{ color: 'var(--muted)', marginLeft: '0.4rem', fontSize: '0.85rem' }}>({t.matricula})</span>}
                    </td>
                    <td>{t.nombre_conductor ?? t.conductor ?? '—'}</td>
                    <td>{t.destino ?? '—'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {t.fecha_salida ? new Date(t.fecha_salida).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="table-section">
          <h3>Encuestas del sistema</h3>
          <table>
            <thead>
              <tr>
                <th>Empresa</th><th>Vehículo</th><th>Nº Preguntas</th><th>Fecha creación</th><th>Estado</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {companySurveys.length === 0 && (
                <tr><td colSpan={6} className="empty-state">No hay encuestas creadas todavía.</td></tr>
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
                        className="button button-small button-danger"
                        onClick={() => setDeleteSurveyModal({ surveyId: s.id, surveyName: s.vehicleName })}
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
      </section>

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

      {changeRoleModal && (
        <>
          <button type="button" className="modal-overlay" aria-label="Cerrar" onClick={() => setChangeRoleModal(null)} />
          <dialog open className="modal-box" aria-labelledby="change-role-title">
            <h3 id="change-role-title">Cambiar rol</h3>
            <p>Usuario: <strong>{changeRoleModal.nombre}</strong></p>
            <div className="field">
              <label htmlFor="role-select">Nuevo rol</label>
              <select
                id="role-select"
                value={changeRoleModal.newRol}
                onChange={e => setChangeRoleModal(m => ({ ...m, newRol: e.target.value }))}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '0.4rem', marginTop: '0.25rem' }}
              >
                <option value="admin">Admin</option>
                <option value="empleado">Empleado</option>
              </select>
            </div>
            <div className="modal-actions">
              <button className="button button-outline" onClick={() => setChangeRoleModal(null)}>Cancelar</button>
              <button
                className="button button-primary"
                onClick={confirmChangeRole}
                disabled={changeRoleModal.newRol === changeRoleModal.currentRol}
              >
                Guardar cambio
              </button>
            </div>
          </dialog>
        </>
      )}

      {toggleActiveModal && (
        <>
          <button type="button" className="modal-overlay" aria-label="Cerrar" onClick={() => setToggleActiveModal(null)} />
          <dialog open className="modal-box" aria-labelledby="toggle-active-title">
            <h3 id="toggle-active-title">{toggleActiveModal.activo ? 'Desactivar cuenta' : 'Activar cuenta'}</h3>
            <p>
              {toggleActiveModal.activo
                ? <>¿Desactivar la cuenta de <strong>{toggleActiveModal.nombre}</strong>? El usuario no podrá iniciar sesión.</>
                : <>¿Activar la cuenta de <strong>{toggleActiveModal.nombre}</strong>? El usuario podrá volver a iniciar sesión.</>
              }
            </p>
            <div className="modal-actions">
              <button className="button button-outline" onClick={() => setToggleActiveModal(null)}>Cancelar</button>
              <button
                className={`button ${toggleActiveModal.activo ? 'button-warning' : 'button-primary'}`}
                onClick={confirmToggleActive}
              >
                {toggleActiveModal.activo ? 'Desactivar' : 'Activar'}
              </button>
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
        companyVehicles={[]}
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
