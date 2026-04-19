import { useState } from 'react'

const SEV_CONFIG = {
    HIGH: { color: '#FF5C35', bg: 'rgba(255,92,53,0.1)', border: 'rgba(255,92,53,0.2)', label: 'HIGH' },
    MEDIUM: { color: '#FFB347', bg: 'rgba(255,179,71,0.1)', border: 'rgba(255,179,71,0.2)', label: 'MED' },
    LOW: { color: '#38BDF8', bg: 'rgba(56,189,248,0.1)', border: 'rgba(56,189,248,0.2)', label: 'LOW' },
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
                    : 'bg-ink-800 text-ink-400 hover:text-ink-200 border border-ink-700 hover:border-ink-600'
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

export default function IndexSuggestions({ suggestions = [] }) {
    const [expanded, setExpanded] = useState(null)

    if (!suggestions.length) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-ink-500 gap-3 py-16">
                <div className="w-12 h-12 rounded-xl bg-acid/10 flex items-center justify-center">
                    <svg className="w-6 h-6 text-acid" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <p className="text-sm font-mono text-ink-400">no index issues found</p>
                <p className="text-xs text-ink-600 font-mono text-center max-w-xs">
                    your query already uses indexes well, or run ANALYZE to update statistics
                </p>
            </div>
        )
    }

    const counts = { HIGH: 0, MEDIUM: 0, LOW: 0 }
    suggestions.forEach(s => { if (counts[s.severity] !== undefined) counts[s.severity]++ })

    return (
        <div className="flex flex-col h-full">
            {/* Summary bar */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-ink-800/60">
                <span className="text-xs text-ink-500 font-mono">{suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''}</span>
                <div className="flex items-center gap-2 ml-auto">
                    {Object.entries(counts).map(([sev, count]) => count > 0 && (
                        <div key={sev} className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-mono"
                            style={{ background: SEV_CONFIG[sev].bg, border: `1px solid ${SEV_CONFIG[sev].border}`, color: SEV_CONFIG[sev].color }}>
                            <span>{count}</span>
                            <span className="opacity-70">{SEV_CONFIG[sev].label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Suggestions list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {suggestions.map((s, i) => {
                    const cfg = SEV_CONFIG[s.severity] || SEV_CONFIG.LOW
                    const open = expanded === i

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
                                className="w-full flex items-center gap-3 px-4 py-3 text-left"
                                onClick={() => setExpanded(open ? null : i)}>

                                {/* Severity dot */}
                                <div className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse-acid"
                                    style={{ background: cfg.color, animationPlayState: s.severity === 'HIGH' ? 'running' : 'paused' }} />

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-mono font-500" style={{ color: cfg.color }}>
                                            {s.table_name}.<span className="font-700">{s.column_name}</span>
                                        </span>
                                        <span className="text-xs px-1.5 py-0.5 rounded font-mono"
                                            style={{ background: cfg.color + '20', color: cfg.color }}>
                                            {s.index_type || 'btree'}
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
                                    <p className="text-xs text-ink-300 font-mono leading-relaxed">{s.reason}</p>

                                    {s.create_statement && !s.create_statement.startsWith('--') && (
                                        <div>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-xs text-ink-500 font-mono">DDL statement</span>
                                                <CopyButton text={s.create_statement} />
                                            </div>
                                            <pre className="text-xs font-mono text-acid/90 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap"
                                                style={{ background: 'rgba(200,241,53,0.05)', border: '1px solid rgba(200,241,53,0.1)' }}>
                                                {s.create_statement}
                                            </pre>
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