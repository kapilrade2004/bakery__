import { TrendingUp, TrendingDown } from "lucide-react";

export default function StatCard({ title, value, icon: Icon, change, isPositive, color }) {
  return (
    <div className="card stat-card">
      <div className="stat-card-header">
        <span className="stat-title">{title}</span>
        {Icon && (
          <div className="stat-icon-wrapper" style={{ backgroundColor: `${color}15`, color }}>
            <Icon size={20} />
          </div>
        )}
      </div>

      <div className="stat-value">{value}</div>

      {change !== undefined && (
        <div className="stat-footer">
          <span className={`trend-badge ${isPositive ? "positive" : "negative"}`}>
            {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {change}
          </span>
          <span className="trend-label">vs last week</span>
        </div>
      )}

      <style>{`
        .stat-card {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          position: relative;
        }

        .stat-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .stat-title {
          font-size: 0.825rem;
          font-weight: 500;
          color: var(--text-secondary);
        }

        .stat-icon-wrapper {
          width: 38px;
          height: 38px;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stat-value {
          font-size: 1.65rem;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: -0.02em;
        }

        .stat-footer {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          margin-top: 0.25rem;
        }

        .trend-badge {
          display: flex;
          align-items: center;
          gap: 2px;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .trend-badge.positive {
          background-color: var(--success-bg);
          color: var(--success);
        }

        .trend-badge.negative {
          background-color: var(--danger-bg);
          color: var(--danger);
        }

        .trend-label {
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
}
