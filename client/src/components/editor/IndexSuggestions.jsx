import { useState } from 'react'

const SEV_CONFIG = {
    HIGH: { color: '#FF5C35', bg: 'rgba(255,92,53,0.08)', border: 'rgba(255,92,53,0.2)', label: 'HIGH', icon: '🔴' },
    MEDIUM: { color: '#FFB347', bg: 'rgba(255,179,71,0.08)', border: 'rgba(255,179,71,0.2)', label: 'MED', icon: '🟡' },
    LOW: { color: '#38BDF8', bg: 'rgba(56,189,248,0.08)', border: 'rgba(56,189,248,0.2)', label: 'LOW', icon: '🔵' },
}

const INDEX_TYPE_COLORS = {
    btree: { bg: 'rgba(200,241,53,0.1)', border: 'rgba(200,241,53,0.25)', color: '#C8F135' },
    gin: { bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.25)', color: '#8B5CF6' },
    hash: { bg: 'rgba(56,189,248,0.1)', border: 'rgba(56,189,248,0.25)', color: '#38BDF8' },
    brin: { bg: 'rgba(255,179,71,0.1)', border: 'rgba(255,179,71,0.25)', color: '#FFB347' },
}

function CopyButton({ text }) {
    const [copied, setCopied] = useState(false)
    const copy = () => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 1800)
        })
    }
    return (
        <button onClick={copy}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono transition-all duration-200 ${copied
                    ? 'bg-acid/15 text-acid border border-acid/30'
                    : 'bg-ink-800/90 text-frost border border-frost/25 hover:bg-frost/15 hover:border-frost/40'
                }`}>
            {copied ? (
                <>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    copied
                </>
            ) : (
                <>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    copy DDL
                </>
            )}
        </button>
    )
}

// Safely convert any value to a display string (AST can return objects)
const safeStr = (v) => {
    if (v == null) return ''
    if (typeof v === 'string') return v
    if (typeof v === 'number') return String(v)
    if (typeof v === 'object') return JSON.stringify(v)
    return String(v)
}

export default function IndexSuggestions({ suggestions = [] }) {
    const [expanded, setExpanded] = useState(null)

    if (!suggestions.length) {
        return (
            <div className="flex flex-col items-center justify-center flex-1 min-h-0 h-full text-ink-400 gap-3 py-16 px-4 bg-ink-950/30">
                <div className="w-14 h-14 rounded-2xl bg-acid/10 border border-acid/20 flex items-center justify-center shadow-lg">
                    <svg className="w-7 h-7 text-acid" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <p className="text-sm font-mono text-ink-400 font-600">No index issues found</p>
                <p className="text-xs text-ink-600 font-mono text-center max-w-xs leading-relaxed">
                    Your query already leverages indexes well. Run ANALYZE on your tables to keep statistics current.
                </p>
            </div>
        )
    }

    const counts = { HIGH: 0, MEDIUM: 0, LOW: 0 }
    suggestions.forEach(s => { if (counts[s.severity] !== undefined) counts[s.severity]++ })

    // Sort by severity: HIGH first
    const sorted = [...suggestions].sort((a, b) => {
        const order = { HIGH: 0, MEDIUM: 1, LOW: 2 }
        return (order[a.severity] ?? 3) - (order[b.severity] ?? 3)
    })

    return (
        <div className="flex flex-col flex-1 min-h-0 h-full overflow-hidden">
            {/* Summary bar with severity breakdown */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-ink-800/60 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-acid" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <span className="text-xs text-ink-400 font-mono font-600">
                        {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''} found
                    </span>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                    {Object.entries(counts).map(([sev, count]) => count > 0 && (
                        <div key={sev} className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-mono"
                            style={{ background: SEV_CONFIG[sev].bg, border: `1px solid ${SEV_CONFIG[sev].border}`, color: SEV_CONFIG[sev].color }}>
                            <span className="font-700">{count}</span>
                            <span className="opacity-70">{SEV_CONFIG[sev].label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Impact summary */}
            {counts.HIGH > 0 && (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-ember/5 border-b border-ember/10 flex-shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-ember animate-pulse shadow-[0_0_8px_rgba(255,92,53,0.6)]" />
                    <span className="text-xs font-mono text-ember/90">
                        {counts.HIGH} critical missing index{counts.HIGH > 1 ? 'es' : ''} — these cause full table scans
                    </span>
                </div>
            )}

            {/* Suggestions list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {sorted.map((s, i) => {
                    const cfg = SEV_CONFIG[s.severity] || SEV_CONFIG.LOW
                    const idxColor = INDEX_TYPE_COLORS[s.index_type] || INDEX_TYPE_COLORS.btree
                    const open = expanded === i
                    const isSelectStar = s.column_name === '*'

                    return (
                        <div key={i}
                            className="rounded-xl overflow-hidden transition-all duration-300 animate-fade-up"
                            style={{
                                background: cfg.bg,
                                border: `1px solid ${cfg.border}`,
                                animationDelay: `${i * 60}ms`,
                                animationFillMode: 'both',
                            }}>

                            {/* Header */}
                            <button
                                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
                                onClick={() => setExpanded(open ? null : i)}>

                                {/* Severity dot */}
                                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-lg"
                                    style={{
                                        background: cfg.color,
                                        boxShadow: s.severity === 'HIGH' ? `0 0 10px ${cfg.color}80` : 'none',
                                    }} />

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-xs font-mono font-600" style={{ color: cfg.color }}>
                                            {isSelectStar ? (
                                                <>{safeStr(s.table_name)}.<span className="font-800">*</span></>
                                            ) : (
                                                <>{safeStr(s.table_name)}.<span className="font-800">{safeStr(s.column_name)}</span></>
                                            )}
                                        </span>
                                        {s.index_type && !isSelectStar && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-600"
                                                style={{
                                                    background: idxColor.bg,
                                                    border: `1px solid ${idxColor.border}`,
                                                    color: idxColor.color,
                                                }}>
                                                {s.index_type.toUpperCase()}
                                            </span>
                                        )}
                                        {isSelectStar && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-600 bg-frost/10 border border-frost/20 text-frost">
                                                ADVISORY
                                            </span>
                                        )}
                                        <span className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                                            style={{ background: cfg.color + '15', color: cfg.color }}>
                                            {s.severity}
                                        </span>
                                    </div>
                                    {!open && (
                                        <p className="text-xs text-ink-500 font-mono mt-0.5 truncate">{s.reason}</p>
                                    )}
                                </div>

                                <svg className={`w-4 h-4 text-ink-500 transition-transform duration-200 flex-shrink-0 ${open ? 'rotate-180' : ''}`}
                                    fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {/* Expanded content */}
                            {open && (
                                <div className="px-4 pb-4 space-y-3 border-t border-ink-800/40 pt-3">
                                    {/* Reason */}
                                    <div className="flex items-start gap-2">
                                        <svg className="w-4 h-4 text-ink-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <p className="text-xs text-ink-300 font-mono leading-relaxed">{s.reason}</p>
                                    </div>

                                    {/* Impact explanation */}
                                    {s.severity === 'HIGH' && (
                                        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-ember/5 border border-ember/10">
                                            <svg className="w-3.5 h-3.5 text-ember flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                            </svg>
                                            <p className="text-[10px] text-ember/80 font-mono">
                                                Without this index, the database must perform a full sequential scan on every query, resulting in O(n) performance degradation as the table grows.
                                            </p>
                                        </div>
                                    )}

                                    {/* DDL Statement */}
                                    {s.create_statement && !s.create_statement.startsWith('--') && (
                                        <div>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-xs text-ink-500 font-mono font-600">CREATE INDEX Statement</span>
                                                <CopyButton text={s.create_statement} />
                                            </div>
                                            <pre className="text-xs font-mono text-acid/90 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap"
                                                style={{ background: 'rgba(200,241,53,0.04)', border: '1px solid rgba(200,241,53,0.1)' }}>
                                                {s.create_statement}
                                            </pre>
                                        </div>
                                    )}

                                    {/* Advisory (for SELECT * etc.) */}
                                    {s.create_statement && s.create_statement.startsWith('--') && (
                                        <div className="p-3 rounded-lg bg-frost/5 border border-frost/10">
                                            <p className="text-xs font-mono text-frost/80 leading-relaxed">
                                                {s.create_statement.replace(/^--\s*/, '')}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}