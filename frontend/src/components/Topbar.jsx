import { useState, useEffect } from "react";
import { Menu, Bell, Search, User } from "lucide-react";
import { apiService } from "../services/api";

export default function Topbar({ onMenuToggle }) {
  const [connected, setConnected] = useState(false);
  const [provider, setProvider] = useState(null);

  useEffect(() => {
    apiService.getWhatsAppStatus()
      .then((data) => {
        setConnected(!!data?.connected);
        setProvider(data?.provider || null);
      })
      .catch(() => setConnected(false));
  }, []);

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="menu-btn" onClick={onMenuToggle}>
          <Menu size={20} />
        </button>
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search orders, customers, products..." 
            className="search-input"
          />
        </div>
      </div>

      <div className="topbar-right">
        <div className={`status-pill ${connected ? '' : 'status-pill-warning'}`}>
          <span className="dot" style={connected ? {} : { background: '#d97706' }}></span>
          {connected ? `WhatsApp Connected${provider ? ` (${provider.toUpperCase()})` : ''}` : 'WhatsApp: Configure'}
        </div>

        <button className="icon-btn" title="Notifications">
          <Bell size={18} />
          <span className="notification-badge"></span>
        </button>

        <div className="user-profile">
          <div className="avatar">
            <User size={18} />
          </div>
          <div className="user-info">
            <span className="user-name">Admin Store</span>
            <span className="user-role">Manager</span>
          </div>
        </div>
      </div>

      <style>{`
        .topbar {
          height: 64px;
          background-color: var(--bg-surface);
          border-bottom: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 1.5rem;
          position: sticky;
          top: 0;
          z-index: 30;
        }

        .topbar-left {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex: 1;
          max-width: 450px;
        }

        .menu-btn {
          display: none;
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 4px;
        }

        .search-box {
          position: relative;
          width: 100%;
        }

        .search-icon {
          position: absolute;
          left: 10px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
        }

        .search-input {
          width: 100%;
          padding: 0.5rem 0.75rem 0.5rem 2.2rem;
          border-radius: var(--radius-full);
          border: 1px solid var(--border-color);
          background-color: var(--bg-app);
          font-size: 0.85rem;
          outline: none;
          transition: var(--transition);
        }

        .search-input:focus {
          background-color: var(--bg-surface);
          border-color: var(--primary);
        }

        .topbar-right {
          display: flex;
          align-items: center;
          gap: 1.25rem;
        }

        .status-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          color: #15803d;
          background: #f0fdf4;
          padding: 4px 10px;
          border-radius: var(--radius-full);
          border: 1px solid #bbf7d0;
        }

        .status-pill .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #22c55e;
        }

        .icon-btn {
          position: relative;
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 6px;
          border-radius: 50%;
          transition: var(--transition);
        }

        .icon-btn:hover {
          background-color: var(--bg-subtle);
          color: var(--text-primary);
        }

        .notification-badge {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 7px;
          height: 7px;
          background: var(--danger);
          border-radius: 50%;
        }

        .user-profile {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding-left: 0.75rem;
          border-left: 1px solid var(--border-color);
        }

        .avatar {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: var(--bg-subtle);
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .user-info {
          display: flex;
          flex-direction: column;
        }

        .user-name {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-primary);
          line-height: 1.1;
        }

        .user-role {
          font-size: 0.72rem;
          color: var(--text-muted);
        }

        @media (max-width: 1024px) {
          .menu-btn {
            display: block;
          }
          .status-pill {
            display: none;
          }
        }
      `}</style>
    </header>
  );
}
