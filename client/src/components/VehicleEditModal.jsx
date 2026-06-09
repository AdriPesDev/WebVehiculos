import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { api } from '../services/api';
import Alert from './Alert';

export default function VehicleEditModal({ open, onClose, vehicle, onUpdated }) {
  const [matricula, setMatricula] = useState('');
  const [marca, setMarca]         = useState('');
  const [modelo, setModelo]       = useState('');
  const [tipo, setTipo]           = useState('');
  const [capacidad, setCapacidad] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [error, setError]         = useState(null);
  const [loading, setLoading]     = useState(false);

  useEffect(() => {
    if (vehicle) {
      setMatricula(vehicle.plate  || '');
      setMarca(vehicle.marca      || '');
      setModelo(vehicle.modelo    || '');
      setTipo(vehicle.tipo !== '—' ? vehicle.tipo || '' : '');
      setCapacidad(vehicle.capacity !== '—' ? String(vehicle.capacity || '') : '');
      setUbicacion(vehicle.location !== '—' ? vehicle.location || '' : '');
      setError(null);
    }
  }, [vehicle]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!matricula.trim()) {
      setError('La matrícula es obligatoria.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.updateVehicle(vehicle.id, {
        matricula: matricula.trim(),
        marca:     marca.trim()    || null,
        modelo:    modelo.trim()   || null,
        tipo:      tipo.trim()     || null,
        capacidad: capacidad       ? parseInt(capacidad) : null,
        ubicacion: ubicacion.trim()|| null,
      });
      onUpdated(res);
      onClose();
    } catch (err) {
      setError(err.message || 'Error al actualizar el vehículo.');
    } finally {
      setLoading(false);
    }
  }

  if (!open || !vehicle) return null;

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(2px)', zIndex: 200 }}
        onClick={onClose}
        aria-hidden="true"
      />
      <dialog
        open
        aria-labelledby="edit-vehicle-title"
        style={{
          position: 'fixed', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(480px, 90vw)',
          background: 'var(--surface)',
          boxShadow: '0 20px 60px rgba(15,23,42,0.2)',
          zIndex: 300,
          borderRadius: '0.5rem',
          padding: 0, border: 'none', margin: 0,
          maxHeight: '90dvh', overflowY: 'auto',
        }}
      >
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
          <h3 id="edit-vehicle-title" style={{ margin: 0 }}>Editar vehículo</h3>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Alert type="error" message={error} onClose={() => setError(null)} />

          <div className="field">
            <label htmlFor="ev-matricula">Matrícula *</label>
            <input id="ev-matricula" value={matricula} onChange={e => setMatricula(e.target.value)} required placeholder="Ej: 1234 ABC" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="field">
              <label htmlFor="ev-marca">Marca</label>
              <input id="ev-marca" value={marca} onChange={e => setMarca(e.target.value)} placeholder="Ej: Renault" />
            </div>
            <div className="field">
              <label htmlFor="ev-modelo">Modelo</label>
              <input id="ev-modelo" value={modelo} onChange={e => setModelo(e.target.value)} placeholder="Ej: Kangoo" />
            </div>
          </div>

          <div className="field">
            <label htmlFor="ev-tipo">Tipo de vehículo</label>
            <input id="ev-tipo" value={tipo} onChange={e => setTipo(e.target.value)} placeholder="Ej: Furgoneta, Turismo, 4x4..." />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="field">
              <label htmlFor="ev-capacidad">Número de plazas</label>
              <input id="ev-capacidad" type="number" min="1" max="99" value={capacidad} onChange={e => setCapacidad(e.target.value)} placeholder="Ej: 5" />
            </div>
            <div className="field">
              <label htmlFor="ev-ubicacion">Ubicación habitual</label>
              <input id="ev-ubicacion" value={ubicacion} onChange={e => setUbicacion(e.target.value)} placeholder="Ej: Sede central" />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
            <button type="button" className="button button-outline" onClick={onClose} disabled={loading}>Cancelar</button>
            <button type="submit" className="button button-primary" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}

VehicleEditModal.propTypes = {
  open:      PropTypes.bool.isRequired,
  onClose:   PropTypes.func.isRequired,
  vehicle:   PropTypes.object,
  onUpdated: PropTypes.func.isRequired,
};
