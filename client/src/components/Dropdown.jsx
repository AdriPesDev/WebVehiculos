import { useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import Icon from './icons';

// Desplegable con forma de píldora y menú redondeado.
// El menú se posiciona con `position: fixed` para no recortarse dentro de
// contenedores con overflow (p.ej. `.table-section`).
export default function Dropdown({
  value,
  onChange,
  options,
  placeholder = 'Seleccionar',
  ariaLabel,
  variant = 'pill',
  minWidth = 180,
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const selected = options.find((o) => o.value === value);

  const place = useCallback(() => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setCoords({ left: r.left, top: r.bottom + 6, width: Math.max(r.width, minWidth) });
  }, [minWidth]);

  useEffect(() => {
    if (!open) return undefined;
    place();
    const onOutside = (e) => {
      if (triggerRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onScrollResize = () => setOpen(false);
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onOutside);
    window.addEventListener('scroll', onScrollResize, true);
    window.addEventListener('resize', onScrollResize);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      window.removeEventListener('scroll', onScrollResize, true);
      window.removeEventListener('resize', onScrollResize);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, place]);

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        className={`dropdown-trigger${variant === 'badge' ? ' dropdown-trigger-badge' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={selected ? undefined : 'dropdown-placeholder'}>
          {selected ? selected.label : placeholder}
        </span>
        <Icon name="chevronDown" size={16} className="dropdown-caret" />
      </button>
      {open && coords && (
        <ul
          ref={menuRef}
          className="dropdown-menu"
          role="listbox"
          style={{ position: 'fixed', left: coords.left, top: coords.top, minWidth: coords.width }}
        >
          {options.map((o) => (
            <li key={String(o.value)} role="option" aria-selected={o.value === value}>
              <button
                type="button"
                className={`dropdown-item${o.value === value ? ' is-selected' : ''}`}
                onClick={() => { onChange(o.value); setOpen(false); }}
              >
                <span>{o.label}</span>
                {o.value === value && <Icon name="check" size={16} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

Dropdown.propTypes = {
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onChange: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      label: PropTypes.string.isRequired,
    }),
  ).isRequired,
  placeholder: PropTypes.string,
  ariaLabel: PropTypes.string,
  variant: PropTypes.oneOf(['pill', 'badge']),
  minWidth: PropTypes.number,
};
