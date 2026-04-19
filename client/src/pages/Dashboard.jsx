import { useState, useEffect, useRef } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'

const API = 'http://localhost:3001/api'

function CostBadge({ score }) {
    const color = score > 70 ? '#C8F135' : score > 40 ? '#FFB347' : '#FF5C35'
    return (
        <div className="flex items-center gap-1.5">
            <div className="h-1 w-12 rounded-full bg-ink-800 overflow-hidden">
                <div className="h-1 rounded-full" style={{ width: `${score}%`, background: color }} />
            </div>
            <span className="text-xs font-mono" style={{ color }}>{score}</span>
        </div>
    )
}

function StatCard({ label, value, sub, color = '#C8F135', icon }) {
    return (
        <div className="rounded-2xl p-4 relative overflow-hidden"
            style={{ background: '#111418', border: '1px solid rgba(200,241,53,0.08)' }}>
            <div className="absolute top-0 right-0 w-24 h-24 pointer-events-none"
                style={{ background: `radial-gradient(circle at top right, ${color}08 0%, transparent 70%)` }} />
            <div className="flex items-start justify-between mb-3">
                <span className="text-xs text-ink-500 font-mono">{label}</span>
                {icon && <span className="text-lg opacity-40">{icon}</span>}
            </div>
            <div className="text-2xl font-display font-700" style={{ color }}>{value}</div>
            {sub && <div className="text-xs text-ink-500 font-mono mt-1">{sub}</div>}
        </div>
    )
}

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
        <div className="rounded-xl px-3 py-2 text-xs font-mono"
            style={{ background: '#111418', border: '1px solid rgba(200,241,53,0.15)' }}>
            <p className="text-ink-400 mb-1">{label}</p>
            {payload.map((p, i) => (
                <p key={i} style={{ color: p.color }}>{p.name}: {p.value}</p>
            ))}
        </div>
    )
}

