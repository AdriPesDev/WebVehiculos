import { useState } from 'react';
import PropTypes from 'prop-types';
import { api } from '../services/api';
import Alert from './Alert';
import Icon from './icons';

export default function Drawer({ open, onClose, onVehicleAdded, onEmployeeAdded, initialTab = 'vehicle' }) {
  // Vehicle form state
  const [vModel, setVModel]         = useState('');
  const [vPlate, setVPlate]         = useState('');
  const [vTipo, setVTipo]           = useState('');
  const [vCapacity, setVCapacity]   = useState('');
  const [vLocation, setVLocation]   = useState('');
  const [vError, setVError]         = useState(null);
  const [vLoading, setVLoading]     = useState(false);

  // Employee form state
  const [eName, setEName]           = useState('');
  const [eEmail, setEEmail]         = useState('');
  const [ePassword, setEPassword]   = useState('');
  const [eRole, setERole]           = useState('empleado');
  const [eError, setEError]         = useState(null);
  const [eLoading, setELoading]     = useState(false);

  function resetVehicleForm() {
    setVModel(''); setVPlate(''); setVTipo(''); setVCapacity(''); setVLocation('');
  }

  function resetEmployeeForm() {
    setEName(''); setEEmail(''); setEPassword(''); setERole('empleado');
  }

  async function handleAddVehicle(e) {
    e.preventDefault();
    setVError(null);
    setVLoading(true);
    const body = {
      model:    vModel,
      plate:    vPlate,
      tipo:     vTipo     || null,
      capacity: vCapacity || null,
      location: vLocation || null,
    };
    const res = await api.addVehicle(body);
    setVLoading(false);
    if (res.ok) {
      resetVehicleForm();
      onVehicleAdded(res.vehicle);
      onClose();
    } else {
      setVError(res.error || 'Error al añadir vehículo.');
    }
  }

  async function handleAddEmployee(e) {
    e.preventDefault();
    setEError(null);
    setELoading(true);
    const body = { name: eName, email: eEmail, password: ePassword, role: eRole };
    const res = await api.addEmployee(body);
    setELoading(false);
    if (res.ok) {
      resetEmployeeForm();
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
          overflowY: 'auto',
        }}
      >
        <div className="drawer-header">
          <h3 id="drawer-title" style={{ margin: 0 }}>{title}</h3>
          <button className="drawer-close" onClick={onClose} aria-label="Cerrar"><Icon name="x" size={20} /></button>
        </div>

        <div className="drawer-body">
          {isVehicle ? (
            <form onSubmit={handleAddVehicle} className="auth-form">
              <Alert type="error" message={vError} onClose={() => setVError(null)} />

              <div className="field">
                <label htmlFor="v-plate">Matrícula *</label>
                <input
                  id="v-plate"
                  value={vPlate}
                  onChange={e => setVPlate(e.target.value)}
                  required
                  placeholder="Ej: 1234 ABC"
                />
              </div>

              <div className="field">
                <label htmlFor="v-model">Marca y modelo</label>
                <input
                  id="v-model"
                  value={vModel}
                  onChange={e => setVModel(e.target.value)}
                  placeholder="Ej: Renault Kangoo"
                />
                <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                  La primera palabra se usará como marca
                </span>
              </div>

              <div className="field">
                <label htmlFor="v-tipo">Tipo de vehículo</label>
                <input
                  id="v-tipo"
                  value={vTipo}
                  onChange={e => setVTipo(e.target.value)}
                  placeholder="Ej: Furgoneta, Turismo, 4x4, Camión..."
                />
              </div>

              <div className="field">
                <label htmlFor="v-capacity">Número de plazas</label>
                <input
                  id="v-capacity"
                  type="number"
                  min="1"
                  max="99"
                  value={vCapacity}
                  onChange={e => setVCapacity(e.target.value)}
                  placeholder="Ej: 5"
                />
              </div>

              <div className="field">
                <label htmlFor="v-location">Ubicación habitual</label>
                <input
                  id="v-location"
                  value={vLocation}
                  onChange={e => setVLocation(e.target.value)}
                  placeholder="Ej: Sede central, Almacén norte..."
                />
              </div>

              <button type="submit" className="button button-primary" disabled={vLoading}>
                {vLoading ? 'Añadiendo...' : 'Agregar vehículo'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleAddEmployee} className="auth-form">
              <Alert type="error" message={eError} onClose={() => setEError(null)} />

              <div className="field">
                <label htmlFor="e-name">Nombre completo</label>
                <input
                  id="e-name"
                  value={eName}
                  onChange={e => setEName(e.target.value)}
                  required
                  placeholder="Nombre y apellido"
                />
              </div>

              <div className="field">
                <label htmlFor="e-email">Correo electrónico</label>
                <input
                  id="e-email"
                  type="email"
                  value={eEmail}
                  onChange={e => setEEmail(e.target.value)}
                  required
                  placeholder="usuario@empresa.com"
                />
              </div>

              <div className="field">
                <label htmlFor="e-password">Contraseña</label>
                <input
                  id="e-password"
                  type="password"
                  value={ePassword}
                  onChange={e => setEPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Mínimo 8 caracteres"
                />
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
                {eLoading
                  ? 'Añadiendo...'
                  : eRole === 'admin' ? 'Agregar administrador' : 'Agregar empleado'}
              </button>
            </form>
          )}
        </div>
      </dialog>
    </>
  );
}

Drawer.propTypes = {
  open:            PropTypes.bool.isRequired,
  onClose:         PropTypes.func.isRequired,
  initialTab:      PropTypes.string,
  onVehicleAdded:  PropTypes.func.isRequired,
  onEmployeeAdded: PropTypes.func.isRequired,
};
