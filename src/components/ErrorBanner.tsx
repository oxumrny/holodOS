import './ErrorBanner.css';

interface ErrorBannerProps {
  message: string;
  onDismiss?: () => void;
}

export function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  return (
    <div className="error-banner" role="alert">
      <p className="error-banner__message">{message}</p>
      {onDismiss && (
        <button
          type="button"
          className="error-banner__dismiss"
          aria-label="Закрыть"
          onClick={onDismiss}
        >
          ×
        </button>
      )}
    </div>
  );
}
