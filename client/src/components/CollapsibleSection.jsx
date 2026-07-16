import PropTypes from "prop-types";

export default function CollapsibleSection({
  title,
  count,
  countVariant,
  headerExtra,
  defaultOpen,
  className,
  children,
}) {
  return (
    <details
      className={["table-section", className].filter(Boolean).join(" ")}
      open={defaultOpen || undefined}
    >
      <summary className="table-section-summary">
        <h3>
          {title}
          {typeof count === "number" && (
            <span className={["badge", countVariant].filter(Boolean).join(" ")}>
              {count}
            </span>
          )}
        </h3>
        {headerExtra && (
          <div
            className="table-section-extra"
            onClick={(e) => e.stopPropagation()}
          >
            {headerExtra}
          </div>
        )}
      </summary>
      {children}
    </details>
  );
}

CollapsibleSection.propTypes = {
  title: PropTypes.node.isRequired,
  count: PropTypes.number,
  countVariant: PropTypes.string,
  headerExtra: PropTypes.node,
  defaultOpen: PropTypes.bool,
  className: PropTypes.string,
  children: PropTypes.node,
};
