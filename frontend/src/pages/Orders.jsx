import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Eye, Filter, PackageCheck, RotateCcw, Search, X } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import OrderStatusBadge from '../components/OrderStatusBadge'
import { apiService, getApiError } from '../services/api'

const statusTabs = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending payment' },
  { key: 'processing', label: 'Processing' },
  { key: 'on-hold', label: 'On hold' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'qr-sent', label: 'QR Sent' },
  { key: 'shipped', label: 'Shipped' },
]

const presets = ['Today', 'Yesterday', 'This Week', 'This Month', 'Last Month', 'Last 7 Days', 'Last 30 Days', 'Last 90 Days', 'Last Year', 'All Time']
const toDateInput = (date) => date.toISOString().slice(0, 10)
const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())
const getPresetRange = (preset) => {
  const today = startOfDay(new Date())
  const start = new Date(today)
  const end = new Date(today)
  if (preset === 'Yesterday') { start.setDate(start.getDate() - 1); end.setDate(end.getDate() - 1) }
  if (preset === 'This Week') start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  if (preset === 'This Month') start.setDate(1)
  if (preset === 'Last Month') { start.setMonth(start.getMonth() - 1, 1); end.setDate(0) }
  if (/^Last \d+ Days$/.test(preset)) { const days = Number.parseInt(preset, 10); start.setDate(start.getDate() - days + 1) }
  if (preset === 'Last Year') { start.setFullYear(start.getFullYear() - 1, 0, 1); end.setFullYear(end.getFullYear() - 1, 11, 31) }
  if (preset === 'All Time') return { from: '', to: '' }
  return { from: toDateInput(start), to: toDateInput(end) }
}

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [selected, setSelected] = useState(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [counts, setCounts] = useState({})
  const [dateFilterOpen, setDateFilterOpen] = useState(false)
  const [activePreset, setActivePreset] = useState('All Time')
  const [appliedRange, setAppliedRange] = useState({ from: '', to: '' })
  const [draftRange, setDraftRange] = useState({ from: '', to: '' })
  const [dateError, setDateError] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      const apiStatus = status === 'qr-sent' ? 'qrsent' : status
      setLoading(true)
      apiService.getOrders({ page, per_page: pageSize, ...(status !== 'all' ? { status: apiStatus } : {}), ...(query.trim() ? { search: query.trim() } : {}), ...(appliedRange.from ? { after: `${appliedRange.from}T00:00:00` } : {}), ...(appliedRange.to ? { before: `${appliedRange.to}T23:59:59` } : {}) })
        .then((response) => {
          setOrders(response.data || [])
          setTotal(response.count || 0)
          setTotalPages(response.totalPages || 1)
          setCounts(response.counts || {})
          setNotice('')
        })
        .catch((error) => {
          setOrders([])
          setTotal(0)
          setTotalPages(1)
          setCounts({})
          setNotice(getApiError(error, 'Live order data is unavailable. Configure WooCommerce before managing orders.'))
        })
        .finally(() => setLoading(false))
    }, 250)
    return () => clearTimeout(timer)
  }, [page, pageSize, status, query, appliedRange])

  const formatRange = () => {
    if (!appliedRange.from && !appliedRange.to) return 'All dates'
    const format = (value) => new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    return `${format(appliedRange.from)} – ${format(appliedRange.to)}`
  }
  const selectPreset = (preset) => { setActivePreset(preset); setDraftRange(getPresetRange(preset)); setDateError('') }
  const applyDateFilter = () => {
    if ((draftRange.from && !draftRange.to) || (!draftRange.from && draftRange.to) || (draftRange.from && draftRange.to && draftRange.from > draftRange.to)) {
      setDateError('Choose a valid range where the From date is before the To date.')
      return
    }
    setAppliedRange(draftRange)
    setPage(1)
    setDateFilterOpen(false)
  }
  const clearDateFilter = () => { setActivePreset('All Time'); setDraftRange({ from: '', to: '' }); setAppliedRange({ from: '', to: '' }); setDateError(''); setPage(1); setDateFilterOpen(false) }

  const currentPage = Math.min(page, totalPages)
  const visibleOrders = orders
  const firstResult = total === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const lastResult = Math.min(currentPage * pageSize, total)
  const pageNumbers = Array.from({ length: Math.min(totalPages, 5) }, (_, index) => {
    if (totalPages <= 5) return index + 1
    if (currentPage <= 3) return index + 1
    if (currentPage >= totalPages - 2) return totalPages - 4 + index
    return currentPage - 2 + index
  })

  return <>
    <div className="page-heading">
      <div><h1>Orders</h1><p>Track WooCommerce orders and delivery details in one place.</p></div>
      <div className="orders-total"><PackageCheck size={18} /><strong>{(counts.all || 0).toLocaleString()}</strong><span>total orders</span></div>
    </div>
    {notice && <div className="error-state" style={{ marginBottom: 18 }}>{notice}</div>}
    <div className="order-status-tabs card">
      {statusTabs.map((tab) => <button key={tab.key} className={`order-status-tab ${status === tab.key ? 'active' : ''}`} onClick={() => { setStatus(tab.key); setPage(1) }}><span>{tab.label}</span><strong>{(counts[tab.key] || 0).toLocaleString()}</strong></button>)}
    </div>
    <div className="card panel orders-panel">
      <div className="toolbar"><div className="toolbar-controls"><div className="orders-search"><Search size={16} /><input className="input-field" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} placeholder="Search order, customer or phone..." /></div><div className="date-filter"><button className={`date-filter-trigger ${appliedRange.from ? 'active' : ''}`} onClick={() => { setDraftRange(appliedRange); setDateFilterOpen((open) => !open) }}><Filter size={16} /><span>{formatRange()}</span></button>{dateFilterOpen && <div className="date-filter-popover"><div className="date-filter-header"><div><strong>Filter by date</strong><span>Select an order date range</span></div><button className="icon-button" onClick={() => setDateFilterOpen(false)}><X size={17} /></button></div><div className="date-filter-body"><div className="date-presets"><span className="date-filter-label">Quick presets</span>{presets.map((preset) => <button key={preset} className={`date-preset ${activePreset === preset ? 'active' : ''}`} onClick={() => selectPreset(preset)}>{preset}</button>)}</div><div className="custom-range"><span className="date-filter-label">Custom range</span><div className="date-inputs"><label>From date<input type="date" className="input-field" value={draftRange.from} onChange={(event) => { setActivePreset(''); setDraftRange((range) => ({ ...range, from: event.target.value })); setDateError('') }} /></label><label>To date<input type="date" className="input-field" value={draftRange.to} onChange={(event) => { setActivePreset(''); setDraftRange((range) => ({ ...range, to: event.target.value })); setDateError('') }} /></label></div>{dateError && <p className="date-filter-error">{dateError}</p>}</div></div><div className="date-filter-actions"><button className="btn btn-secondary" onClick={clearDateFilter}><RotateCcw size={15} /> Clear</button><button className="btn btn-primary" onClick={applyDateFilter}>Apply filter</button></div></div>}</div></div><span className="orders-result-count">{total.toLocaleString()} matching orders</span></div>
      {loading ? <LoadingSpinner label="Loading WooCommerce orders..." /> : visibleOrders.length === 0 ? <div className="empty-state"><h3>No orders found</h3><p>Try changing your search or status filter.</p></div> : <><div className="table-wrap"><table><thead><tr><th>Order</th><th>Customer</th><th>Products</th><th>Total</th><th>Payment</th><th>Status</th><th>Order date</th><th /></tr></thead><tbody>{visibleOrders.map((order) => <tr key={order.id}><td><strong>#{order.number || order.id}</strong><span className="subtext">ID {order.id}</span></td><td><strong>{order.billing?.first_name || 'Guest'} {order.billing?.last_name || ''}</strong><span className="subtext">{order.billing?.phone || 'No phone'}</span></td><td className="order-products">{order.line_items?.map((item) => `${item.name} × ${item.quantity}`).join(', ') || '—'}</td><td><strong>₹{order.total}</strong></td><td>{order.payment_method_title || 'Pending'}</td><td><OrderStatusBadge status={order.status} /></td><td>{order.date_created ? new Date(order.date_created).toLocaleDateString() : '—'}</td><td><button className="icon-button" title="View order" onClick={() => setSelected(order)}><Eye size={17} /></button></td></tr>)}</tbody></table></div><div className="pagination"><span>Showing {firstResult}–{lastResult} of {total.toLocaleString()}</span><div className="pagination-controls"><button className="pagination-button" disabled={currentPage === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}><ChevronLeft size={16} /> Previous</button>{pageNumbers.map((number) => <button key={number} className={`pagination-button page-number ${number === currentPage ? 'active' : ''}`} onClick={() => setPage(number)}>{number}</button>)}<button className="pagination-button" disabled={currentPage === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>Next <ChevronRight size={16} /></button><label className="page-size-select">Rows<select className="select-field" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1) }}><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></select></label></div></div></>}
    </div>
    {selected && <div className="modal-backdrop" onClick={() => setSelected(null)}><div className="modal" onClick={(event) => event.stopPropagation()}><div className="modal-header"><h2>Order #{selected.number || selected.id}</h2><button className="icon-button" onClick={() => setSelected(null)}>×</button></div><div className="detail-row"><span>Customer</span><strong>{selected.billing?.first_name} {selected.billing?.last_name}</strong></div><div className="detail-row"><span>Phone</span><strong>{selected.billing?.phone || '—'}</strong></div><div className="detail-row"><span>Address</span><strong>{selected.shipping?.address_1 || selected.billing?.address_1 || '—'}</strong></div><div className="detail-row"><span>Delivery date/time</span><strong>{selected.meta_data?.find((meta) => ['delivery_datetime', 'delivery_slot'].includes(meta.key))?.value || 'Not scheduled'}</strong></div><div className="detail-row"><span>Total</span><strong>₹{selected.total}</strong></div></div></div>}
  </>
}
