import { useState } from 'react'
import { motion } from 'framer-motion'

const API = 'http://localhost:3001/api'

export default function AuthModal({ mode: initialMode, onClose, onLogin }) {
    const [mode, setMode] = useState(initialMode)
    const [form, setForm] = useState({ username: '', email: '', password: '' })
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const submit = async () => {
        setError('')
        setLoading(true)
        try {
            const endpoint = mode === 'login' ? '/auth/login' : '/auth/register'
            const body = mode === 'login'
                ? { email: form.email, password: form.password }
                : { username: form.username, email: form.email, password: form.password }

            const res = await fetch(`${API}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Something went wrong')
            onLogin(data.user, data.token)
            onClose()
        } catch (e) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto"
            style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)' }}
            onClick={e => e.target === e.currentTarget && onClose()}>

            <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="w-full max-w-md rounded-[32px] p-8 relative overflow-hidden shadow-[0_0_100px_rgba(200,241,53,0.1)]"
                style={{ background: '#0D0F12', border: '1px solid rgba(200,241,53,0.15)' }}
            >
                {/* Visual Flair */}
                <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full pointer-events-none"
                    style={{ background: 'radial-gradient(circle, rgba(200,241,53,0.1) 0%, transparent 70%)' }} />
                
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="font-display font-900 text-2xl text-white tracking-tight">
                            {mode === 'login' ? 'Welcome Back' : 'Join QueryX'}
                        </h2>
                        <p className="text-ink-500 text-xs font-mono mt-1 uppercase tracking-widest">
                            {mode === 'login' ? 'Access your intelligence' : 'Start optimizing your SQL'}
                        </p>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-full flex items-center justify-center text-ink-500 hover:text-white hover:bg-white/5 transition-all text-2xl leading-none">×</button>
                </div>

                <div className="space-y-4">
                    {mode === 'register' && (
                        <div>
                            <label className="block text-[10px] font-bold text-ink-500 mb-2 uppercase tracking-widest font-mono">Username</label>
                            <input
                                className="w-full bg-ink-900/50 border border-ink-800 rounded-2xl px-4 py-3 text-sm text-ink-100 outline-none focus:border-acid/50 focus:bg-ink-900 transition-all font-mono shadow-inner"
                                placeholder="e.g. sql_ninja"
                                value={form.username}
                                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                            />
                        </div>
                    )}
                    <div>
                        <label className="block text-[10px] font-bold text-ink-500 mb-2 uppercase tracking-widest font-mono">Email Address</label>
                        <input
                            type="email"
                            className="w-full bg-ink-900/50 border border-ink-800 rounded-2xl px-4 py-3 text-sm text-ink-100 outline-none focus:border-acid/50 focus:bg-ink-900 transition-all font-mono shadow-inner"
                            placeholder="you@company.com"
                            value={form.email}
                            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                        />
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-[10px] font-bold text-ink-500 uppercase tracking-widest font-mono">Password</label>
                            {mode === 'login' && <button className="text-[10px] text-acid/60 hover:text-acid font-mono uppercase tracking-tighter">Forgot?</button>}
                        </div>
                        <input
                            type="password"
                            className="w-full bg-ink-900/50 border border-ink-800 rounded-2xl px-4 py-3 text-sm text-ink-100 outline-none focus:border-acid/50 focus:bg-ink-900 transition-all font-mono shadow-inner"
                            placeholder="••••••••"
                            value={form.password}
                            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                            onKeyDown={e => e.key === 'Enter' && submit()}
                        />
                    </div>
                </div>

                {error && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-4 px-4 py-3 rounded-xl bg-ember/5 border border-ember/20 text-ember text-xs font-mono leading-relaxed"
                    >
                        {error}
                    </motion.div>
                )}

                <button
                    onClick={submit}
                    disabled={loading}
                    className="w-full mt-8 py-4 rounded-2xl font-display font-800 text-sm text-ink-950 bg-acid hover:bg-acid-400 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-xl shadow-acid/20 relative group overflow-hidden"
                >
                    <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-[-45deg]" />
                    <span className="relative z-10 uppercase tracking-widest">
                        {loading ? 'Authenticating...' : mode === 'login' ? 'Access Account' : 'Initialize Profile'}
                    </span>
                </button>

                <p className="text-center text-xs text-ink-600 mt-8 font-mono">
                    {mode === 'login' ? "New to QueryX? " : 'Already a member? '}
                    <button
                        className="text-acid font-bold hover:underline"
                        onClick={() => setMode(m => m === 'login' ? 'register' : 'login')}>
                        {mode === 'login' ? 'Create Account' : 'Sign In'}
                    </button>
                </p>
            </motion.div>
        </div>
    )
}