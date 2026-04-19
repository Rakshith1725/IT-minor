import { useState, useEffect } from 'react'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Share from './pages/Share'
import Navbar from './components/shared/Navbar'
import { AnimatePresence, motion } from 'framer-motion'

// Simple client-side router (no react-router dependency)
function useRoute() {
  const [path, setPath] = useState(window.location.pathname)
  useEffect(() => {
    const handler = () => setPath(window.location.pathname)
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [])
  const navigate = (to) => { window.history.pushState({}, '', to); setPath(to) }
  return { path, navigate }
}

export default function App() {
  const { path, navigate } = useRoute()
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('qx_user')) } catch { return null }
  })

  const login = (userData, token) => {
    localStorage.setItem('qx_user', JSON.stringify(userData))
    localStorage.setItem('qx_token', token)
    setUser(userData)
  }
  const logout = () => {
    localStorage.removeItem('qx_user')
    localStorage.removeItem('qx_token')
    setUser(null)
    navigate('/')
  }

  const shareToken = path.startsWith('/share/') ? path.split('/share/')[1] : null

  return (
    <div className="noise-overlay min-h-screen bg-ink-900 text-ink-100">
      {/* Ambient background grid */}
      <div
        className="fixed inset-0 bg-grid-ink bg-grid pointer-events-none"
        style={{ maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)' }}
      />

      {/* Top ambient glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(200,241,53,0.06) 0%, transparent 70%)' }} />

      {!shareToken && (
        <Navbar user={user} navigate={navigate} path={path} onLogout={logout} onLogin={login} />
      )}

      <AnimatePresence mode="wait">
        {shareToken ? (
          <Share key="share" token={shareToken} />
        ) : path === '/dashboard' ? (
          <motion.div key="dashboard"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}>
            <Dashboard user={user} navigate={navigate} />
          </motion.div>
        ) : (
          <motion.div key="home"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}>
            <Home user={user} navigate={navigate} onLogin={login} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}