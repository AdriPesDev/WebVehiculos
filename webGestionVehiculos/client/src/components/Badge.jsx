import PropTypes from 'prop-types';

export default function Badge({ states = [] }) {
  const stateList = Array.isArray(states) ? states : [states];
  
  const isDanger = stateList.includes('mantenimiento') || stateList.includes('maintenance');
  const isWarning = stateList.includes('en_uso') || stateList.includes('ocupado');
  let cls = 'badge-success';
  if (isDanger) {
    cls = 'badge-danger';
  } else if (isWarning) {
    cls = 'badge-warning';
  }

  return <span className={`badge ${cls}`}>{stateList.map(s => { const t = s.replaceAll('_', ' '); return t.charAt(0).toUpperCase() + t.slice(1); }).join(', ')}</span>;
}

Badge.propTypes = {
  states: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.string),
    PropTypes.string,
  ]),
};
