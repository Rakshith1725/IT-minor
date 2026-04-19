import { motion } from 'framer-motion'
import { useState } from 'react'
import AuthModal from './AuthModal'

export default function Navbar({ user, navigate, path, onLogout, onLogin }) {
  const [showAuth, setShowAuth] = useState(false)

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-40 h-14 border-b border-ink-800/60 bg-ink-950/80 backdrop-blur-md px-6">
        <div className="max-w-7xl mx-auto h-full flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer group"
            onClick={() => navigate('/')}
          >
            <div className="relative w-7 h-7 flex items-center justify-center">
              <div className="absolute inset-0 bg-acid/20 rounded-lg blur-sm group-hover:bg-acid/30 transition-colors" />
              <div className="relative w-5 h-5 border-2 border-acid rounded flex items-center justify-center transform group-hover:scale-110 transition-transform">
                <div className="w-1.5 h-1.5 bg-acid rounded-sm" />
              </div>
            </div>
            <span className="font-display text-lg font-700 tracking-tight text-ink-50">
              Query<span className="text-acid">X</span>
            </span>
          </div>

          <div className="flex items-center gap-8">
            <div className="hidden md:flex items-center gap-6">
              {[
                { name: 'Optimizer', path: '/', active: path === '/' },
                { name: 'Dashboard', path: '/dashboard', active: path === '/dashboard' },
              ].map((item) => (
                <button
                  key={item.name}
                  onClick={() => navigate(item.path)}
                  className={`relative text-xs font-500 tracking-wide uppercase transition-colors ${
                    item.active ? 'text-acid' : 'text-ink-400 hover:text-ink-200'
                  }`}
                >
                  {item.name}
                  {item.active && (
                    <motion.div
                      layoutId="nav-glow"
                      className="absolute -bottom-1 left-0 right-0 h-[1px] bg-acid/40"
                    />
                  )}
                </button>
              ))}
            </div>

            <div className="h-4 w-[1px] bg-ink-800 hidden md:block" />

            {user ? (
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-end">
                  <span className="text-xs font-600 text-ink-100">{user.username}</span>
                  <span className="text-[10px] text-ink-500 font-mono tracking-tighter">PREMIUM_TIER</span>
                </div>
                <button 
                  onClick={onLogout}
                  className="w-8 h-8 rounded-lg bg-ink-800 border border-ink-700 flex items-center justify-center hover:border-ember/40 hover:text-ember transition-all group"
                  title="Logout"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transform group-hover:translate-x-0.5 transition-transform"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="px-4 py-1.5 rounded-lg bg-acid text-ink-950 font-700 text-xs tracking-wide uppercase hover:bg-acid-400 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-acid/10 border border-acid/50"
              >
                Connect
              </button>
            )}
          </div>
        </div>
      </nav>

      {showAuth && (
        <AuthModal 
          mode="login"
          onClose={() => setShowAuth(false)} 
          onLogin={onLogin} 
        />
      )}
    </>
  )
}
