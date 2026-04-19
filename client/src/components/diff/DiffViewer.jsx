import { useMemo, useState } from 'react'

function tokenize(sql) {
    const KEYWORDS = /\b(SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|FULL|ON|AND|OR|NOT|IN|EXISTS|AS|GROUP|BY|ORDER|HAVING|LIMIT|OFFSET|WITH|UNION|INSERT|UPDATE|DELETE|SET|VALUES|RETURNING|DISTINCT|COUNT|SUM|MAX|MIN|AVG|CASE|WHEN|THEN|ELSE|END|NULL|IS|LIKE|ILIKE|BETWEEN|ASC|DESC|CREATE|INDEX|TABLE|EXPLAIN|ANALYZE|LATERAL)\b/gi

    return sql.split('\n').map(line => {
        let result = line
            .replace(/--[^\n]*/g, m => `<span class="token-comment">${m}</span>`)
            .replace(/'[^']*'/g, m => `<span class="token-string">${m}</span>`)
            .replace(/\b\d+(\.\d+)?\b/g, m => `<span class="token-number">${m}</span>`)
            .replace(KEYWORDS, m => `<span class="token-keyword">${m.toUpperCase()}</span>`)
            .replace(/\/\*[\s\S]*?\*\//g, m => `<span class="token-comment">${m}</span>`)
        return result
    })
}

function computeDiff(original, optimized) {
    const origLines = (original || '').split('\n')
    const optLines = (optimized || '').split('\n')
    const result = []

    const maxLen = Math.max(origLines.length, optLines.length)
    for (let i = 0; i < maxLen; i++) {
        const o = origLines[i] ?? ''
        const n = optLines[i] ?? ''
        result.push({
            original: o,
            optimized: n,
            type: o === n ? 'same' : (n === '' ? 'removed' : o === '' ? 'added' : 'changed'),
            lineNo: i + 1,
        })
    }
    return result
}

function CodePanel({ lines, side, tokenized }) {
    return (
        <div className="flex-1 overflow-auto font-mono text-xs leading-6 min-w-0">
            {lines.map((line, i) => {
                const type = line.type
                const text = side === 'original' ? line.original : line.optimized
                const tok = side === 'original' ? tokenized.orig[i] : tokenized.opt[i]
                let cls = 'diff-neutral px-3'
                if (type === 'changed' || type === 'removed' || (type !== 'same' && side === 'original')) {
                    if (side === 'original' && type !== 'same') cls = 'diff-removed px-3'
                }
                if (side === 'optimized' && type !== 'same') cls = 'diff-added px-3'

                return (
                    <div key={i} className={`flex ${cls} hover:bg-ink-800/30 transition-colors`} style={{ minHeight: '1.5rem' }}>
                        <span className="text-ink-600 w-8 flex-shrink-0 select-none text-right mr-3">{i + 1}</span>
                        <span dangerouslySetInnerHTML={{ __html: tok || '' }} className="flex-1 whitespace-pre-wrap break-all" />
                    </div>
                )
            })}
        </div>
    )
}

export default function DiffViewer({
    original,
    classicalSQL,
    aiSQL,
    classicalOpts = [],
    classicalFallback = false,
    fallbackReason,
    aiLoading,
    onRequestAI,
    regression,
}) {
    const [activeTab, setActiveTab] = useState('classical')

    const optimized = activeTab === 'ai' ? aiSQL : classicalSQL

    const diff = useMemo(() => computeDiff(original, optimized), [original, optimized])
    const tokenized = useMemo(() => ({
        orig: tokenize(original || '').map((_, i) => tokenize(original || '')[i]),
        opt: tokenize(optimized || '').map((_, i) => tokenize(optimized || '')[i]),
    }), [original, optimized])

    // Re-compute properly
    const origTok = tokenize(original || '')
    const optTok = tokenize(optimized || '')

    const tabs = [
        { id: 'classical', label: 'Classical optimizer', count: classicalOpts.filter(o => o.applied).length },
        { id: 'ai', label: 'AI optimizer', count: null },
    ]

    return (
        <div className="flex flex-col h-full">
            {/* Tab bar */}
            <div className="flex items-center gap-1 px-4 py-2.5 border-b border-ink-800/60">
                {tabs.map(tab => (
                    <button key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition-all duration-200 border ${activeTab === tab.id
                            ? 'bg-ink-800 text-ink-50 border-ink-600'
                            : 'text-ink-400 border-ink-800/80 bg-ink-900/40 hover:text-ink-100 hover:border-ink-700'
                            }`}>
                        {tab.label}
                        {tab.count !== null && tab.count > 0 && (
                            <span className="px-1.5 py-0.5 rounded text-xs bg-acid/15 text-acid font-500">{tab.count}</span>
                        )}
                    </button>
                ))}

                {/* Regression badge */}
                {regression && activeTab === 'ai' && (
                    <div className={`ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono ${regression.verdict === 'regression'
                        ? 'bg-ember/10 text-ember border border-ember/20'
                        : regression.verdict === 'improvement'
                            ? 'bg-acid/10 text-acid border border-acid/20'
                            : 'bg-ink-800 text-ink-400 border border-ink-700'
                        }`}>
                        {regression.verdict === 'improvement' && '↑'}
                        {regression.verdict === 'regression' && '↓'}
                        {regression.verdict === 'neutral' && '→'}
                        {Math.abs(regression.deltaPct || 0).toFixed(1)}% {regression.verdict}
                    </div>
                )}
            </div>

            {/* Classical opts summary */}
            {activeTab === 'classical' && classicalOpts.length > 0 && (
                <div className="px-4 py-2 border-b border-ink-800/40 flex items-center gap-2 flex-wrap">
                    {classicalFallback && (
                        <span className="text-xs text-amber-400 font-mono bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                            analysis only — query too complex for auto-rewrite
                        </span>
                    )}
                    {classicalOpts.filter(o => o.applied || o.analysisOnly).map((o, i) => (
                        <span key={i} className="text-xs font-mono px-2 py-0.5 rounded bg-acid/8 text-acid/80 border border-acid/15">
                            {o.title}
                        </span>
                    ))}
                </div>
            )}

            {/* AI tab — request AI */}
            {activeTab === 'ai' && !aiSQL && (
                <div className="flex-1 flex flex-col items-center justify-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                        <svg className="w-7 h-7 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.347.35A3.007 3.007 0 0018 14.5H6a3 3 0 00-2.09.85l-.347-.35z" />
                        </svg>
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-body text-ink-300 mb-1">AI-powered rewrite</p>
                        <p className="text-xs text-ink-500 font-mono max-w-xs">
                            Claude will rewrite your query using Layer 1 + 2 findings as context
                        </p>
                    </div>
                    <button onClick={onRequestAI} disabled={aiLoading}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-display font-600 text-white bg-violet-500 hover:bg-violet-400 border border-violet-400/50 shadow-lg shadow-violet-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-[0.97]">
                        {aiLoading ? (
                            <>
                                <span className="w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin" />
                                Asking Claude...
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                Optimize with AI
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Diff view */}
            {(activeTab === 'classical' ? classicalSQL : aiSQL) && (
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Column headers */}
                    <div className="flex border-b border-ink-800/60">
                        <div className="flex-1 px-4 py-2 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-ember" />
                            <span className="text-xs font-mono text-ink-400">original</span>
                        </div>
                        <div className="w-px bg-ink-800" />
                        <div className="flex-1 px-4 py-2 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-acid" />
                            <span className="text-xs font-mono text-ink-400">
                                {activeTab === 'classical' ? 'classical optimizer' : 'ai optimizer'}
                            </span>
                        </div>
                    </div>

                    {/* Side by side diff */}
                    <div className="flex-1 flex overflow-auto">
                        <div className="flex-1 border-r border-ink-800/60 overflow-auto">
                            {diff.map((line, i) => (
                                <div key={i}
                                    className={`flex items-start px-3 font-mono text-xs leading-6 min-h-6 ${line.type !== 'same' ? 'diff-removed' : 'diff-neutral border-l-2 border-transparent'
                                        } hover:bg-ink-800/20`}>
                                    <span className="text-ink-700 w-7 flex-shrink-0 select-none text-right mr-3 pt-0.5">{i + 1}</span>
                                    <span dangerouslySetInnerHTML={{ __html: origTok[i] || '' }}
                                        className="flex-1 whitespace-pre-wrap break-all text-ink-300" />
                                </div>
                            ))}
                        </div>
                        <div className="flex-1 overflow-auto">
                            {diff.map((line, i) => (
                                <div key={i}
                                    className={`flex items-start px-3 font-mono text-xs leading-6 min-h-6 ${line.type !== 'same' ? 'diff-added' : 'diff-neutral border-l-2 border-transparent'
                                        } hover:bg-ink-800/20`}>
                                    <span className="text-ink-700 w-7 flex-shrink-0 select-none text-right mr-3 pt-0.5">{i + 1}</span>
                                    <span dangerouslySetInnerHTML={{ __html: optTok[i] || '' }}
                                        className="flex-1 whitespace-pre-wrap break-all text-ink-300" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}