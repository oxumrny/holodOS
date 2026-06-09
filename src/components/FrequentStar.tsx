import './FrequentStar.css';

interface FrequentStarProps {
  active: boolean;
  interactive?: boolean;
  onToggle?: () => void;
}

export function FrequentStar({
  active,
  interactive = false,
  onToggle,
}: FrequentStarProps) {
  const className = [
    'frequent-star',
    active ? 'frequent-star--active' : '',
    interactive ? '' : 'frequent-star--readonly',
  ]
    .filter(Boolean)
    .join(' ');

  if (interactive && onToggle) {
    return (
      <button
        type="button"
        className={className}
        aria-label={active ? 'Убрать из частых' : 'Закрепить в частых'}
        title={active ? 'Убрать из частых' : 'Закрепить в частых'}
        onClick={onToggle}
      >
        ★
      </button>
    );
  }

  return (
    <span className={className} aria-hidden>
      ★
    </span>
  );
}
