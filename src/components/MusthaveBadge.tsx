import './MusthaveBadge.css';

interface MusthaveBadgeProps {
  active: boolean;
  interactive?: boolean;
  onToggle?: () => void;
}

function BadgeContent() {
  return (
    <span className="musthave-badge__shape">
      <span className="musthave-badge__text">musthave</span>
    </span>
  );
}

export function MusthaveBadge({
  active,
  interactive = false,
  onToggle,
}: MusthaveBadgeProps) {
  const className = [
    'musthave-badge',
    active ? 'musthave-badge--active' : '',
    interactive ? 'musthave-badge--interactive' : 'musthave-badge--readonly',
  ]
    .filter(Boolean)
    .join(' ');

  if (interactive && onToggle) {
    return (
      <button
        type="button"
        className={className}
        aria-label={active ? 'Убрать из musthave' : 'Добавить в musthave'}
        title={active ? 'Убрать из musthave' : 'Добавить в musthave'}
        onClick={onToggle}
      >
        <BadgeContent />
      </button>
    );
  }

  return (
    <span className={className}>
      <BadgeContent />
    </span>
  );
}
