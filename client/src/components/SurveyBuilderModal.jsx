import { useState } from 'react';
import PropTypes from 'prop-types';
import { api } from '../services/api';

export default function SurveyBuilderModal({ open, onClose, companyVehicles, onSurveyCreated, isSuperadmin = false, companies = [] }) {
  const [step, setStep] = useState(1);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingOptions, setEditingOptions] = useState(null);

  function resetForm() {
    setStep(1);
    setSelectedCompanyId('');
    setSelectedVehicleId('');
    setQuestions([]);
    setError(null);
    setEditingOptions(null);
  }

  const vehiclesForStep = isSuperadmin && selectedCompanyId
    ? companyVehicles.filter(v => v.company_id === selectedCompanyId)
    : companyVehicles;

  function handleClose() {
    resetForm();
    onClose();
  }

  function addQuestion() {
    setQuestions([
      ...questions,
      {
        tempId: `temp-${Date.now()}-${Math.random()}`,
        text: '',
        type: 'text',
        required: false,
        options: [],
      },
    ]);
  }

  function updateQuestion(tempId, field, value) {
    setQuestions(questions.map((q) =>
      q.tempId === tempId ? { ...q, [field]: value } : q,
    ));
  }

  function deleteQuestion(tempId) {
    setQuestions(questions.filter((q) => q.tempId !== tempId));
  }

  function addOption(tempId) {
    setQuestions(questions.map((q) =>
      q.tempId === tempId
        ? { ...q, options: [...(q.options || []), ''] }
        : q,
    ));
  }

  function updateOption(tempId, optionIndex, value) {
    setQuestions(questions.map((q) =>
      q.tempId === tempId
        ? {
            ...q,
            options: q.options.map((opt, idx) =>
              idx === optionIndex ? value : opt,
            ),
          }
        : q,
    ));
  }

  function deleteOption(tempId, optionIndex) {
    setQuestions(questions.map((q) =>
      q.tempId === tempId
        ? { ...q, options: q.options.filter((_, idx) => idx !== optionIndex) }
        : q,
    ));
  }

  async function handleSave() {
    setError(null);

    if (!selectedVehicleId) {
      setError('Selecciona un vehículo.');
      return;
    }

    if (questions.length === 0) {
      setError('Añade al menos una pregunta.');
      return;
    }

    for (const q of questions) {
      if (!q.text.trim()) {
        setError('Todas las preguntas deben tener un texto.');
        return;
      }
      if (q.type === 'radio' && q.options.filter((o) => o.trim()).length < 2) {
        setError('Las preguntas de opciones deben tener al menos 2 opciones.');
        return;
      }
    }

    const cleanedQuestions = questions.map((q) => ({
      text: q.text.trim(),
      type: q.type,
      required: q.required,
      options: q.type === 'radio' ? q.options.filter((o) => o.trim()) : null,
    }));

    setLoading(true);
    const res = await api.createSurvey({
      vehicleId: selectedVehicleId,
      questions: cleanedQuestions,
    });
    setLoading(false);

    if (res.ok) {
      resetForm();
      onSurveyCreated();
      handleClose();
    } else {
      setError(res.error || 'Error al guardar la encuesta.');
    }
  }

  if (!open) return null;

  const selectedVehicle = companyVehicles.find((v) => v.id === selectedVehicleId);

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(2px)', zIndex: 200 }}
        onClick={handleClose}
        aria-hidden="true"
      />
      <dialog
        open
        aria-labelledby="survey-modal-title"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(700px, 90vw)',
          maxHeight: '90dvh',
          background: 'var(--surface)',
          boxShadow: '0 20px 60px rgba(15,23,42,0.2)',
          zIndex: 300,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '0.5rem',
          padding: 0,
          border: 'none',
          margin: 0,
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
          <h3 id="survey-modal-title" style={{ margin: 0 }}>
            {step === 1 ? 'Crear nueva encuesta' : `Crear preguntas: ${selectedVehicle?.model || ''}`}
          </h3>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          {error && (
            <div style={{ padding: '0.75rem', background: '#fee', border: '1px solid #fcc', borderRadius: '0.25rem', marginBottom: '1rem', color: '#c33', fontSize: '0.9rem' }}>
              {error}
            </div>
          )}

          {step === 1 ? (
            <>
              {isSuperadmin && (
                <div className="field">
                  <label htmlFor="company-select">Selecciona una empresa</label>
                  <select
                    id="company-select"
                    value={selectedCompanyId}
                    onChange={(e) => setSelectedCompanyId(e.target.value)}
                    style={{
                      borderColor: selectedCompanyId ? 'var(--accent)' : 'var(--border)',
                      transition: 'border-color 0.2s',
                    }}
                  >
                    <option value="">-- Elige una empresa --</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="field">
                <label htmlFor="vehicle-select">Selecciona un vehículo</label>
                <select
                  id="vehicle-select"
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  style={{
                    borderColor: selectedVehicleId ? 'var(--accent)' : 'var(--border)',
                    transition: 'border-color 0.2s',
                  }}
                >
                  <option value="">-- Elige un vehículo --</option>
                  {vehiclesForStep.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.model} ({v.plate})
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <div>
              {questions.length === 0 ? (
                <p style={{ color: 'var(--muted)', fontSize: '0.95rem', marginBottom: '1rem', textAlign: 'center' }}>
                  No hay preguntas todavía. Pulsa "Añadir pregunta" para empezar.
                </p>
              ) : (
                <table className="survey-table">
                  <thead>
                    <tr>
                      <th>Pregunta</th>
                      <th style={{ width: '120px' }}>Tipo</th>
                      <th style={{ width: '80px', textAlign: 'center' }}>Obligatoria</th>
                      <th style={{ width: '140px' }}>Opciones</th>
                      <th style={{ width: '70px', textAlign: 'center' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {questions.map((q) => (
                      <tr key={q.tempId}>
                        <td>
                          <input
                            type="text"
                            value={q.text}
                            onChange={(e) => updateQuestion(q.tempId, 'text', e.target.value)}
                            placeholder="Pregunta"
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              border: '1px solid var(--accent)',
                              borderRadius: '0.25rem',
                              fontSize: '0.9rem',
                              boxSizing: 'border-box',
                              transition: 'border-color 0.2s',
                            }}
                            onFocus={(e) => (e.target.style.borderColor = '#1585b3')}
                            onBlur={(e) => (e.target.style.borderColor = 'var(--accent)')}
                          />
                        </td>
                        <td>
                          <select
                            value={q.type}
                            onChange={(e) => updateQuestion(q.tempId, 'type', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              border: '1px solid var(--accent)',
                              borderRadius: '0.25rem',
                              fontSize: '0.85rem',
                              transition: 'border-color 0.2s',
                            }}
                            onFocus={(e) => (e.target.style.borderColor = '#1585b3')}
                            onBlur={(e) => (e.target.style.borderColor = 'var(--accent)')}
                          >
                            <option value="text">Texto</option>
                            <option value="number">Número</option>
                            <option value="km">Km</option>
                            <option value="radio">Opciones</option>
                          </select>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={q.required}
                            onChange={(e) => updateQuestion(q.tempId, 'required', e.target.checked)}
                            style={{
                              cursor: 'pointer',
                              accentColor: 'var(--accent)',
                              width: '1.2rem',
                              height: '1.2rem',
                            }}
                          />
                        </td>
                        <td>
                          {q.type === 'radio' ? (
                            <button
                              type="button"
                              onClick={() => setEditingOptions(editingOptions === q.tempId ? null : q.tempId)}
                              className="modal-button modal-button-outline"
                              style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem', width: '100%' }}
                            >
                              {q.options.length} opciones
                            </button>
                          ) : (
                            <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>—</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => deleteQuestion(q.tempId)}
                            className="modal-button modal-button-danger"
                            style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {editingOptions && (
                <div style={{ padding: '1rem', background: 'var(--bg)', borderRadius: '0.375rem', marginBottom: '1rem', border: '1px solid var(--border)' }}>
                  <p style={{ margin: '0 0 0.75rem 0', fontWeight: 600, fontSize: '0.9rem' }}>
                    Editar opciones para: {questions.find((q) => q.tempId === editingOptions)?.text}
                  </p>
                  {questions.find((q) => q.tempId === editingOptions)?.options.map((opt, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => updateOption(editingOptions, idx, e.target.value)}
                        placeholder={`Opción ${idx + 1}`}
                        style={{ flex: 1, padding: '0.4rem', border: '1px solid var(--border)', borderRadius: '0.25rem', fontSize: '0.85rem' }}
                      />
                      <button
                        type="button"
                        onClick={() => deleteOption(editingOptions, idx)}
                        className="modal-button modal-button-danger"
                        style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addOption(editingOptions)}
                    className="modal-button modal-button-primary"
                    style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem', marginTop: '0.5rem', width: '100%' }}
                  >
                    + Añadir opción
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={addQuestion}
                className="button button-primary"
                style={{ width: '100%' }}
              >
                Añadir pregunta
              </button>
            </div>
          )}
        </div>

        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={handleClose}
            className="modal-button modal-button-outline"
            disabled={loading}
          >
            Cancelar
          </button>

          {step === 2 && (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="modal-button modal-button-outline"
              disabled={loading}
            >
              Atrás
            </button>
          )}

          {step === 1 ? (
            <button
              type="button"
              onClick={() => setStep(2)}
              className="modal-button modal-button-primary"
              disabled={(isSuperadmin && !selectedCompanyId) || !selectedVehicleId || loading}
            >
              Siguiente
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSave}
              className="modal-button modal-button-primary"
              disabled={loading || questions.length === 0}
            >
              {loading ? 'Guardando...' : 'Guardar encuesta'}
            </button>
          )}
        </div>
      </dialog>
    </>
  );
}

SurveyBuilderModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  companyVehicles: PropTypes.array.isRequired,
  onSurveyCreated: PropTypes.func.isRequired,
  isSuperadmin: PropTypes.bool,
  companies: PropTypes.array,
};
