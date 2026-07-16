import PropTypes from 'prop-types';

// Marca Nethive Fleet: furgoneta dentro de un hexágono (identidad corporativa
// Nethive + flota) + wordmark. `variant="light"` para fondos oscuros (header navy).
export default function BrandLogo({ variant = 'dark', height = 30 }) {
  // `light` = sobre fondo azul/oscuro (headers): hexágono blanco + furgoneta azul.
  const isLight = variant === 'light';
  const hexFill = isLight ? '#ffffff' : '#009FE3';
  const vanStroke = isLight ? '#0077AA' : '#ffffff';
  const nethiveColor = isLight ? '#ffffff' : 'var(--comb)';
  const fleetColor = isLight ? '#7FD1F3' : '#009FE3';
  const markSize = height * 1.06;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.55rem',
        lineHeight: 1,
      }}
    >
      <svg
        width={markSize}
        height={markSize}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        focusable="false"
      >
        {/* Hexágono (panal Nethive) */}
        <path
          d="M15 1.155a2 2 0 0 1 2 0l10.856 6.268a2 2 0 0 1 1 1.732v12.69a2 2 0 0 1-1 1.732L17 30.845a2 2 0 0 1-2 0L4.144 24.577a2 2 0 0 1-1-1.732V10.155a2 2 0 0 1 1-1.732z"
          fill={hexFill}
        />
        {/* Furgoneta */}
        <g
          transform="translate(7 8) scale(0.75)"
          fill="none"
          stroke={vanStroke}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 18V6a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h1" />
          <path d="M15 18H9" />
          <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
          <circle cx="7" cy="18" r="2" />
          <circle cx="17" cy="18" r="2" />
        </g>
      </svg>
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: height * 0.6,
          letterSpacing: '-0.02em',
        }}
      >
        <span style={{ color: nethiveColor }}>nethive</span>
        <span style={{ color: fleetColor }}> fleet</span>
      </span>
    </span>
  );
}

BrandLogo.propTypes = {
  variant: PropTypes.oneOf(['dark', 'light']),
  height: PropTypes.number,
};
