import { useState, useCallback } from 'react'
import SQLEditor from '../components/editor/SQLEditor'
import ResultsPanel from '../components/editor/ResultsPanel'

const API = 'http://localhost:3001/api'

export default function Home({ user, navigate }) {
    const [sql, setSql] = useState('')
    const [dialect, setDialect] = useState('postgresql')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState(null)
    const [aiResult, setAiResult] = useState(null)
    const [aiLoading, setAiLoading] = useState(false)
    const [error, setError] = useState(null)

    const analyze = useCallback(async () => {
        if (!sql.trim()) return
        setLoading(true)
        setError(null)
        setResult(null)
        setAiResult(null)

        try {
            const token = localStorage.getItem('qx_token')
            const res = await fetch(`${API}/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ sql, dialect, userId: user?.id }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Analysis failed')
            setResult({ ...data, rawQuery: sql })
        } catch (e) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }, [sql, dialect, user])

    const requestAI = useCallback(async () => {
        if (!result) return
        setAiLoading(true)
        try {
            const token = localStorage.getItem('qx_token')
            const issues = (result.indexSuggestions || [])
                .filter(s => s.severity === 'HIGH')
                .map(s => `missing index on ${s.table_name}.${s.column_name}`)

            const res = await fetch(`${API}/optimize`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    sql,
                    dialect,
                    issues,
                    queryId: result.queryId,
                    classicalOpts: result.classicalOptimizations || [],
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'AI optimization failed')
            setAiResult(data)
        } catch (e) {
            setError(e.message)
        } finally {
            setAiLoading(false)
        }
    }, [result, sql, dialect])

    return (
        <div className="flex flex-col h-screen pt-14">

            {/* Hero strip — only when no result */}
            {!result && !loading && (
                <div className="flex-shrink-0 px-6 pt-10 pb-6">
                    <div className="max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-acid/10 border border-acid/20 text-acid text-xs font-mono mb-4">
                            <span className="w-1.5 h-1.5 rounded-full bg-acid animate-pulse" />
                            3-layer query optimizer
                        </div>
                        <h1 className="font-display text-3xl font-800 leading-tight mb-2">
                            Why is your SQL<br />
                            <span className="text-acid">slow?</span>
                        </h1>
                        <p className="text-sm text-ink-400 font-body leading-relaxed max-w-md">
                            Paste a query. Get an execution plan heatmap, missing index detection,
                            classical optimizer rewrites, and AI suggestions — in seconds.
                        </p>
                    </div>
                </div>
            )}

            {/* Main split layout */}
            <div className={`flex-1 flex overflow-hidden ${result || loading ? 'pt-0' : ''}`}>

                {/* Left: Editor */}
                <div className={`flex flex-col border-r border-ink-800/60 transition-all duration-500 ${result ? 'w-[42%]' : 'w-full max-w-4xl mx-auto'
                    }`}
                    style={{ background: 'rgba(13,15,18,0.8)' }}>
                    <SQLEditor
                        value={sql}
                        onChange={setSql}
                        onAnalyze={analyze}
                        loading={loading}
                        dialect={dialect}
                        onDialectChange={setDialect}
                    />
                </div>

                {/* Right: Results */}
                {(result || loading) && (
                    <div className="flex-1 overflow-hidden animate-fade-in">
                        {loading ? (
                            <LoadingSkeleton />
                        ) : (
                            <ResultsPanel
                                result={result}
                                aiResult={aiResult}
                                aiLoading={aiLoading}
                                onRequestAI={requestAI}
                                costScore={result?.costScore}
                                executionTimeMs={result?.executionTimeMs}
                            />
                        )}
                    </div>
                )}
            </div>

            {/* Error toast */}
            {error && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-up">
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-ink-800 border border-ember/30 text-sm font-mono max-w-md">
                        <div className="w-1.5 h-1.5 rounded-full bg-ember flex-shrink-0" />
                        <span className="text-ink-200">{error}</span>
                        <button onClick={() => setError(null)} className="text-ink-500 hover:text-ink-200 ml-2">×</button>
                    </div>
                </div>
            )}
        </div>
    )
}

function LoadingSkeleton() {
    return (
        <div className="p-6 space-y-4">
            {/* Metrics */}
            <div className="flex gap-4">
                {[80, 120, 100].map((w, i) => (
                    <div key={i} className="skeleton h-5 rounded" style={{ width: w }} />
                ))}
            </div>
            {/* Tabs */}
            <div className="flex gap-2">
                {[90, 110, 80].map((w, i) => (
                    <div key={i} className="skeleton h-8 rounded-lg" style={{ width: w }} />
                ))}
            </div>
            {/* Tree placeholder */}
            <div className="flex justify-center pt-8">
                <div className="space-y-4">
                    <div className="skeleton h-12 w-36 rounded-xl mx-auto" />
                    <div className="flex gap-6 justify-center">
                        <div className="skeleton h-12 w-32 rounded-xl" />
                        <div className="skeleton h-12 w-32 rounded-xl" />
                    </div>
                    <div className="flex gap-4 justify-center">
                        {[28, 32, 28, 26].map((w, i) => (
                            <div key={i} className="skeleton h-10 rounded-xl" style={{ width: w * 3 }} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}