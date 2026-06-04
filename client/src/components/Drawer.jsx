import { useState } from 'react';
import PropTypes from 'prop-types';
import { api } from '../services/api';
import Alert from './Alert';

export default function Drawer({ open, onClose, onVehicleAdded, onEmployeeAdded, initialTab = 'vehicle', isSuperadmin = false, companies = [], companyLocation = null }) {
  // Vehicle form state
  const [vCompanyId, setVCompanyId] = useState('');
  const [vModel, setVModel] = useState('');
  const [vBrand, setVBrand] = useState('');
  const [vPlate, setVPlate] = useState('');
  const [vError, setVError] = useState(null);
  const [vLoading, setVLoading] = useState(false);

  // Employee form state
  const [eCompanyId, setECompanyId] = useState('');
  const [eName, setEName] = useState('');
  const [eEmail, setEEmail] = useState('');
  const [ePassword, setEPassword] = useState('');
  const [eRole, setERole] = useState('empleado');
  const [eError, setEError] = useState(null);
  const [eLoading, setELoading] = useState(false);

  function resetVehicleForm() {
    setVModel(''); setVPlate(''); setVBrand('');
  }

  function resetEmployeeForm() {
    setEName(''); setEEmail(''); setEPassword(''); setERole('empleado');
  }

  async function handleAddVehicle(e) {
    e.preventDefault();
    setVError(null);
    if (isSuperadmin && !vCompanyId) {
      setVError('Selecciona una empresa.');
      return;
    }
    if (!vModel || !vBrand || !vPlate) {
      setVError('Completa todos los campos requeridos.');
      return;
    }
    setVLoading(true);
    const body = { modelo: vModel, marca: vBrand, matricula: vPlate, ubicacion: companyLocation || 'Sin ubicación' };
    if (isSuperadmin) body.companyId = vCompanyId;
    console.log('Adding vehicle with body:', body);
    try {
      const res = await api.addVehicle(body);
      console.log('Vehicle response:', res);
      setVLoading(false);
      if (res.ok) {
        resetVehicleForm();
        setVCompanyId('');
        onVehicleAdded(res.vehicle);
        onClose();
      } else {
        setVError(res.error || 'Error al añadir vehículo.');
      }
    } catch (err) {
      console.error('Error adding vehicle:', err);
      setVError(err.message || 'Error al añadir vehículo.');
      setVLoading(false);
    }
  }

  async function handleAddEmployee(e) {
    e.preventDefault();
    setEError(null);
    if (isSuperadmin && !eCompanyId) {
      setEError('Selecciona una empresa.');
      return;
    }
    setELoading(true);
    const body = { name: eName, email: eEmail, password: ePassword, role: eRole };
    if (isSuperadmin) body.companyId = eCompanyId;
    const res = await api.addEmployee(body);
    setELoading(false);
    if (res.ok) {
      resetEmployeeForm();
      setECompanyId('');
      onEmployeeAdded(res.user);
      onClose();
    } else {
      setEError(res.error || 'Error al añadir empleado.');
    }
  }

  if (!open) return null;

  const isVehicle = initialTab === 'vehicle';
  const title = isVehicle ? 'Añadir vehículo' : 'Añadir empleado';

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(2px)', zIndex: 200 }}
        onClick={onClose}
        aria-hidden="true"
      />
      <dialog
        open
        aria-labelledby="drawer-title"
        style={{
          position: 'fixed', top: 0, right: 0,
          width: 'min(420px, 100vw)', height: '100dvh',
          background: 'var(--surface)',
          boxShadow: '-8px 0 40px rgba(15,23,42,0.15)',
          zIndex: 300,
          display: 'flex', flexDirection: 'column',
          animation: 'slideInRight 0.3s cubic-bezier(0.4,0,0.2,1)',
          padding: 0, border: 'none', margin: 0,
        }}
      >
        <div className="drawer-header">
          <h3 id="drawer-title" style={{ margin: 0 }}>{title}</h3>
          <button className="drawer-close" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        <div className="drawer-body">
          {isVehicle ? (
            <form onSubmit={handleAddVehicle} className="auth-form">
              <Alert type="error" message={vError} onClose={() => setVError(null)} />
              {isSuperadmin && (
                <div className="field">
                  <label htmlFor="v-company">Empresa</label>
                  <select id="v-company" value={vCompanyId} onChange={e => setVCompanyId(e.target.value)} required>
                    <option value="">-- Selecciona una empresa --</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="field">
                <label htmlFor="v-plate">Matrícula</label>
                <input id="v-plate" value={vPlate} onChange={e => setVPlate(e.target.value)} required placeholder="Ej: 1234 ABC" />
              </div>
              <div className="field">
                <label htmlFor="v-brand">Marca</label>
                <input id="v-brand" value={vBrand} onChange={e => setVBrand(e.target.value)} required placeholder="Ej: Mercedes, Volkswagen, Ford" />
              </div>
              <div className="field">
                <label htmlFor="v-model">Modelo</label>
                <input id="v-model" value={vModel} onChange={e => setVModel(e.target.value)} required placeholder="Ej: Sprinter, Transporter" />
              </div>
              <button type="submit" className="button button-primary" disabled={vLoading}>
                {vLoading ? 'Añadiendo...' : 'Agregar vehículo'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleAddEmployee} className="auth-form">
              <Alert type="error" message={eError} onClose={() => setEError(null)} />
              {isSuperadmin && (
                <div className="field">
                  <label htmlFor="e-company">Empresa</label>
                  <select id="e-company" value={eCompanyId} onChange={e => setECompanyId(e.target.value)} required>
                    <option value="">-- Selecciona una empresa --</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="field">
                <label htmlFor="e-name">Nombre completo</label>
                <input id="e-name" value={eName} onChange={e => setEName(e.target.value)} required placeholder="Nombre y apellido" />
              </div>
              <div className="field">
                <label htmlFor="e-email">Correo electrónico</label>
                <input id="e-email" type="email" value={eEmail} onChange={e => setEEmail(e.target.value)} required placeholder="usuario@empresa.com" />
              </div>
              <div className="field">
                <label htmlFor="e-password">Contraseña</label>
                <input id="e-password" type="password" value={ePassword} onChange={e => setEPassword(e.target.value)} required minLength={8} placeholder="Mínimo 8 caracteres" />
              </div>
              <fieldset className="field" style={{ border: 'none', margin: 0, padding: 0 }}>
                <legend style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.4rem' }}>Rol</legend>
                <div className="seg-control">
                  <button
                    type="button"
                    className={eRole === 'empleado' ? 'is-active' : ''}
                    onClick={() => setERole('empleado')}
                  >
                    Empleado
                  </button>
                  <button
                    type="button"
                    className={eRole === 'admin' ? 'is-active' : ''}
                    onClick={() => setERole('admin')}
                  >
                    Administrador
                  </button>
                </div>
              </fieldset>
              <button type="submit" className="button button-primary" disabled={eLoading}>
                {(() => {
                  if (eLoading) return 'Añadiendo...';
                  return eRole === 'admin' ? 'Agregar administrador' : 'Agregar empleado';
                })()}
              </button>
            </form>
          )}
        </div>
      </dialog>
    </>
  );
}

Drawer.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  initialTab: PropTypes.string,
  onVehicleAdded: PropTypes.func.isRequired,
  onEmployeeAdded: PropTypes.func.isRequired,
  isSuperadmin: PropTypes.bool,
  companies: PropTypes.array,
  companyLocation: PropTypes.string,
};
