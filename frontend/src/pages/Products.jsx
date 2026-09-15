import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react'
import ProductCard from '../components/ProductCard'
import LoadingSpinner from '../components/LoadingSpinner'
import { apiService, getApiError } from '../services/api'

export default function Products() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [cart, setCart] = useState([])
  const [selected, setSelected] = useState(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(12)
  useEffect(() => { apiService.getProducts().then(setProducts).catch((error) => { setProducts([]); setNotice(getApiError(error, 'Live product catalog is unavailable. Configure WooCommerce before managing products.')) }).finally(() => setLoading(false)) }, [])
  const categories = useMemo(() => ['All', ...new Set(products.flatMap((p) => p.categories?.map((c) => c.name) || []))], [products])
  const filtered = products.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()) && (category === 'All' || p.categories?.some((c) => c.name === category)))
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const visibleProducts = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const firstResult = filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const lastResult = Math.min(currentPage * pageSize, filtered.length)
  const pageNumbers = Array.from({ length: Math.min(totalPages, 5) }, (_, index) => {
    if (totalPages <= 5) return index + 1
    if (currentPage <= 3) return index + 1
    if (currentPage >= totalPages - 2) return totalPages - 4 + index
    return currentPage - 2 + index
  })
  const updateQuantity = (id, quantity) => setCart((items) => quantity <= 0 ? items.filter((item) => item.id !== id) : items.map((item) => item.id === id ? { ...item, quantity } : item))
  const addToCart = (product) => setCart((items) => items.some((item) => item.id === product.id) ? items.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item) : [...items, { ...product, quantity: 1 }])
  const quantity = (id) => cart.find((item) => item.id === id)?.quantity || 0
  const productPrice = (product) => {
    const minorUnit = product.prices?.currency_minor_unit ?? 2
    const rawPrice = product.price || product.regular_price || product.prices?.price || 0
    return product.prices?.price ? Number(rawPrice) / (10 ** minorUnit) : Number(rawPrice)
  }
  return <><div className="page-heading"><div><h1>Products</h1><p>Manage your WooCommerce catalog and build customer carts.</p></div><div className="products-heading-meta"><span className="product-count"><strong>{filtered.length.toLocaleString()}</strong><span>{query || category !== 'All' ? 'matching products' : 'total products'}</span></span><span className="pill pill-success">{cart.reduce((sum, item) => sum + item.quantity, 0)} cart items</span></div></div>
    {notice && <div className="error-state" style={{ marginBottom: 18 }}>{notice}</div>}
    <div className="toolbar"><div className="toolbar-controls"><div className="products-search"><Search size={16} /><input className="input-field" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1) }} placeholder="Search products..." /></div><select className="select-field" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1) }}>{categories.map((item) => <option key={item}>{item}</option>)}</select></div><span className="orders-result-count">{filtered.length.toLocaleString()} products</span></div>
    {loading ? <LoadingSpinner label="Loading WooCommerce products..." /> : filtered.length === 0 ? <div className="card empty-state"><Search size={30} /><h3>No products found</h3><p>Try a different search or category.</p></div> : <><div className="product-grid">{visibleProducts.map((product) => <ProductCard key={product.id} product={product} onAddToCart={addToCart} quantityInCart={quantity(product.id)} onUpdateQuantity={updateQuantity} onOpenDetails={setSelected} />)}</div><div className="pagination products-pagination"><span>Showing {firstResult}–{lastResult} of {filtered.length.toLocaleString()}</span><div className="pagination-controls"><button className="pagination-button" disabled={currentPage === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}><ChevronLeft size={16} /> Previous</button>{pageNumbers.map((number) => <button key={number} className={`pagination-button page-number ${number === currentPage ? 'active' : ''}`} onClick={() => setPage(number)}>{number}</button>)}<button className="pagination-button" disabled={currentPage === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>Next <ChevronRight size={16} /></button><label className="page-size-select">Rows<select className="select-field" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1) }}><option value={12}>12</option><option value={50}>50</option><option value={100}>100</option></select></label></div></div></>}
    {selected && <div className="modal-backdrop" onClick={() => setSelected(null)}><div className="modal" onClick={(e) => e.stopPropagation()}><div className="modal-header"><h2>{selected.name}</h2><button className="icon-button" onClick={() => setSelected(null)}><X size={20} /></button></div><p className="subtext" style={{ marginBottom: 16 }}>Product ID #{selected.id} · {selected.categories?.map((c) => c.name).join(', ') || 'General'}</p><img src={selected.images?.[0]?.src} alt="" style={{ width: '100%', height: 220, objectFit: 'cover', borderRadius: 10 }} /><div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}><strong>₹{productPrice(selected).toFixed(2)}</strong><span className={`pill ${selected.stock_status === 'outofstock' || selected.is_in_stock === false ? 'pill-warning' : 'pill-success'}`}>{selected.stock_status === 'outofstock' || selected.is_in_stock === false ? 'Out of stock' : 'In stock'}</span></div></div></div>}
  </>
}
