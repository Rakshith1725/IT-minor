import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import SQLEditor from '../components/editor/SQLEditor'
import ResultsPanel from '../components/editor/ResultsPanel'

const API = 'http://localhost:3001/api'

export default function Home({ user, navigate, onOpenAuth }) {
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
        <div className="flex flex-col h-screen pt-16 overflow-hidden bg-ink-950">
            {/* Ambient Background Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-acid/5 blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-frost/5 blur-[120px]" />
            </div>

            {/* Hero strip — only when no result */}
            {!result && !loading && (
                <div className="flex-shrink-0 px-8 pt-12 pb-10 relative z-10">
                    <div className="max-w-4xl mx-auto flex flex-col items-center text-center">
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-acid/5 border border-acid/20 text-acid text-[10px] font-bold font-mono tracking-widest uppercase mb-6 shadow-[0_0_20px_rgba(200,241,53,0.05)]"
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-acid animate-pulse shadow-[0_0_8px_rgba(200,241,53,1)]" />
                            Next-gen query intelligence
                        </motion.div>
                        <h1 className="font-display text-5xl md:text-6xl font-900 leading-[1.1] mb-6 tracking-tight text-white">
                            Master your SQL<br />
                            <span className="text-acid italic relative">
                                performance
                                <svg className="absolute -bottom-2 left-0 w-full h-2 text-acid/30" viewBox="0 0 100 10" preserveAspectRatio="none">
                                    <path d="M0 5 Q 25 0 50 5 T 100 5" fill="none" stroke="currentColor" strokeWidth="2" />
                                </svg>
                            </span>
                        </h1>
                        <p className="text-base text-ink-400 font-body leading-relaxed max-w-xl mb-10">
                            Stop guessing. Get instant execution plan heatmaps, AI-driven index 
                            recommendations, and classical optimizer rewrites in one unified interface.
                        </p>
                        
                        {!user && (
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={onOpenAuth}
                                className="px-8 py-4 rounded-2xl text-ink-950 font-800 text-sm tracking-widest uppercase transition-all duration-300 shadow-2xl shadow-acid/20 border border-acid/50 overflow-hidden relative group"
                                style={{ backgroundColor: '#C8F135' }}
                            >
                                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-[-45deg]" />
                                <span className="relative z-10">Start Analyzing Now</span>
                            </motion.button>
                        )}
                    </div>
                </div>
            )}

            {/* Main split layout */}
            <div className={`flex-1 flex min-h-0 overflow-hidden relative z-10 ${result || loading ? 'p-0' : 'px-8 pb-8'}`}>
                <div className={`flex flex-1 min-h-0 overflow-hidden rounded-2xl border border-ink-800/40 bg-ink-900/40 backdrop-blur-sm shadow-2xl transition-all duration-700 ${
                    result || loading ? 'm-0 rounded-none border-x-0 border-b-0' : ''
                }`}>
                    {/* Left: Editor */}
                    <div className={`flex flex-col min-h-0 border-r border-ink-800/60 transition-all duration-700 ${result ? 'lg:w-[40%] xl:w-[35%] flex-shrink-0' : 'w-full flex-1'
                        }`}>
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
                        <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-ink-950/20">
                            {loading ? (
                                <div className="flex-1 min-h-0 overflow-auto p-6">
                                    <LoadingSkeleton />
                                </div>
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
            </div>

            {/* Error toast */}
            <AnimatePresence>
                {error && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100]"
                    >
                        <div className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-ink-900 border border-ember/40 text-sm shadow-2xl shadow-black/50 backdrop-blur-xl max-w-md">
                            <div className="w-2 h-2 rounded-full bg-ember shadow-[0_0_10px_rgba(255,92,53,0.8)] flex-shrink-0" />
                            <div className="flex-1">
                                <p className="text-ember font-bold text-[10px] uppercase tracking-widest mb-0.5">Analysis Error</p>
                                <p className="text-ink-50 font-mono text-xs leading-relaxed">{error}</p>
                            </div>
                            <button onClick={() => setError(null)} className="p-1 rounded-lg hover:bg-white/5 text-ink-500 transition-colors">
                                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
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