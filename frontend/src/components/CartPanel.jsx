import { ShoppingBag, Trash2, Plus, Minus, ArrowRight } from "lucide-react";

export default function CartPanel({ cart = [], onUpdateQuantity, onRemoveItem, onCheckout }) {
  const total = cart.reduce((sum, item) => sum + (parseFloat(item.price || 0) * item.quantity), 0);

  return (
    <div className="cart-panel">
      <div className="cart-header">
        <div className="cart-title">
          <ShoppingBag size={18} />
          <span>Active Cart ({cart.reduce((s, i) => s + i.quantity, 0)})</span>
        </div>
      </div>

      {cart.length === 0 ? (
        <div className="empty-cart">
          <ShoppingBag size={32} className="empty-icon" />
          <p className="empty-text">No items in customer cart</p>
        </div>
      ) : (
        <>
          <div className="cart-items">
            {cart.map((item) => (
              <div key={item.id} className="cart-item">
                <div className="cart-item-info">
                  <span className="item-name">{item.name}</span>
                  <span className="item-price">₹{item.price} each</span>
                </div>

                <div className="cart-item-actions">
                  <div className="qty-picker">
                    <button className="q-btn" onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}>
                      <Minus size={12} />
                    </button>
                    <span className="q-val">{item.quantity}</span>
                    <button className="q-btn" onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}>
                      <Plus size={12} />
                    </button>
                  </div>
                  <button className="del-btn" onClick={() => onRemoveItem(item.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="cart-summary">
            <div className="subtotal-row">
              <span>Subtotal</span>
              <span className="total-val">₹{total.toFixed(2)}</span>
            </div>
            <button className="btn btn-primary checkout-btn" onClick={onCheckout}>
              <span>Generate WhatsApp Order</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </>
      )}

      <style>{`
        .cart-panel {
          background: var(--bg-surface);
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .cart-header {
          padding: 1rem;
          border-bottom: 1px solid var(--border-color);
        }

        .cart-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
          font-size: 0.9rem;
          color: var(--text-primary);
        }

        .empty-cart {
          padding: 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          gap: 0.5rem;
        }

        .empty-icon {
          opacity: 0.4;
        }

        .empty-text {
          font-size: 0.825rem;
        }

        .cart-items {
          padding: 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          max-height: 280px;
          overflow-y: auto;
        }

        .cart-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.6rem;
          background: var(--bg-app);
          border-radius: var(--radius-sm);
        }

        .cart-item-info {
          display: flex;
          flex-direction: column;
          max-width: 60%;
        }

        .item-name {
          font-size: 0.825rem;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .item-price {
          font-size: 0.72rem;
          color: var(--text-muted);
        }

        .cart-item-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .qty-picker {
          display: flex;
          align-items: center;
          gap: 4px;
          background: white;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          padding: 2px;
        }

        .q-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
        }

        .q-val {
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0 4px;
        }

        .del-btn {
          background: none;
          border: none;
          color: var(--danger);
          cursor: pointer;
          opacity: 0.7;
          padding: 2px;
        }

        .del-btn:hover {
          opacity: 1;
        }

        .cart-summary {
          padding: 1rem;
          border-top: 1px solid var(--border-color);
          margin-top: auto;
        }

        .subtotal-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.85rem;
          margin-bottom: 0.75rem;
        }

        .total-val {
          font-weight: 700;
          font-size: 1rem;
          color: var(--primary);
        }

        .checkout-btn {
          width: 100%;
          font-size: 0.825rem;
        }
      `}</style>
    </div>
  );
}
