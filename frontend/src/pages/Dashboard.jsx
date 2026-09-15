import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Bot, MessageSquare, PackageCheck, ShoppingBag, Users, Zap } from 'lucide-react'
import StatCard from '../components/StatCard'
import OrderStatusBadge from '../components/OrderStatusBadge'
import { apiService } from '../services/api'

export default function Dashboard() {
  const [conversations, setConversations] = useState([])
  const [orders, setOrders] = useState([])
  const [stats, setStats] = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [convData, statsData] = await Promise.all([
          apiService.getConversations().catch(() => []),
          apiService.getStats().catch(() => null),
        ])
        setConversations(Array.isArray(convData) ? convData.slice(0, 3) : [])
        setStats(statsData)
      } catch (error) {
        console.error('Dashboard load error:', error.message)
      }

      // Load orders separately (from WooCommerce — may be slower)
      try {
        const orderData = await apiService.getOrders({ per_page: 4 })
        const orderList = orderData?.data || []
        setOrders(orderList.slice(0, 4))
      } catch (error) {
        console.error('Orders load error:', error.message)
      }
    }
    load()
  }, [])

  const formatTime = (isoString) => {
    if (!isoString) return ''
    const date = new Date(isoString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  }

  const getInitials = (name) => {
    if (!name) return '?'
    return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
  }

  const totalCustomers = stats?.totalCustomers ?? conversations.length
  const totalMessages = stats?.totalMessages ?? 0
  const aiHandled = stats?.aiHandledPercent ?? 0

  return <>
    <div className="page-heading"><div><h1>Good morning, Admin</h1><p>Here&apos;s what&apos;s happening with your store today.</p></div><Link className="btn btn-primary" to="/inbox"><MessageSquare size={16} /> Open inbox</Link></div>
    <div className="stat-grid">
      <StatCard title="Total customers" value={String(totalCustomers)} icon={Users} color="#2563eb" change="" />
      <StatCard title="WhatsApp messages" value={String(totalMessages)} icon={MessageSquare} color="#16a34a" change="" />
      <StatCard title="Total orders" value={String(orders.length || '—')} icon={PackageCheck} color="#d97706" change="" />
      <StatCard title="AI handled" value={`${aiHandled}%`} icon={ShoppingBag} color="#7c3aed" change="" />
    </div>
    <div className="dashboard-grid">
      <div className="dashboard-stack">
        <section className="card panel"><div className="section-title"><h2>Recent orders</h2><Link to="/orders">View all <ArrowUpRight size={13} /></Link></div><div className="table-wrap"><table><thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th><th>Date</th></tr></thead><tbody>{orders.length === 0 ? <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No orders loaded yet</td></tr> : orders.map((order) => <tr key={order.id}><td><strong>#{order.number || order.id}</strong></td><td><div className="order-customer"><span className="mini-avatar">{getInitials(`${order.billing?.first_name || ''} ${order.billing?.last_name || ''}`)}</span><span>{order.billing?.first_name || 'Customer'} {order.billing?.last_name || ''}</span></div></td><td><strong>₹{order.total || '0'}</strong></td><td><OrderStatusBadge status={order.status || 'pending'} /></td><td className="subtext">{order.date_created ? new Date(order.date_created).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}</td></tr>)}</tbody></table></div></section>
        <section className="card panel"><div className="section-title"><h2>Recent conversations</h2><Link to="/inbox">Open inbox <ArrowUpRight size={13} /></Link></div>{conversations.length === 0 ? <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No conversations yet</div> : conversations.map((conversation) => <div className="conversation-row" key={conversation.phone}><span className="mini-avatar">{getInitials(conversation.name)}</span><div className="conversation-copy"><strong className="conversation-name">{conversation.name || conversation.phone}</strong><span className="conversation-preview">{conversation.lastMessage}</span></div><span className="subtext">{formatTime(conversation.lastUpdated)}</span></div>)}</section>
      </div>
      <div className="dashboard-stack">
        <section className="card panel"><div className="section-title"><h2>AI agent status</h2><Bot size={19} color="var(--primary)" /></div><div className="agent-card"><div className="agent-card-copy"><span className="agent-pulse" /><div><strong>Ordering agent is live</strong><span className="subtext">Responding to customers automatically</span></div></div><span className="pill pill-success">Active</span></div><div className="status-overview" style={{ marginTop: 20 }}><div><div className="status-line"><span>AI messages sent</span><strong>{stats?.aiMessages ?? 0}</strong></div></div><div><div className="status-line"><span>Customer messages</span><strong>{stats?.customerMessages ?? 0}</strong></div></div></div></section>
        <section className="card panel"><div className="section-title"><h2>Quick actions</h2><Zap size={18} color="#d97706" /></div><div className="quick-actions"><Link to="/products" className="quick-action"><ShoppingBag size={17} />Browse products</Link><Link to="/orders" className="quick-action"><PackageCheck size={17} />Review orders</Link><Link to="/inbox" className="quick-action"><MessageSquare size={17} />Reply to chats</Link><Link to="/settings" className="quick-action"><Bot size={17} />Agent settings</Link></div></section>
      </div>
    </div>
  </>
}
