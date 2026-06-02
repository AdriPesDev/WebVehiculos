import PropTypes from 'prop-types';

export default function Alert({ type, message, onClose }) {
  if (!message) return null;
  return (
    <div className={`alert alert-${type}`}>
      {message}
      {onClose && (
        <button
          type="button"
          aria-label="Cerrar"
          onClick={onClose}
          style={{ marginLeft: '1rem', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}
        >
          ✕
        </button>
      )}
    </div>
  );
}

Alert.propTypes = {
  type: PropTypes.string.isRequired,
  message: PropTypes.string,
  onClose: PropTypes.func,
};
