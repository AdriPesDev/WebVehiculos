import PropTypes from 'prop-types';
import Icon from './icons';

export default function Alert({ type, message, onClose }) {
  if (!message) return null;
  return (
    <div className={`alert alert-${type}`}>
      <span>{message}</span>
      {onClose && (
        <button
          type="button"
          aria-label="Cerrar"
          onClick={onClose}
          style={{ marginLeft: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'inline-flex', padding: 0 }}
        >
          <Icon name="x" size={16} />
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
