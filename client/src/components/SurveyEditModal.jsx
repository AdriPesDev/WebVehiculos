import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { api } from '../services/api';
import Alert from './Alert';

export default function SurveyEditModal({ open, onClose, survey, companyVehicles, companyUsers = [], onUpdated }) {
  const [text, setText]           = useState('');
  const [required, setRequired]   = useState(false);
  const [active, setActive]       = useState(true);
  const [vehicleIds, setVehicleIds] = useState([]);
  const [adminIds, setAdminIds]   = useState([]);
  const [error, setError]         = useState(null);
  const [loading, setLoading]     = useState(false);

  const admins = companyUsers.filter(u => u.role === 'admin' || u.rol === 'admin');

  useEffect(() => {
    if (survey) {
      setText(survey.text || '');
      setRequired(!!survey.required);
      setActive(survey.active !== false);
      setVehicleIds(survey.vehicleIds || []);
      setAdminIds((survey.adminsNotificar || []).map(a => a.id));
      setError(null);
    }
  }, [survey]);

  function toggleVehicle(id) {
    setVehicleIds(prev => prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]);
  }

  function toggleAdmin(id) {
    setAdminIds(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!text.trim()) {
      setError('El texto de la pregunta es obligatorio.');
      return;
    }
    setLoading(true);
    try {
      // 1. Datos básicos de la pregunta
      const res1 = await api.updateSurvey(survey.id, {
        texto: text.trim(),
        obligatoria: required,
        activa: active,
      });
      if (!res1.ok) throw new Error(res1.error);

      // 2. Vehículos asignados
      const res2 = await api.updateSurveyVehiculos(survey.id, vehicleIds);
      if (!res2.ok) throw new Error(res2.error);

      // 3. Admins a notificar
      const res3 = await api.updateSurveyNotificaciones(survey.id, adminIds);
      if (!res3.ok) throw new Error(res3.error);

      onUpdated();
      onClose();
    } catch (err) {
      setError(err.message || 'Error al actualizar la pregunta.');
    } finally {
      setLoading(false);
    }
  }

  if (!open || !survey) return null;

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(2px)', zIndex: 200 }}
        onClick={onClose}
        aria-hidden="true"
      />
      <dialog
        open
        aria-labelledby="edit-survey-title"
        style={{
          position: 'fixed', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(520px, 90vw)',
          background: 'var(--surface)',
          boxShadow: '0 20px 60px rgba(15,23,42,0.2)',
          zIndex: 300,
          borderRadius: '0.5rem',
          padding: 0, border: 'none', margin: 0,
          maxHeight: '90dvh', overflowY: 'auto',
        }}
      >
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
          <h3 id="edit-survey-title" style={{ margin: 0 }}>Editar pregunta</h3>
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.85rem', color: 'var(--muted)' }}>
            El tipo de respuesta no se puede cambiar una vez creada la pregunta.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Alert type="error" message={error} onClose={() => setError(null)} />

          <div className="field">
            <label htmlFor="es-text">Texto de la pregunta</label>
            <input id="es-text" value={text} onChange={e => setText(e.target.value)} required />
          </div>

          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={required} onChange={e => setRequired(e.target.checked)} />
              Obligatoria
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />
              Activa
            </label>
          </div>

          <div className="field">
            <label>Vehículos asignados (vacío = global)</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: 140, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '0.375rem', padding: '0.6rem' }}>
              {companyVehicles.map(v => (
                <label key={v.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input type="checkbox" checked={vehicleIds.includes(v.id)} onChange={() => toggleVehicle(v.id)} />
                  {v.model} ({v.plate})
                </label>
              ))}
            </div>
          </div>

          <div className="field">
            <label>Avisar por email a estos administradores</label>
            {admins.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: '0.85rem', margin: 0 }}>No hay administradores en la empresa.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: 140, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '0.375rem', padding: '0.6rem' }}>
                {admins.map(a => (
                  <label key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                    <input type="checkbox" checked={adminIds.includes(a.id)} onChange={() => toggleAdmin(a.id)} />
                    {a.name} <span style={{ color: 'var(--muted)' }}>({a.email})</span>
                  </label>
                ))}
              </div>
            )}
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

SurveyEditModal.propTypes = {
  open:            PropTypes.bool.isRequired,
  onClose:         PropTypes.func.isRequired,
  survey:          PropTypes.object,
  companyVehicles: PropTypes.array.isRequired,
  companyUsers:    PropTypes.array,
  onUpdated:       PropTypes.func.isRequired,
};
