import PropTypes from 'prop-types';

export default function SurveyResponsesModal({ open, onClose, survey, template }) {
  if (!open || !survey || !template) return null;

  const getAnswerValue = (questionId) => {
    return survey.answers?.[questionId] || '—';
  };

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(2px)', zIndex: 200 }}
        onClick={onClose}
        aria-hidden="true"
      />
      <dialog
        open
        aria-labelledby="survey-responses-title"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(600px, 90vw)',
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
          <h3 id="survey-responses-title" style={{ margin: 0 }}>Respuestas de la encuesta</h3>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          <table className="survey-table">
            <thead>
              <tr>
                <th>Pregunta</th>
                <th>Respuesta</th>
              </tr>
            </thead>
            <tbody>
              {template.questions.map((q) => (
                <tr key={q.id}>
                  <td style={{ fontWeight: 500 }}>{q.text}</td>
                  <td>{getAnswerValue(q.id)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            className="button button-outline"
          >
            Cerrar
          </button>
        </div>
      </dialog>
    </>
  );
}

SurveyResponsesModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  survey: PropTypes.object,
  template: PropTypes.object,
};
