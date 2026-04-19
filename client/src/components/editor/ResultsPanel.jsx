import { useState, useRef, useEffect } from 'react'
import PlanTree from '../tree/PlanTree'
import IndexSuggestions from '../editor/IndexSuggestions'
import DiffViewer from '../diff/DiffViewer'

const TABS = [
    { id: 'plan', label: 'Execution plan', icon: '⚡' },
    { id: 'indexes', label: 'Index advisor', icon: '◎' },
    { id: 'rewrite', label: 'Optimizer', icon: '⟳' },
]

export default function ResultsPanel({
    result,
    aiResult,
    aiLoading,
    onRequestAI,
    costScore,
    executionTimeMs,
}) {
    const [tab, setTab] = useState('plan')
    const tabsRef = useRef(null)
    const [indicator, setInd] = useState({ left: 0, width: 0 })

    // Animate tab indicator
    useEffect(() => {
        if (!tabsRef.current) return
        const el = tabsRef.current.querySelector(`[data-tab="${tab}"]`)
        if (!el) return
        const parent = tabsRef.current.getBoundingClientRect()
        const rect = el.getBoundingClientRect()
        setInd({ left: rect.left - parent.left, width: rect.width })
    }, [tab])

    if (!result) {
        return (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-ink-600">
                <div className="relative">
                    <div className="w-20 h-20 rounded-3xl bg-ink-800/50 flex items-center justify-center">
                        <svg className="w-10 h-10 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-acid/20 border border-acid/30 animate-ping" />
                </div>
                <div className="text-center">
                    <p className="text-sm font-mono text-ink-500">results appear here</p>
                    <p className="text-xs text-ink-700 font-mono mt-1">write a query and click analyze</p>
                </div>
            </div>
        )
    }

    const badgeCount = {
        plan: result.planNodes?.length || 0,
        indexes: result.indexSuggestions?.length || 0,
        rewrite: result.classicalOptimizations?.filter(o => o.applied || o.analysisOnly).length || 0,
    }

    return (
        <div className="h-full min-h-0 flex flex-col">

            {/* Metrics bar */}
            <div className="flex items-center gap-4 px-4 py-3 border-b border-ink-800/60">
                {costScore !== null && costScore !== undefined && (
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-ink-500 font-mono">cost score</span>
                        <div className="flex items-center gap-1.5">
                            <div className="h-1.5 w-20 rounded-full bg-ink-800 overflow-hidden">
                                <div className="h-1.5 rounded-full transition-all duration-1000"
                                    style={{
                                        width: `${costScore}%`,
                                        background: costScore > 70 ? '#C8F135' : costScore > 40 ? '#FFB347' : '#FF5C35',
                                    }} />
                            </div>
                            <span className="text-xs font-mono font-500"
                                style={{ color: costScore > 70 ? '#C8F135' : costScore > 40 ? '#FFB347' : '#FF5C35' }}>
                                {costScore}/100
                            </span>
                        </div>
                    </div>
                )}

                {executionTimeMs !== null && executionTimeMs !== undefined && (
                    <>
                        <div className="w-px h-4 bg-ink-800" />
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-ink-500 font-mono">exec time</span>
                            <span className="text-xs font-mono font-500 text-frost">{executionTimeMs}ms</span>
                        </div>
                    </>
                )}

                {result.isSimulated && (
                    <>
                        <div className="w-px h-4 bg-ink-800" />
                        <div className="flex items-center gap-1.5 text-violet-400">
                            <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                            <span className="text-xs font-mono">simulated plan</span>
                        </div>
                    </>
                )}

                {result.indexSuggestions?.some(s => s.severity === 'HIGH') && (
                    <>
                        <div className="w-px h-4 bg-ink-800" />
                        <div className="flex items-center gap-1.5 text-ember">
                            <div className="w-1.5 h-1.5 rounded-full bg-ember animate-pulse" />
                            <span className="text-xs font-mono">missing indexes detected</span>
                        </div>
                    </>
                )}
            </div>

            {/* Tab bar */}
            <div className="relative flex items-center gap-1 px-4 pt-3 pb-0 border-b border-ink-800/60" ref={tabsRef}>
                {TABS.map(t => (
                    <button key={t.id} data-tab={t.id} type="button"
                        onClick={() => setTab(t.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 mb-0.5 rounded-t-lg text-xs font-mono transition-all duration-200 relative border border-b-0 ${tab === t.id
                            ? 'text-ink-50 bg-ink-800/80 border-ink-700/80'
                            : 'text-ink-400 hover:text-ink-100 border-transparent hover:bg-ink-900/60 hover:border-ink-800/60'
                            }`}>
                        <span className="text-sm">{t.icon}</span>
                        {t.label}
                        {badgeCount[t.id] > 0 && (
                            <span className={`px-1.5 py-0.5 rounded text-xs font-500 ${tab === t.id ? 'bg-acid/20 text-acid' : 'bg-ink-800 text-ink-500'
                                }`}>
                                {badgeCount[t.id]}
                            </span>
                        )}
                    </button>
                ))}

                {/* Animated underline indicator */}
                <div className="absolute bottom-0 h-0.5 bg-acid rounded-full tab-indicator transition-all duration-300"
                    style={{ left: indicator.left, width: indicator.width }} />
            </div>

            {/* Tab content — min-h-0 so nested flex children (tree, lists) receive a real height */}
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                {tab === 'plan' && (
                    <PlanTree
                        planNodes={result.planNodes}
                        rawPlanJson={null}
                        planError={result.planError}
                        isSimulated={result.isSimulated}
                    />
                )}

                {tab === 'indexes' && (
                    <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                        <IndexSuggestions suggestions={result.indexSuggestions || []} />
                    </div>
                )}

                {tab === 'rewrite' && (
                    <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                    <DiffViewer
                        original={result.rawQuery || ''}
                        classicalSQL={result.classicalOptimizedSQL}
                        aiSQL={aiResult?.optimizedSQL}
                        classicalOpts={result.classicalOptimizations || []}
                        classicalFallback={result.classicalFallback}
                        fallbackReason={result.classicalFallbackReason}
                        aiLoading={aiLoading}
                        onRequestAI={onRequestAI}
                        regression={aiResult?.regression}
                    />
                    </div>
                )}
            </div>
        </div>
    )
}