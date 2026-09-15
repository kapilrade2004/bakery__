import { Loader2 } from "lucide-react";

export default function LoadingSpinner({ size = 24, label = "Loading data..." }) {
  return (
    <div className="spinner-container">
      <Loader2 size={size} className="spinner-icon" />
      {label && <span className="spinner-label">{label}</span>}

      <style>{`
        .spinner-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          color: var(--text-muted);
          gap: 0.75rem;
          width: 100%;
        }

        .spinner-icon {
          animation: spin 1s linear infinite;
          color: var(--primary);
        }

        .spinner-label {
          font-size: 0.85rem;
          font-weight: 500;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
