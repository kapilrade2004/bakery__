import { MessageSquare, Search, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import LoadingSpinner from '../components/LoadingSpinner'
import { apiService } from '../services/api'

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const data = await apiService.getCustomers()
        setCustomers(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error('Failed to fetch customers:', error.message)
      } finally {
        setLoading(false)
      }
    }
    fetchCustomers()
  }, [])

  const filtered = customers.filter((customer) => `${customer.name} ${customer.phone}`.toLowerCase().includes(query.toLowerCase()))

  const formatDate = (isoString) => {
    if (!isoString) return '—'
    const date = new Date(isoString)
    const now = new Date()
    const diffMs = now - date
    const diffHours = Math.floor(diffMs / 3600000)
    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffHours < 48) return 'Yesterday'
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  }

  const getInitials = (name) => {
    if (!name) return '?'
    return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
  }

  if (loading) {
    return <>
      <div className="page-heading"><div><h1>Customers</h1><p>Loading customer data...</p></div></div>
      <div className="card" style={{ padding: '4rem', textAlign: 'center' }}><LoadingSpinner /></div>
    </>
  }

  return <>
    <div className="page-heading">
      <div><h1>Customers</h1><p>Understand customer relationships across WhatsApp and orders.</p></div>
      <span className="pill pill-info"><Users size={13} /> {customers.length} customer{customers.length !== 1 ? 's' : ''}</span>
    </div>
    <div className="card panel">
      <div className="toolbar">
        <div style={{ position: 'relative', maxWidth: 360, width: '100%' }}>
          <Search size={16} style={{ position: 'absolute', left: 11, top: 11, color: 'var(--text-muted)' }} />
          <input className="input-field" style={{ paddingLeft: 34 }} placeholder="Search customers..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>
      <div className="table-wrap">
        {filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            {query ? 'No matching customers' : 'No customers yet. Customer data will appear once customers start messaging on WhatsApp.'}
          </div>
        ) : (
          <table>
            <thead>
              <tr><th>Customer</th><th>WhatsApp number</th><th>Messages</th><th>Last active</th><th>Customer since</th><th /></tr>
            </thead>
            <tbody>
              {filtered.map((customer) => (
                <tr key={customer.phone}>
                  <td>
                    <div className="order-customer">
                      <span className="mini-avatar">{getInitials(customer.name)}</span>
                      <strong>{customer.name || customer.phone}</strong>
                    </div>
                  </td>
                  <td>{customer.phone}</td>
                  <td>{customer.totalMessages || 0}</td>
                  <td>{formatDate(customer.lastActive)}</td>
                  <td>{customer.customerSince ? new Date(customer.customerSince).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—'}</td>
                  <td>
                    <button className="icon-button" title="Open WhatsApp chat" onClick={() => navigate(`/inbox?phone=${encodeURIComponent(customer.phone)}`)}>
                      <MessageSquare size={17} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  </>
}
