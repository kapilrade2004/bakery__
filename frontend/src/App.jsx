import { useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import Dashboard from './pages/Dashboard'
import WhatsAppInbox from './pages/WhatsAppInbox'
import Products from './pages/Products'
import Orders from './pages/Orders'
import Customers from './pages/Customers'
import Settings from './pages/Settings'
import './App.css'

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="app-container">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-wrapper">
        <Topbar onMenuToggle={() => setSidebarOpen(true)} />
        <main className="page-content">
          <Routes>
            <Route path="/inbox" element={<WhatsAppInbox />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="*" element={<Navigate to="/inbox" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default App
