import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Bot, MessageSquare, Phone, PlusCircle, Search, Send, Sparkles, UserPlus } from 'lucide-react'
import ChatMessage from '../components/ChatMessage'
import LoadingSpinner from '../components/LoadingSpinner'
import { apiService, getApiError } from '../services/api'

const POLL_INTERVAL = 4000

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
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function WhatsAppInbox() {
  const [conversations, setConversations] = useState([])
  const [activePhone, setActivePhone] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [notice, setNotice] = useState('')
  const [showSimModal, setShowSimModal] = useState(false)
  const [simForm, setSimForm] = useState({ name: '', phone: '', text: '' })
  const [simLoading, setSimLoading] = useState(false)

  const chatEndRef = useRef(null)
  const prevConversationsRef = useRef([])

  const active = conversations.find((c) => c.phone === activePhone)
  const filtered = useMemo(() => {
    return conversations.filter((c) =>
      `${c.name || ''} ${c.phone || ''}`.toLowerCase().includes(query.toLowerCase())
    )
  }, [conversations, query])

  // Fetch conversations list
  const fetchConversations = useCallback(async () => {
    try {
      const data = await apiService.getConversations()
      const list = Array.isArray(data) ? data : []
      setConversations(list)

      // Keep selection or pick first available
      setActivePhone((curr) => {
        if (curr && list.some((c) => c.phone === curr)) return curr
        return list.length > 0 ? list[0].phone : null
      })

      prevConversationsRef.current = list
    } catch (error) {
      if (prevConversationsRef.current.length === 0) {
        console.error('Failed to fetch conversations:', error.message)
      }
    }
  }, [])

  // Fetch messages for active contact
  const fetchMessages = useCallback(async (phone) => {
    if (!phone) return
    try {
      const data = await apiService.getConversationMessages(phone)
      setMessages(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch messages:', error.message)
    }
  }, [])

  // Initial load
  useEffect(() => {
    let isMounted = true
    const init = async () => {
      setLoading(true)
      await fetchConversations()
      if (isMounted) setLoading(false)
    }
    init()
    const interval = setInterval(fetchConversations, POLL_INTERVAL)
    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [fetchConversations])

  // Messages change on active conversation selection
  useEffect(() => {
    if (!activePhone) return
    setMessagesLoading(true)
    fetchMessages(activePhone).finally(() => setMessagesLoading(false))
  }, [activePhone, fetchMessages])

  // Poll messages for open conversation
  useEffect(() => {
    if (!activePhone) return
    const interval = setInterval(() => fetchMessages(activePhone), POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [activePhone, fetchMessages])

  // Auto scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Send message
  const handleSendMessage = async () => {
    const text = draft.trim()
    if (!text || !activePhone || sending) return
    setDraft('')
    setSending(true)

    // Optimistic append
    const localId = `local_${Date.now()}`
    setMessages((prev) => [
      ...prev,
      {
        id: localId,
        phone: activePhone,
        sender: 'agent',
        isAI: false,
        text,
        timestamp: new Date().toISOString(),
        status: 'sent',
      },
    ])

    try {
      await apiService.sendWhatsAppMessage(activePhone, text)
      await fetchMessages(activePhone)
      await fetchConversations()
    } catch (error) {
      setNotice(getApiError(error, 'Message saved locally; WhatsApp delivery may be pending.'))
    } finally {
      setSending(false)
    }
  }

  // Simulate new incoming customer message
  const handleSimulateIncoming = async (e) => {
    e.preventDefault()
    if (!simForm.phone.trim() || !simForm.text.trim()) {
      setNotice('Please provide at least a phone number and message.')
      return
    }
    setSimLoading(true)
    try {
      await apiService.simulateIncomingMessage({
        from: simForm.phone.trim(),
        name: simForm.name.trim() || 'Customer',
        text: simForm.text.trim(),
      })
      const targetPhone = simForm.phone.trim()
      setShowSimModal(false)
      setSimForm({ name: '', phone: '', text: '' })
      await fetchConversations()
      setActivePhone(targetPhone)
      await fetchMessages(targetPhone)
      setNotice(`Incoming message simulated from ${simForm.name || targetPhone}!`)
    } catch (error) {
      setNotice(getApiError(error, 'Failed to simulate incoming message.'))
    } finally {
      setSimLoading(false)
    }
  }

  if (loading) {
    return (
      <>
        <div className="page-heading">
          <div>
            <h1>WhatsApp CRM & Inbox</h1>
            <p>Loading your conversations...</p>
          </div>
        </div>
        <div className="card" style={{ padding: '4rem', textAlign: 'center' }}>
          <LoadingSpinner />
        </div>
      </>
    )
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>WhatsApp CRM & Inbox</h1>
          <p>Real-time customer conversations, message logs, and CRM profiles.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowSimModal(true)}
            title="Test incoming customer messages before your live webhook is connected"
          >
            <UserPlus size={14} /> Simulate Incoming Customer
          </button>
          <div className="agent-card" style={{ padding: '8px 14px' }}>
            <span className="agent-pulse" />
            <strong style={{ fontSize: 12 }}>CRM Live Active</strong>
          </div>
        </div>
      </div>

      {notice && (
        <div className="error-state" style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{notice}</span>
          <button className="btn btn-secondary btn-sm" onClick={() => setNotice('')}>
            Dismiss
          </button>
        </div>
      )}

      <div className="card inbox-layout">
        {/* Left Column: Contacts & Conversations */}
        <aside className="inbox-column">
          <div className="inbox-heading">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>Contacts ({conversations.length})</h2>
              <button
                className="icon-button"
                title="New Test Message"
                onClick={() => setShowSimModal(true)}
              >
                <PlusCircle size={16} />
              </button>
            </div>
            <div style={{ position: 'relative', marginTop: 12 }}>
              <Search size={15} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-muted)' }} />
              <input
                className="input-field"
                style={{ paddingLeft: 31 }}
                placeholder="Search name or phone..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="conversation-list">
            {filtered.length === 0 ? (
              <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                {query ? 'No matching contacts' : 'No messages yet. Use the "Simulate Incoming Customer" button to test!'}
              </div>
            ) : (
              filtered.map((conversation) => (
                <div
                  key={conversation.phone}
                  className={`conversation-row ${conversation.phone === activePhone ? 'active' : ''}`}
                  onClick={() => setActivePhone(conversation.phone)}
                >
                  <span className="mini-avatar">{getInitials(conversation.name)}</span>
                  <div className="conversation-copy">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <strong className="conversation-name">{conversation.name || conversation.phone}</strong>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {formatTimestamp(conversation.lastUpdated)}
                      </span>
                    </div>
                    <span className="conversation-preview">{conversation.lastMessage || 'No preview available'}</span>
                  </div>
                  {conversation.unreadCount > 0 && <span className="online-dot" />}
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Center Column: Live Chat Stream */}
        {active ? (
          <section className="chat-column">
            <div className="chat-header">
              <div className="conversation-row" style={{ padding: 0, border: 0 }}>
                <span className="mini-avatar">{getInitials(active.name)}</span>
                <div>
                  <strong>{active.name || active.phone}</strong>
                  <span className="subtext">
                    +{active.phone} · Last active: {formatTimestamp(active.lastUpdated)}
                  </span>
                </div>
              </div>
              <span className="pill pill-success">
                <Bot size={13} /> AI Auto-Reply Enabled
              </span>
            </div>

            <div className="chat-messages" style={{ flex: 1, overflowY: 'auto' }}>
              {messagesLoading ? (
                <div style={{ padding: '3rem', textAlign: 'center' }}>
                  <LoadingSpinner />
                </div>
              ) : messages.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No messages logged with this customer yet.
                </div>
              ) : (
                messages.map((message, index) => (
                  <ChatMessage
                    key={message.id || `${message.timestamp}-${index}`}
                    message={{
                      ...message,
                      timestamp: formatTimestamp(message.timestamp),
                    }}
                  />
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="chat-input">
              <input
                className="input-field"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={`Reply to ${active.name || active.phone}...`}
                disabled={sending}
              />
              <button
                className="btn btn-primary"
                onClick={handleSendMessage}
                disabled={sending || !draft.trim()}
              >
                <Send size={16} />
              </button>
            </div>
          </section>
        ) : (
          <section className="chat-column">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', gap: '0.75rem' }}>
              <MessageSquare size={36} opacity={0.4} />
              <span>Select a contact on the left to inspect conversation</span>
            </div>
          </section>
        )}

        {/* Right Column: Customer CRM Card */}
        <aside className="inbox-column">
          {active ? (
            <>
              <div className="detail-section">
                <h3>Customer Profile</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', marginTop: '0.5rem' }}>
                  <span className="mini-avatar" style={{ width: 44, height: 44, fontSize: '1.1rem' }}>
                    {getInitials(active.name)}
                  </span>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1rem' }}>{active.name || 'Unknown Contact'}</h4>
                    <span className="subtext" style={{ fontSize: '0.78rem' }}>WhatsApp Contact</span>
                  </div>
                </div>

                <div className="detail-row">
                  <span>Phone</span>
                  <strong>+{active.phone}</strong>
                </div>
                <div className="detail-row">
                  <span>Customer since</span>
                  <strong>
                    {active.customerSince
                      ? new Date(active.customerSince).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '—'}
                  </strong>
                </div>
                <div className="detail-row">
                  <span>Total messages</span>
                  <strong>{active.totalMessages || messages.length || 0}</strong>
                </div>
                <div className="detail-row">
                  <span>Status</span>
                  <span className="pill pill-info" style={{ fontSize: '0.7rem' }}>Logged & Verified</span>
                </div>

                <a
                  href={`https://wa.me/${active.phone}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary"
                  style={{ width: '100%', marginTop: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
                >
                  <Phone size={14} /> Open in WhatsApp Web
                </a>
              </div>

              <div className="detail-section">
                <h3>Webhook Ready</h3>
                <p className="subtext" style={{ lineHeight: 1.5, fontSize: '0.78rem' }}>
                  When live webhook is configured on AOC portal, incoming customer WhatsApp messages will appear here in real time.
                </p>
                <div style={{ marginTop: '0.5rem', padding: '0.65rem', background: '#0f172a', borderRadius: '6px', fontSize: '0.7rem', color: '#94a3b8', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                  POST /api/whatsapp/webhook
                </div>
              </div>
            </>
          ) : (
            <div className="detail-section">
              <p className="subtext">Select a contact to view customer profile</p>
            </div>
          )}
        </aside>
      </div>

      {/* Modal to simulate incoming messages until real webhook is connected */}
      {showSimModal && (
        <div className="modal-backdrop" onClick={() => setShowSimModal(false)}>
          <form
            className="modal"
            style={{ maxWidth: 460 }}
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSimulateIncoming}
          >
            <div className="modal-header">
              <div>
                <h2>Simulate Incoming Customer Message</h2>
                <p className="subtext">Test new customer data flow without needing a live webhook</p>
              </div>
              <button type="button" className="icon-button" onClick={() => setShowSimModal(false)}>
                ×
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem 0' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.85rem', fontWeight: 500 }}>
                Customer Name
                <input
                  className="input-field"
                  placeholder="e.g. Rahul Mehta"
                  value={simForm.name}
                  onChange={(e) => setSimForm({ ...simForm, name: e.target.value })}
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.85rem', fontWeight: 500 }}>
                Mobile Number (with country code)
                <input
                  className="input-field"
                  placeholder="e.g. 919876543210"
                  value={simForm.phone}
                  onChange={(e) => setSimForm({ ...simForm, phone: e.target.value })}
                  required
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.85rem', fontWeight: 500 }}>
                Message Text
                <textarea
                  className="input-field"
                  rows={3}
                  placeholder="e.g. Hello, what is the price of sourdough bread?"
                  value={simForm.text}
                  onChange={(e) => setSimForm({ ...simForm, text: e.target.value })}
                  required
                />
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowSimModal(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={simLoading}>
                <Sparkles size={14} />
                {simLoading ? 'Simulating...' : 'Send Incoming Message'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
