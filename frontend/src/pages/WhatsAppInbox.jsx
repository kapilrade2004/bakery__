import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Bot, Check, ChevronLeft, Minus, Phone, Plus, Search, Send, ShoppingBag, Trash2 } from 'lucide-react'
import ChatMessage from '../components/ChatMessage'
import LoadingSpinner from '../components/LoadingSpinner'
import { apiService, getApiError } from '../services/api'

const products = [
  { id: 101, name: 'Classic Sourdough Loaf', shortName: 'Sourdough Loaf', category: 'Sourdough Breads', price: 350, stock: 18, image: 'https://images.unsplash.com/photo-1585478259715-876acc5be8eb?auto=format&fit=crop&w=500&q=80' },
  { id: 102, name: 'Butter French Croissant', shortName: 'Croissant', category: 'Croissants', price: 150, stock: 24, image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=500&q=80' },
  { id: 103, name: 'Sea Salt Chocolate Cookie', shortName: 'Chocolate Cookie', category: 'Cookies', price: 120, stock: 30, image: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=500&q=80' },
  { id: 104, name: 'Weekend Brunch Combo', shortName: 'Brunch Combo', category: 'Combos', price: 890, stock: 8, image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=500&q=80' },
]
const categories = [['🍞', 'Sourdough Breads'], ['🥐', 'Croissants'], ['🍪', 'Cookies'], ['🎁', 'Combos']]
const money = (value) => `₹${Number(value).toLocaleString('en-IN')}`
const POLL_INTERVAL = 5000

const formatTimestamp = (isoString) => {
  if (!isoString) return 'Just now'
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

const getInitials = (name) => {
  if (!name) return '?'
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

export default function WhatsAppInbox() {
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const [conversations, setConversations] = useState([])
  const [activePhone, setActivePhone] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState('')
  const [aiActive, setAiActive] = useState(true)
  const [notice, setNotice] = useState('')
  const [cart, setCart] = useState([{ ...products[0], quantity: 1 }, { ...products[1], quantity: 1 }])
  const [category, setCategory] = useState('')
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [tracking, setTracking] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')
  const [details, setDetails] = useState({ name: '', phone: '', address: '', pincode: '', date: 'Tomorrow', slot: '10–11 AM', payment: 'Online Payment' })

  const chatEndRef = useRef(null)
  const prevConversationsRef = useRef([])

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------
  const active = conversations.find((c) => c.phone === activePhone)
  const filtered = useMemo(() => conversations.filter((c) => `${c.name} ${c.phone}`.toLowerCase().includes(query.toLowerCase())), [conversations, query])
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const delivery = subtotal >= 700 ? 0 : 50
  const total = subtotal + delivery

  // ---------------------------------------------------------------------------
  // Fetch conversations from backend
  // ---------------------------------------------------------------------------
  const fetchConversations = useCallback(async () => {
    try {
      const data = await apiService.getConversations()
      const list = Array.isArray(data) ? data : []
      setConversations(list)

      // Auto-select first conversation if none is selected
      if (!activePhone && list.length > 0) {
        setActivePhone(list[0].phone)
      }

      prevConversationsRef.current = list
    } catch (error) {
      // Only show error on first load
      if (prevConversationsRef.current.length === 0) {
        console.error('Failed to fetch conversations:', error.message)
      }
    }
  }, [activePhone])

  // ---------------------------------------------------------------------------
  // Fetch messages for active conversation
  // ---------------------------------------------------------------------------
  const fetchMessages = useCallback(async (phone) => {
    if (!phone) return
    setMessagesLoading(true)
    try {
      const data = await apiService.getConversationMessages(phone)
      setMessages(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch messages:', error.message)
      setMessages([])
    } finally {
      setMessagesLoading(false)
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Initial load + polling
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await fetchConversations()
      setLoading(false)
    }
    init()

    // Poll for new conversations every POLL_INTERVAL
    const interval = setInterval(fetchConversations, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchConversations])

  // Fetch messages when active conversation changes
  useEffect(() => {
    if (activePhone) {
      fetchMessages(activePhone)
      // Update checkout details with active conversation info
      if (active) {
        setDetails((prev) => ({ ...prev, name: active.name || prev.name, phone: active.phone || prev.phone }))
      }
    }
  }, [activePhone, fetchMessages, active])

  // Poll messages for the active conversation
  useEffect(() => {
    if (!activePhone) return
    const interval = setInterval(() => fetchMessages(activePhone), POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [activePhone, fetchMessages])

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------
  const add = (product, amount = 1) => setCart((items) => items.some((item) => item.id === product.id) ? items.map((item) => item.id === product.id ? { ...item, quantity: Math.min(item.stock, item.quantity + amount) } : item) : [...items, { ...product, quantity: amount }])
  const update = (id, quantity) => setCart((items) => quantity < 1 ? items.filter((item) => item.id !== id) : items.map((item) => item.id === id ? { ...item, quantity } : item))

  const pushMessage = (text) => {
    // Optimistically add to local messages
    setMessages((prev) => [...prev, { id: `local_${Date.now()}`, phone: activePhone, sender: 'agent', isAI: true, text, timestamp: new Date().toISOString(), status: 'sent' }])
  }

  const sendMessage = async () => {
    const text = draft.trim()
    if (!text || !activePhone) return
    setDraft('')

    // Optimistically add to local messages
    setMessages((prev) => [...prev, { id: `local_${Date.now()}`, phone: activePhone, sender: 'agent', isAI: false, text, timestamp: new Date().toISOString(), status: 'sent' }])

    try {
      await apiService.sendWhatsAppMessage(activePhone, text)
    } catch (error) {
      setNotice(getApiError(error, 'Message saved locally; WhatsApp delivery may be pending.'))
    }
  }

  const trackLatestOrder = async () => {
    setTracking(true)
    try {
      const response = await apiService.getOrders({ search: active?.phone, per_page: 1 })
      const order = response.data?.[0]
      if (!order) pushMessage('I could not find a recent order for this number. Please share your order number or ask support for help.')
      else pushMessage(`Order #${order.number || order.id}: ${String(order.status || 'unknown').replace(/-/g, ' ')}.`)
    } catch (error) {
      setNotice(getApiError(error, 'Live order tracking is currently unavailable.'))
    } finally { setTracking(false) }
  }

  const submitOrder = async (event) => {
    event.preventDefault()
    if (!details.name || !details.phone || !details.address || !details.pincode) { setCheckoutError('Please complete every delivery field.'); return }
    if (!/^\+?\d[\d\s-]{9,}$/.test(details.phone) || !/^\d{6}$/.test(details.pincode)) { setCheckoutError('Enter a valid mobile number and 6-digit pincode.'); return }
    setSubmitting(true); setCheckoutError('')
    try {
      const order = await apiService.createOrder({ line_items: cart.map((item) => ({ product_id: item.id, name: item.name, quantity: item.quantity, price: item.price })), billing: { first_name: details.name, phone: details.phone, address_1: details.address, postcode: details.pincode }, shipping: { address_1: details.address, postcode: details.pincode }, delivery: { date: details.date, slot: details.slot }, payment_method: details.payment })
      const payment = details.payment === 'Online Payment' ? await apiService.createPaymentLink({ orderId: order?.number || order?.id || 'BS1025', amount: total, phone: details.phone }) : null
      const paymentPending = payment?.paymentStatus === 'pending'
      const paymentMessage = payment?.url ? `\n\nPay securely here: ${payment.url}` : paymentPending ? '\n\nPayment status: Pending payment. The gateway is not configured yet; our team will follow up.' : ''
      pushMessage(`✅ Your order #${order?.number || order?.id || 'BS1025'} is ${paymentPending ? 'placed and awaiting payment' : 'confirmed'}.\n\nThank you ${details.name.split(' ')[0]}! Your order has been placed successfully.${paymentMessage}\n\nDelivery: ${details.date}, ${details.slot}.\n\nTotal Amount: ${money(total)}\n\nWe'll notify you when your order is out for delivery.`)
      setCheckoutOpen(false)
    } catch (error) { setCheckoutError(getApiError(error, 'We could not place the order. Please try again.')) } finally { setSubmitting(false) }
  }

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------
  if (loading) {
    return <>
      <div className="page-heading"><div><h1>WhatsApp Inbox</h1><p>Loading conversations...</p></div></div>
      <div className="card" style={{ padding: '4rem', textAlign: 'center' }}><LoadingSpinner /></div>
    </>
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return <><div className="page-heading"><div><h1>WhatsApp Inbox</h1><p>Manage customer conversations with AI assistance.</p></div><div className="agent-card" style={{ padding: '9px 13px' }}><span className="agent-pulse" /><strong style={{ fontSize: 12 }}>AI Active</strong><button className="btn btn-secondary btn-sm" onClick={() => setAiActive((value) => !value)}>{aiActive ? 'Human takeover' : 'Resume AI'}</button></div></div>{notice && <div className="error-state" style={{ marginBottom: 18 }}>{notice}<button className="btn btn-secondary btn-sm" style={{ marginLeft: 12 }} onClick={() => setNotice('')}>Dismiss</button></div>}
    <div className="card inbox-layout"><aside className="inbox-column"><div className="inbox-heading"><h2>Conversations</h2><div style={{ position: 'relative', marginTop: 13 }}><Search size={15} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-muted)' }} /><input className="input-field" style={{ paddingLeft: 31 }} placeholder="Search customer..." value={query} onChange={(e) => setQuery(e.target.value)} /></div></div><div className="conversation-list">{filtered.length === 0 ? <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{query ? 'No matching conversations' : 'No conversations yet. Waiting for customers to message your WhatsApp number...'}</div> : filtered.map((conversation) => <div key={conversation.phone} className={`conversation-row ${conversation.phone === activePhone ? 'active' : ''}`} onClick={() => setActivePhone(conversation.phone)}><span className="mini-avatar">{getInitials(conversation.name)}</span><div className="conversation-copy"><strong className="conversation-name">{conversation.name || conversation.phone}</strong><span className="conversation-preview">{conversation.lastMessage}</span></div>{conversation.unreadCount > 0 && <span className="online-dot" />}</div>)}</div></aside>
      {active ? <section className="chat-column"><div className="chat-header"><div className="conversation-row" style={{ padding: 0, border: 0 }}><span className="mini-avatar">{getInitials(active.name)}</span><div><strong>{active.name || active.phone}</strong><span className="subtext">{active.phone} · {formatTimestamp(active.lastUpdated)}</span></div></div><span className="pill pill-success"><Bot size={13} /> {aiActive ? 'AI active' : 'Human mode'}</span></div><div className="chat-messages">{messagesLoading ? <div style={{ padding: '3rem', textAlign: 'center' }}><LoadingSpinner /></div> : messages.length === 0 ? <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No messages yet</div> : messages.map((message, index) => <ChatMessage key={message.id || `${message.timestamp}-${index}`} message={{ ...message, timestamp: formatTimestamp(message.timestamp) }} />)}<div className="ordering-card"><div className="ordering-card-header"><div><span className="ai-tag"><Bot size={12} /> AI ORDERING AGENT</span><strong>{category || 'Ready to bake something lovely?'}</strong></div><ShoppingBag size={20} /></div>{!category ? <div className="choice-grid">{categories.map(([icon, label]) => <button key={label} className="choice-button" onClick={() => { setCategory(label); pushMessage(`Here are our ${label.toLowerCase()}. Tap Add to Cart when you are ready.`) }}><span>{icon}</span>{label}</button>)}      <button className="choice-button previous" onClick={() => { add(products[0]); add(products[1], 2); pushMessage('I found your latest order and added it to the cart. You can edit quantities before checkout.') }}>🔄 Order My Previous Order</button>      <button className="choice-button" disabled={tracking} onClick={trackLatestOrder}>📦 {tracking ? 'Loading order...' : 'Track My Order'}</button><button className="choice-button" onClick={() => pushMessage("I'm connecting you with our support team now. Please share your order number and we'll help right away.")}>👨‍💬 Talk to Support</button></div> :  <><div className="product-choice-list">{products.filter((product) => product.category === category).map((product) => <div className="product-choice" key={product.id}><img src={product.image} alt="" /><div><strong>{product.name}</strong><span>{money(product.price)} · {product.stock} in stock</span></div><button className="btn btn-primary btn-sm" onClick={() => add(product)}><Plus size={14} /> Add</button></div>)}</div><button className="link-button" onClick={() => setCategory('')}><ChevronLeft size={14} /> Back to categories</button></>}</div><div className="chat-cart-card"><div className="ordering-card-header"><strong>Your cart · {cart.reduce((sum, item) => sum + item.quantity, 0)} items</strong><span className="cart-total">{money(total)}</span></div>{cart.map((item) => <div className="chat-cart-row" key={item.id}><div><strong>{item.shortName}</strong><span>{money(item.price)} each</span></div><div className="inline-quantity"><button onClick={() => update(item.id, item.quantity - 1)}><Minus size={13} /></button><b>{item.quantity}</b><button onClick={() => update(item.id, item.quantity + 1)}><Plus size={13} /></button><button className="remove-cart" onClick={() => update(item.id, 0)}><Trash2 size={13} /></button></div></div>)}<div className="cart-breakdown"><span>Subtotal <b>{money(subtotal)}</b></span><span>Delivery <b>{delivery ? money(delivery) : 'FREE'}</b></span></div><button className="btn btn-primary checkout-action" disabled={!cart.length} onClick={() => setCheckoutOpen(true)}>Checkout <Send size={14} /></button></div><div ref={chatEndRef} /></div><div className="chat-input"><input className="input-field" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage()} placeholder="Type a message..." /><button className="btn btn-primary" onClick={sendMessage}><Send size={16} /></button></div></section> : <section className="chat-column"><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Select a conversation to start chatting</div></section>}
      <aside className="inbox-column">{active ? <><div className="detail-section"><h3>Customer details</h3><div className="detail-row"><span>Name</span><strong>{active.name || 'Unknown'}</strong></div><div className="detail-row"><span>WhatsApp</span><strong>{active.phone}</strong></div><div className="detail-row"><span>Customer since</span><strong>{active.customerSince ? new Date(active.customerSince).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—'}</strong></div><div className="detail-row"><span>Total messages</span><strong>{active.totalMessages || 0}</strong></div><button className="btn btn-secondary" style={{ width: '100%', marginTop: 5 }}><Phone size={14} /> View contact</button></div><div className="detail-section"><h3>Ordering journey</h3>{['Welcome sent', 'Product selection', 'Delivery & payment', 'Order confirmation'].map((step, index) => <div className={`journey-step ${index < 2 ? 'done' : ''}`} key={step}><Check size={14} /> {step}</div>)}</div><div className="detail-section"><h3>Latest order</h3><p className="subtext">Use Track My Order to load live status from the order backend.</p></div></> : <div className="detail-section"><p className="subtext">Select a conversation to see customer details</p></div>}</aside></div>
    {checkoutOpen && <div className="modal-backdrop" onClick={() => setCheckoutOpen(false)}><form className="modal checkout-modal" onClick={(event) => event.stopPropagation()} onSubmit={submitOrder}><div className="modal-header"><div><h2>Checkout</h2><p className="subtext">Confirm delivery details for {active?.name}</p></div><button type="button" className="icon-button" onClick={() => setCheckoutOpen(false)}>×</button></div><div className="checkout-fields"><label>Name<input className="input-field" value={details.name} onChange={(e) => setDetails({ ...details, name: e.target.value })} /></label><label>Mobile number<input className="input-field" value={details.phone} onChange={(e) => setDetails({ ...details, phone: e.target.value })} /></label><label className="full-field">Delivery address<textarea className="input-field" rows="2" value={details.address} onChange={(e) => setDetails({ ...details, address: e.target.value })} placeholder="Flat, building, street and area" /></label><label>Pincode<input className="input-field" value={details.pincode} onChange={(e) => setDetails({ ...details, pincode: e.target.value })} placeholder="400050" /></label><label>Delivery date<select className="select-field" value={details.date} onChange={(e) => setDetails({ ...details, date: e.target.value })}><option>Today</option><option>Tomorrow</option><option>Day after tomorrow</option></select></label><label>Time slot<select className="select-field" value={details.slot} onChange={(e) => setDetails({ ...details, slot: e.target.value })}><option>9–10 AM</option><option>10–11 AM</option><option>4–5 PM</option><option>6–7 PM</option></select></label><label className="full-field">Payment method<select className="select-field" value={details.payment} onChange={(e) => setDetails({ ...details, payment: e.target.value })}><option>Online Payment</option><option>Cash on Delivery</option><option>Pay After Delivery</option></select></label></div>{checkoutError && <div className="checkout-error">{checkoutError}</div>}<div className="checkout-footer"><strong>Total {money(total)}</strong><button className="btn btn-primary" disabled={submitting}>{submitting ? 'Placing order...' : 'Place order'} <Send size={14} /></button></div></form></div>}</>
}
