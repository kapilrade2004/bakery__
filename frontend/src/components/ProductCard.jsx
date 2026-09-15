import { Plus, Minus, ShoppingCart, Info } from "lucide-react";

export default function ProductCard({ 
  product, 
  onAddToCart, 
  quantityInCart = 0, 
  onUpdateQuantity,
  onOpenDetails
}) {
  const imageUrl = product.images?.[0]?.src || "https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?auto=format&fit=crop&w=400&q=80";
  const categoryName = product.categories?.[0]?.name || "General";
  const minorUnit = product.prices?.currency_minor_unit ?? 2;
  const rawPrice = product.price || product.regular_price || product.prices?.price || 0;
  const displayPrice = product.prices?.price
    ? Number(rawPrice) / (10 ** minorUnit)
    : Number(rawPrice);
  const isOutOfStock = product.stock_status === "outofstock" || product.is_in_stock === false;

  return (
    <div className="card product-card">
      <div className="product-image-box">
        <img src={imageUrl} alt={product.name} className="product-img" />
        <span className={`stock-badge ${isOutOfStock ? "out" : "in"}`}>
          {isOutOfStock ? "Out of Stock" : "In Stock"}
        </span>
        <button className="info-btn" onClick={() => onOpenDetails?.(product)} title="View Details">
          <Info size={16} />
        </button>
      </div>

      <div className="product-details">
        <div className="product-category">{categoryName} • ID #{product.id}</div>
        <h3 className="product-title" onClick={() => onOpenDetails?.(product)}>{product.name}</h3>
        <div className="product-footer">
          <div className="product-price">₹{displayPrice.toFixed(2)}</div>

          {quantityInCart > 0 ? (
            <div className="quantity-controls">
              <button className="qty-btn" onClick={() => onUpdateQuantity(product.id, quantityInCart - 1)}>
                <Minus size={14} />
              </button>
              <span className="qty-count">{quantityInCart}</span>
              <button className="qty-btn" onClick={() => onUpdateQuantity(product.id, quantityInCart + 1)}>
                <Plus size={14} />
              </button>
            </div>
          ) : (
            <button 
              className="btn btn-primary btn-sm add-cart-btn" 
              disabled={isOutOfStock}
              onClick={() => onAddToCart({ ...product, price: displayPrice })}
            >
              <ShoppingCart size={15} /> Add
            </button>
          )}
        </div>
      </div>

      <style>{`
        .product-card {
          display: flex;
          flex-direction: column;
          padding: 0;
          overflow: hidden;
          transition: var(--transition);
        }

        .product-card:hover {
          box-shadow: var(--shadow-md);
          transform: translateY(-2px);
        }

        .product-image-box {
          position: relative;
          width: 100%;
          height: 170px;
          background-color: var(--bg-subtle);
          overflow: hidden;
        }

        .product-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .stock-badge {
          position: absolute;
          top: 10px;
          left: 10px;
          font-size: 0.7rem;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: var(--radius-full);
          text-transform: capitalize;
        }

        .stock-badge.in {
          background: #dcfce7;
          color: #15803d;
        }

        .stock-badge.out {
          background: #fee2e2;
          color: #b91c1c;
        }

        .info-btn {
          position: absolute;
          top: 10px;
          right: 10px;
          background: rgba(255, 255, 255, 0.85);
          border: none;
          border-radius: 50%;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--text-secondary);
          backdrop-filter: blur(4px);
        }

        .info-btn:hover {
          background: #ffffff;
          color: var(--primary);
        }

        .product-details {
          padding: 1rem;
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        .product-category {
          font-size: 0.72rem;
          color: var(--text-muted);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .product-title {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0.25rem 0 0.75rem 0;
          line-height: 1.3;
          cursor: pointer;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .product-title:hover {
          color: var(--primary);
        }

        .product-footer {
          margin-top: auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 0.5rem;
          border-top: 1px dashed var(--border-color);
        }

        .product-price {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .add-cart-btn {
          padding: 0.4rem 0.8rem;
          font-size: 0.8rem;
        }

        .quantity-controls {
          display: flex;
          align-items: center;
          background: var(--bg-subtle);
          border-radius: var(--radius-sm);
          padding: 2px;
          border: 1px solid var(--border-color);
        }

        .qty-btn {
          width: 26px;
          height: 26px;
          background: white;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--text-primary);
        }

        .qty-btn:hover {
          background: var(--primary-subtle);
          color: var(--primary);
        }

        .qty-count {
          padding: 0 8px;
          font-weight: 600;
          font-size: 0.85rem;
        }
      `}</style>
    </div>
  );
}