export default function Dashboard({ user, navigate }) {
    const [history, setHistory] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')

    useEffect(() => {
        const token = localStorage.getItem('qx_token')
        fetch(`${API}/history?limit=50`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
            .then(r => r.json())
            .then(d => { setHistory(d.queries || []); setLoading(false) })
            .catch(() => setLoading(false))
    }, [])

    const filtered = history.filter(q =>
        q.raw_query?.toLowerCase().includes(search.toLowerCase())
    )

    // Build chart data from history
    const chartData = history.slice(-20).map((q, i) => ({
        name: new Date(q.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
        score: q.cost_score || 0,
        time: q.execution_time_ms || 0,
    })).reverse()

    const avgScore = history.length
        ? Math.round(history.reduce((s, q) => s + (q.cost_score || 0), 0) / history.length)
        : 0
    const slowest = history.reduce((max, q) => Math.max(max, q.execution_time_ms || 0), 0)
    const worstQueries = [...history].sort((a, b) => (a.cost_score || 0) - (b.cost_score || 0)).slice(0, 3)

    return (
        <div className="min-h-screen pt-14">
            <div className="max-w-6xl mx-auto px-6 py-8">

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="font-display text-2xl font-700">Dashboard</h1>
                        <p className="text-sm text-ink-400 font-mono mt-1">
                            {user ? `${user.username}'s query history` : 'recent queries'}
                        </p>
                    </div>
                    <button onClick={() => navigate('/')}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-display font-600 text-ink-900 bg-acid hover:bg-acid-300 transition-all active:scale-[0.97]">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                        </svg>
                        New query
                    </button>
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <StatCard label="queries analyzed" value={history.length} icon="⚡" color="#C8F135" />
                    <StatCard label="avg cost score" value={`${avgScore}/100`} icon="◎" color="#38BDF8" sub="higher is better" />
                    <StatCard label="slowest query" value={`${slowest}ms`} icon="⏱" color="#FF5C35" />
                    <StatCard label="optimizations run" value={history.reduce((s, q) => s + (q.suggestion_count || 0), 0)} icon="⟳" color="#8B5CF6" />
                </div>

                <div className="grid lg:grid-cols-3 gap-6 mb-8">

                    {/* Cost score trend */}
                    <div className="lg:col-span-2 rounded-2xl p-5"
                        style={{ background: '#111418', border: '1px solid rgba(200,241,53,0.08)' }}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-display font-600 text-sm">Cost score trend</h2>
                            <span className="text-xs text-ink-500 font-mono">last 20 queries</span>
                        </div>
                        {chartData.length > 1 ? (
                            <ResponsiveContainer width="100%" height={180}>
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#C8F135" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#C8F135" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="name" tick={{ fill: '#4A5568', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                                    <YAxis domain={[0, 100]} tick={{ fill: '#4A5568', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area type="monotone" dataKey="score" name="score" stroke="#C8F135" strokeWidth={1.5} fill="url(#scoreGrad)" dot={{ fill: '#C8F135', r: 2 }} activeDot={{ r: 4, fill: '#C8F135' }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-44 flex items-center justify-center text-ink-600 text-sm font-mono">
                                run more queries to see trends
                            </div>
                        )}
                    </div>

                    {/* Worst queries */}
                    <div className="rounded-2xl p-5"
                        style={{ background: '#111418', border: '1px solid rgba(255,92,53,0.1)' }}>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-1.5 h-1.5 rounded-full bg-ember animate-pulse" />
                            <h2 className="font-display font-600 text-sm">Most expensive</h2>
                        </div>
                        <div className="space-y-3">
                            {worstQueries.length === 0 && (
                                <p className="text-xs text-ink-600 font-mono">no queries yet</p>
                            )}
                            {worstQueries.map((q, i) => (
                                <div key={q.id} className="flex items-start gap-2">
                                    <span className="text-xs text-ink-600 font-mono mt-0.5 w-4 flex-shrink-0">#{i + 1}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-mono text-ink-300 truncate">{q.raw_query?.slice(0, 50)}...</p>
                                        <CostBadge score={q.cost_score || 0} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* History table */}
                <div className="rounded-2xl overflow-hidden"
                    style={{ background: '#111418', border: '1px solid rgba(200,241,53,0.08)' }}>

                    <div className="flex items-center justify-between px-5 py-4 border-b border-ink-800/60">
                        <h2 className="font-display font-600 text-sm">Query history</h2>
                        <div className="relative">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                className="bg-ink-800 border border-ink-700 rounded-lg pl-8 pr-3 py-1.5 text-xs font-mono text-ink-200 outline-none focus:border-acid/40 transition-colors w-52"
                                placeholder="search queries..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div className="p-5 space-y-3">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="skeleton h-10 rounded-xl" />
                            ))}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="py-16 text-center text-ink-600 text-sm font-mono">
                            {search ? 'no matching queries' : 'no queries yet — run one to get started'}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-xs font-mono text-ink-500 border-b border-ink-800/40">
                                        <th className="text-left px-5 py-3 font-400">query</th>
                                        <th className="text-left px-4 py-3 font-400">dialect</th>
                                        <th className="text-left px-4 py-3 font-400">cost score</th>
                                        <th className="text-left px-4 py-3 font-400">exec time</th>
                                        <th className="text-left px-4 py-3 font-400">ran</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((q, i) => (
                                        <tr key={q.id}
                                            className="border-b border-ink-800/30 hover:bg-ink-800/20 transition-colors cursor-pointer animate-fade-up"
                                            style={{ animationDelay: `${i * 30}ms`, animationFillMode: 'both' }}
                                            onClick={() => navigate('/')}>
                                            <td className="px-5 py-3 max-w-xs">
                                                <p className="text-xs font-mono text-ink-300 truncate">
                                                    {q.raw_query?.replace(/\s+/g, ' ').slice(0, 60)}...
                                                </p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-xs font-mono px-2 py-0.5 rounded bg-ink-800 text-ink-400 border border-ink-700">
                                                    {q.dialect || 'postgresql'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <CostBadge score={q.cost_score || 0} />
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`text-xs font-mono ${(q.execution_time_ms || 0) > 1000 ? 'text-ember' :
                                                        (q.execution_time_ms || 0) > 300 ? 'text-amber-400' : 'text-frost'
                                                    }`}>
                                                    {q.execution_time_ms ? `${q.execution_time_ms}ms` : '—'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-xs font-mono text-ink-500">
                                                    {new Date(q.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}