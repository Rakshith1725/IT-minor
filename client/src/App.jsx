import { useState, useEffect } from 'react'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Share from './pages/Share'
import Navbar from './components/shared/Navbar'
import AuthModal from './components/shared/AuthModal'
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
  const [showAuth, setShowAuth] = useState(false)
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('qx_user')) } catch { return null }
  })

  const login = (userData, token) => {
    localStorage.setItem('qx_user', JSON.stringify(userData))
    localStorage.setItem('qx_token', token)
    setUser(userData)
    setShowAuth(false)
  }
  const logout = () => {
    localStorage.removeItem('qx_user')
    localStorage.removeItem('qx_token')
    setUser(null)
    navigate('/')
  }

  const shareToken = path.startsWith('/share/') ? path.split('/share/')[1] : null

  return (
    <div className="noise-overlay min-h-screen bg-ink-950 text-ink-100 overflow-x-hidden">
      {/* Ambient background grid */}
      <div
        className="fixed inset-0 bg-grid-ink bg-grid pointer-events-none opacity-20"
        style={{ maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)' }}
      />

      {!shareToken && (
        <Navbar 
          user={user} 
          navigate={navigate} 
          path={path} 
          onLogout={logout} 
          onLogin={login}
          onOpenAuth={() => setShowAuth(true)}
        />
      )}

      <AnimatePresence mode="wait">
        {shareToken ? (
          <Share key="share" token={shareToken} />
        ) : path === '/dashboard' ? (
          user ? (
            <motion.div key="dashboard"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}>
              <Dashboard user={user} navigate={navigate} />
            </motion.div>
          ) : (
            <motion.div key="redirect" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center h-screen pt-16">
               <div className="text-center">
                  <p className="text-ink-400 font-mono mb-4 text-sm uppercase tracking-widest">Unauthorized Access</p>
                  <button onClick={() => setShowAuth(true)} className="px-6 py-2 rounded-xl bg-acid text-ink-950 font-800 text-xs">Connect Account to View Dashboard</button>
               </div>
            </motion.div>
          )
        ) : (
          <motion.div key="home"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}>
            <Home user={user} navigate={navigate} onLogin={login} onOpenAuth={() => setShowAuth(true)} />
          </motion.div>
        )}
      </AnimatePresence>

      {showAuth && (
        <AuthModal 
          mode="login" 
          onClose={() => setShowAuth(false)} 
          onLogin={login} 
        />
      )}
    </div>
  )
}