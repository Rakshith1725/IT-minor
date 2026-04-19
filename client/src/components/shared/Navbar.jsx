import { motion } from 'framer-motion'
import { useState } from 'react'

export default function Navbar({ user, navigate, path, onLogout, onLogin, onOpenAuth }) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-ink-800/40 bg-ink-950/60 backdrop-blur-xl px-6">
      <div className="max-w-7xl mx-auto h-full flex items-center justify-between">
        <div 
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => navigate('/')}
        >
          <div className="relative w-8 h-8 flex items-center justify-center">
            <div className="absolute inset-0 bg-acid/20 rounded-xl blur-md group-hover:bg-acid/40 transition-all duration-500" />
            <div className="relative w-6 h-6 border-2 border-acid/80 rounded-lg flex items-center justify-center transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
              <div className="w-1.5 h-1.5 bg-acid rounded-sm shadow-[0_0_8px_rgba(200,241,53,1)]" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-display text-lg font-800 tracking-tight text-ink-50 leading-none">
              Query<span className="text-acid">X</span>
            </span>
            <span className="text-[10px] font-mono text-ink-500 tracking-widest uppercase mt-0.5">Optimization Engine</span>
          </div>
        </div>

        <div className="flex items-center gap-10">
          <div className="hidden lg:flex items-center gap-8">
            {[
              { name: 'Optimizer', path: '/', active: path === '/' },
              { name: 'Dashboard', path: '/dashboard', active: path === '/dashboard' },
            ].map((item) => (
              <button
                key={item.name}
                onClick={() => navigate(item.path)}
                className={`group relative text-xs font-600 tracking-widest uppercase transition-all ${
                  item.active ? 'text-acid' : 'text-ink-400 hover:text-ink-50'
                }`}
              >
                {item.name}
                <div className={`absolute -bottom-1.5 left-0 h-0.5 bg-acid rounded-full transition-all duration-300 ${
                  item.active ? 'w-full opacity-100' : 'w-0 opacity-0 group-hover:w-1/2 group-hover:opacity-50'
                }`} />
              </button>
            ))}
          </div>

          <div className="h-5 w-[1px] bg-ink-800/60 hidden lg:block" />

          {user ? (
            <div className="flex items-center gap-5">
              <div className="flex flex-col items-end">
                <span className="text-xs font-700 text-ink-50">{user.username}</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-acid animate-pulse" />
                  <span className="text-[10px] text-ink-500 font-mono tracking-tighter uppercase font-600">Premium Tier</span>
                </div>
              </div>
              <button 
                onClick={onLogout}
                className="w-9 h-9 rounded-xl bg-ink-900 border border-ink-800 flex items-center justify-center hover:border-ember/50 hover:text-ember hover:bg-ember/5 transition-all duration-300 group shadow-lg shadow-black/20"
                title="Logout"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transform group-hover:scale-110 transition-transform"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onOpenAuth}
                className="relative group px-6 py-2 rounded-xl text-[#0D0F12] font-900 text-[11px] tracking-widest uppercase transition-all duration-300 shadow-[0_0_20px_rgba(200,241,53,0.3)] overflow-hidden"
                style={{ backgroundColor: '#C8F135' }}
              >
                <div className="absolute inset-0 bg-white/40 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-[-45deg]" />
                <span className="relative z-10 flex items-center gap-2">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><path d="M12 21v-8m0 0V5m0 8h8m-8 0H4" strokeLinecap="round"/></svg>
                  Connect Account
                </span>
              </motion.button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
