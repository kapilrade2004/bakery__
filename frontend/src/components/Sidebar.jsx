import { NavLink } from "react-router-dom";
import { 
  LayoutDashboard, 
  MessageSquare, 
  ShoppingBag, 
  PackageCheck, 
  Users, 
  Settings, 
  Bot,
  X 
} from "lucide-react";

export default function Sidebar({ isOpen, onClose }) {
  const navItems = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    { name: "WhatsApp Inbox", path: "/inbox", icon: MessageSquare },
    { name: "Products", path: "/products", icon: ShoppingBag },
    { name: "Orders", path: "/orders", icon: PackageCheck },
    { name: "Customers", path: "/customers", icon: Users },
    { name: "Settings", path: "/settings", icon: Settings },
  ];

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isOpen && (
        <div 
          onClick={onClose} 
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.5)",
            zIndex: 40,
          }}
        />
      )}

      <aside className={`sidebar ${isOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <div className="logo-box">
            <div className="logo-icon">
              <Bot size={22} color="#ffffff" />
            </div>
            <div>
              <div className="brand-name">Bombay Sourdough</div>
              <div className="brand-sub">AI Ordering Agent</div>
            </div>
          </div>
          <button className="close-mobile-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-group-label">MAIN MENU</div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `nav-item ${isActive ? "active" : ""}`
                }
              >
                <Icon size={18} />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="ai-status-card">
            <div className="status-indicator online" />
            <div className="status-info">
              <span className="status-title">Agent Status</span>
              <span className="status-desc">AI Ordering Active</span>
            </div>
          </div>
        </div>
      </aside>

      <style>{`
        .sidebar {
          width: 260px;
          background-color: var(--bg-sidebar);
          color: #94a3b8;
          display: flex;
          flex-direction: column;
          height: 100vh;
          position: sticky;
          top: 0;
          z-index: 50;
          transition: transform 0.3s ease;
        }

        .sidebar-header {
          padding: 1.25rem 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #1e293b;
        }

        .logo-box {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .logo-icon {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: linear-gradient(135deg, #16a34a, #15803d);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .brand-name {
          color: #ffffff;
          font-weight: 700;
          font-size: 0.95rem;
          line-height: 1.2;
        }

        .brand-sub {
          font-size: 0.72rem;
          color: #64748b;
        }

        .close-mobile-btn {
          display: none;
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
        }

        .sidebar-nav {
          padding: 1.25rem 1rem;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          overflow-y: auto;
        }

        .nav-group-label {
          font-size: 0.68rem;
          font-weight: 700;
          color: #475569;
          letter-spacing: 0.05em;
          padding: 0.5rem 0.75rem;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.7rem 0.85rem;
          border-radius: var(--radius-sm);
          color: #94a3b8;
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 500;
          transition: var(--transition);
        }

        .nav-item:hover {
          background-color: var(--bg-sidebar-hover);
          color: #ffffff;
        }

        .nav-item.active {
          background-color: var(--primary);
          color: #ffffff;
          font-weight: 600;
        }

        .sidebar-footer {
          padding: 1rem;
          border-top: 1px solid #1e293b;
        }

        .ai-status-card {
          background: #1e293b;
          border-radius: var(--radius-sm);
          padding: 0.75rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .status-indicator {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }

        .status-indicator.online {
          background-color: #22c55e;
          box-shadow: 0 0 8px #22c55e;
        }

        .status-info {
          display: flex;
          flex-direction: column;
        }

        .status-title {
          color: #ffffff;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .status-desc {
          font-size: 0.7rem;
          color: #94a3b8;
        }

        @media (max-width: 1024px) {
          .sidebar {
            position: fixed;
            transform: translateX(-100%);
          }
          .sidebar.open {
            transform: translateX(0);
          }
          .close-mobile-btn {
            display: block;
          }
        }
      `}</style>
    </>
  );
}
