import { useState } from 'react'

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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
            onClick={e => e.target === e.currentTarget && onClose()}>

            <div className="w-full max-w-sm rounded-2xl p-6 animate-fade-up relative overflow-hidden"
                style={{ background: '#111418', border: '1px solid rgba(200,241,53,0.12)' }}>

                {/* Glow corner */}
                <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full pointer-events-none"
                    style={{ background: 'radial-gradient(circle, rgba(200,241,53,0.08) 0%, transparent 70%)' }} />

                <div className="flex items-center justify-between mb-6">
                    <h2 className="font-display font-700 text-lg">
                        {mode === 'login' ? 'Welcome back' : 'Create account'}
                    </h2>
                    <button onClick={onClose} className="text-ink-400 hover:text-ink-100 transition-colors text-xl leading-none">×</button>
                </div>

                <div className="space-y-3">
                    {mode === 'register' && (
                        <div>
                            <label className="block text-xs text-ink-400 mb-1 font-mono">username</label>
                            <input
                                className="w-full bg-ink-800 border border-ink-700 rounded-lg px-3 py-2.5 text-sm text-ink-100 outline-none focus:border-acid/50 transition-colors font-mono"
                                placeholder="your_handle"
                                value={form.username}
                                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                            />
                        </div>
                    )}
                    <div>
                        <label className="block text-xs text-ink-400 mb-1 font-mono">email</label>
                        <input
                            type="email"
                            className="w-full bg-ink-800 border border-ink-700 rounded-lg px-3 py-2.5 text-sm text-ink-100 outline-none focus:border-acid/50 transition-colors font-mono"
                            placeholder="you@example.com"
                            value={form.email}
                            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-ink-400 mb-1 font-mono">password</label>
                        <input
                            type="password"
                            className="w-full bg-ink-800 border border-ink-700 rounded-lg px-3 py-2.5 text-sm text-ink-100 outline-none focus:border-acid/50 transition-colors font-mono"
                            placeholder="••••••••"
                            value={form.password}
                            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                            onKeyDown={e => e.key === 'Enter' && submit()}
                        />
                    </div>
                </div>

                {error && (
                    <div className="mt-3 px-3 py-2 rounded-lg bg-ember/10 border border-ember/20 text-ember text-xs font-mono">
                        {error}
                    </div>
                )}

                <button
                    onClick={submit}
                    disabled={loading}
                    className="w-full mt-4 py-2.5 rounded-lg font-display font-600 text-sm text-ink-900 bg-acid hover:bg-acid-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-[0.98]">
                    {loading ? '...' : mode === 'login' ? 'Sign in' : 'Create account'}
                </button>

                <p className="text-center text-xs text-ink-400 mt-4">
                    {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                    <button
                        className="text-acid hover:underline"
                        onClick={() => setMode(m => m === 'login' ? 'register' : 'login')}>
                        {mode === 'login' ? 'Sign up' : 'Sign in'}
                    </button>
                </p>
            </div>
        </div>
    )
}