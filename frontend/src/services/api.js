import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

const unwrap = (response) => response.data?.data ?? response.data
export const apiService = {
  // Products (WooCommerce)
  getProducts: async (params = {}) => unwrap(await api.get('/products', { params })),
  getProduct: async (id) => unwrap(await api.get(`/products/${id}`)),

  // Orders (WooCommerce)
  getOrders: async (params = {}) => (await api.get('/orders', { params })).data,
  getOrder: async (id) => unwrap(await api.get(`/orders/${id}`)),
  createOrder: async (order) => unwrap(await api.post('/orders', order)),
  createPaymentLink: async (payload) => unwrap(await api.post('/orders/payment-link', payload)),

  // WhatsApp messaging
  sendWhatsAppMessage: async (to, text) => unwrap(await api.post('/whatsapp/send', { to, text })),
  generateAiReply: async (payload) => unwrap(await api.post('/ai/reply', payload)),

  // Conversations & Messages (NEW)
  getConversations: async () => unwrap(await api.get('/whatsapp/conversations')),
  getConversationMessages: async (phone) => unwrap(await api.get(`/whatsapp/conversations/${encodeURIComponent(phone)}/messages`)),
  getMessageLogs: async () => unwrap(await api.get('/whatsapp/logs')),

  // Customers (NEW)
  getCustomers: async () => unwrap(await api.get('/customers')),

  // Dashboard stats (NEW)
  getStats: async () => unwrap(await api.get('/stats')),

  // WhatsApp connection status (NEW)
  getWhatsAppStatus: async () => unwrap(await api.get('/whatsapp/status')),
}
export const getApiError = (error, fallback = 'Something went wrong. Please try again.') =>
  error.response?.data?.message || error.message || fallback
export default api
