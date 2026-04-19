import { useState, useEffect } from 'react'
import PlanTree from '../components/tree/PlanTree'

const API = 'http://localhost:3001/api'

export default function Share({ token }) {
    const [data, setData] = useState(null)
    const [error, setError] = useState(null)
    const [tab, setTab] = useState('plan')

    useEffect(() => {
        fetch(`${API}/share/${token}`)
            .then(r => r.json())
            .then(d => {
                if (d.error) throw new Error(d.error)
                setData(d)
            })
            .catch(e => setError(e.message))
    }, [token])

    if (error) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
                <div className="text-4xl mb-4 opacity-20">⚠</div>
                <p className="text-ink-400 font-mono text-sm">{error}</p>
                <p className="text-ink-600 font-mono text-xs mt-2">this report may have expired</p>
            </div>
        </div>
    )

    if (!data) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="flex items-center gap-3 text-ink-500 font-mono text-sm">
                <span className="w-4 h-4 border border-ink-700 border-t-acid rounded-full animate-spin" />
                loading report...
            </div>
        </div>
    )

    const { report, planNodes } = data

    return (
        <div className="min-h-screen">
            {/* Share header */}
            <div className="border-b border-ink-800/60 px-6 py-4"
                style={{ background: 'rgba(13,15,18,0.9)', backdropFilter: 'blur(12px)' }}>
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded flex items-center justify-center"
                            style={{ background: 'linear-gradient(135deg, #C8F135 0%, #8B5CF6 100%)' }}>
                            <span className="text-ink-900 font-display font-black text-xs">Q</span>
                        </div>
                        <div>
                            <span className="font-display font-700 text-sm">Query<span className="text-acid">X</span></span>
                            <span className="text-ink-600 text-xs font-mono ml-2">shared report</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-ink-500 font-mono">
                            {report.view_count} view{report.view_count !== 1 ? 's' : ''}
                        </span>
                        <span className="text-xs text-ink-600 font-mono">
                            expires {new Date(report.expires_at).toLocaleDateString()}
                        </span>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 py-8">

                {/* Query */}
                <div className="rounded-2xl mb-6 overflow-hidden"
                    style={{ background: '#111418', border: '1px solid rgba(200,241,53,0.08)' }}>
                    <div className="flex items-center gap-2 px-5 py-3 border-b border-ink-800/60">
                        <div className="w-2 h-2 rounded-full bg-acid" />
                        <span className="text-xs font-mono text-ink-400">original query</span>
                        {report.cost_score && (
                            <div className="ml-auto flex items-center gap-1.5">
                                <span className="text-xs text-ink-500 font-mono">score</span>
                                <span className="text-xs font-mono font-500 text-acid">{report.cost_score}/100</span>
                            </div>
                        )}
                    </div>
                    <pre className="px-5 py-4 text-xs font-mono text-ink-300 overflow-x-auto whitespace-pre-wrap">
                        {report.raw_query}
                    </pre>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 mb-6">
                    {[
                        { id: 'plan', label: 'Execution plan' },
                        { id: 'details', label: 'Query details' },
                    ].map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)}
                            className={`px-4 py-2 rounded-xl text-xs font-mono transition-all ${tab === t.id
                                ? 'bg-acid/10 text-acid border border-acid/20'
                                : 'text-ink-500 hover:text-ink-300 border border-transparent'
                                }`}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {tab === 'plan' && (
                    <div className="rounded-2xl overflow-hidden"
                        style={{ background: '#111418', border: '1px solid rgba(200,241,53,0.08)', height: 600 }}>
                        <PlanTree 
                            planNodes={planNodes} 
                            rawPlanJson={null}
                            planError={report.plan_error}
                            isSimulated={!report.execution_plan && planNodes?.length > 0} 
                        />
                    </div>
                )}

                {tab === 'details' && (
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { label: 'Execution time', value: report.execution_time_ms ? `${report.execution_time_ms}ms` : 'N/A' },
                            { label: 'Cost score', value: report.cost_score ? `${report.cost_score}/100` : 'N/A' },
                            { label: 'Dialect', value: 'PostgreSQL' },
                            { label: 'Plan nodes', value: planNodes?.length || 0 },
                        ].map(({ label, value }) => (
                            <div key={label} className="rounded-2xl p-4"
                                style={{ background: '#111418', border: '1px solid rgba(200,241,53,0.08)' }}>
                                <p className="text-xs text-ink-500 font-mono mb-2">{label}</p>
                                <p className="text-lg font-display font-600 text-acid">{value}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* CTA */}
                <div className="mt-8 text-center">
                    <p className="text-xs text-ink-600 font-mono mb-3">want to analyze your own queries?</p>
                    <a href="/" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-display font-600 text-ink-900 bg-acid hover:bg-acid-300 transition-all">
                        Try QueryX free
                    </a>
                </div>
            </div>
        </div>
    )
}