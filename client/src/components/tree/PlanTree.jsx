import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'

// Heat score → color gradient
function heatColor(score) {
    if (score === undefined || score === null) return '#2D3748'
    if (score >= 0.8) return '#FF5C35'
    if (score >= 0.6) return '#FF8C42'
    if (score >= 0.4) return '#FFB347'
    if (score >= 0.2) return '#C8F135'
    return '#38BDF8'
}

function heatLabel(score) {
    if (score >= 0.8) return 'critical'
    if (score >= 0.6) return 'high'
    if (score >= 0.4) return 'medium'
    if (score >= 0.2) return 'low'
    return 'minimal'
}

// Flatten plan JSON into tree format D3 can use
function buildHierarchy(node, parentId = null) {
    if (!node) return null
    return {
        name: node.nodeType || node['Node Type'] || 'Unknown',
        relation: node.relationName || node['Relation Name'] || null,
        totalCost: node.totalCost ?? node['Total Cost'] ?? 0,
        actualRows: node.actualRows ?? node['Actual Rows'] ?? 0,
        planRows: node.planRows ?? node['Plan Rows'] ?? 0,
        heatScore: node.heatScore ?? node['heat_score'] ?? 0,
        actualLoops: node.actualLoops ?? 1,
        children: (node.children || node['Plans'] || []).map(c => buildHierarchy(c)).filter(Boolean),
    }
}

export default function PlanTree({ planNodes, rawPlanJson }) {
    const svgRef = useRef(null)
    const wrapRef = useRef(null)
    const [selected, setSelected] = useState(null)
    const [dims, setDims] = useState({ w: 800, h: 500 })

    // Convert flat nodes array to nested tree
    const treeData = (() => {
        if (rawPlanJson?.Plan) return buildHierarchy(rawPlanJson.Plan)
        if (!planNodes?.length) return null
        const map = {}
        planNodes.forEach(n => { map[n.id] = { ...n, children: [] } })
        let root = null
        planNodes.forEach(n => {
            if (!n.parentNodeId && !n.parent_node_id) root = map[n.id]
            else {
                const pid = n.parentNodeId || n.parent_node_id
                if (map[pid]) map[pid].children.push(map[n.id])
            }
        })
        return root ? buildHierarchy(root) : null
    })()

    useEffect(() => {
        if (!wrapRef.current) return
        const ro = new ResizeObserver(entries => {
            const { width, height } = entries[0].contentRect
            setDims({ w: Math.max(width, 400), h: Math.max(height, 300) })
        })
        ro.observe(wrapRef.current)
        return () => ro.disconnect()
    }, [])

    useEffect(() => {
        if (!svgRef.current || !treeData) return

        const { w, h } = dims
        const margin = { top: 40, right: 60, bottom: 40, left: 60 }
        const iw = w - margin.left - margin.right
        const ih = h - margin.top - margin.bottom

        d3.select(svgRef.current).selectAll('*').remove()

        const svg = d3.select(svgRef.current)
            .attr('width', w).attr('height', h)

        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`)

        // Zoom behavior
        const zoom = d3.zoom()
            .scaleExtent([0.3, 3])
            .on('zoom', e => g.attr('transform', e.transform))
        svg.call(zoom)

        const root = d3.hierarchy(treeData)
        const layout = d3.tree().size([iw, ih])
        layout(root)

        // Links (curved paths)
        const linkGen = d3.linkVertical()
            .x(d => d.x).y(d => d.y)

        g.selectAll('.tree-link')
            .data(root.links())
            .enter().append('path')
            .attr('class', 'tree-link')
            .attr('d', linkGen)
            .attr('stroke', d => `rgba(${d.target.data.heatScore >= 0.6 ? '255,92,53' : '200,241,53'},0.2)`)
            .attr('stroke-dasharray', function () { return this.getTotalLength() })
            .attr('stroke-dashoffset', function () { return this.getTotalLength() })
            .transition().duration(600).delay((_, i) => i * 40)
            .attr('stroke-dashoffset', 0)

        // Node groups
        const node = g.selectAll('.tree-node-group')
            .data(root.descendants())
            .enter().append('g')
            .attr('class', 'tree-node-group')
            .attr('transform', d => `translate(${d.x},${d.y})`)
            .style('opacity', 0)
            .on('click', (_, d) => setSelected(d.data))

        node.transition().duration(400).delay((_, i) => i * 60)
            .style('opacity', 1)

        // Node background rect
        const nodeW = 130, nodeH = 52

        node.append('rect')
            .attr('class', 'tree-node-rect')
            .attr('x', -nodeW / 2).attr('y', -nodeH / 2)
            .attr('width', nodeW).attr('height', nodeH)
            .attr('rx', 8)
            .attr('fill', d => {
                const h = d.data.heatScore
                const col = heatColor(h)
                return col + '18'
            })
            .attr('stroke', d => heatColor(d.data.heatScore))
            .attr('stroke-width', d => d.data.heatScore >= 0.8 ? 1.5 : 0.8)

        // Heat bar at bottom of node
        node.append('rect')
            .attr('x', -nodeW / 2 + 6)
            .attr('y', nodeH / 2 - 6)
            .attr('height', 2)
            .attr('width', 0)
            .attr('rx', 1)
            .attr('fill', d => heatColor(d.data.heatScore))
            .transition().duration(800).delay((_, i) => i * 60 + 300)
            .attr('width', d => (nodeW - 12) * (d.data.heatScore || 0))

        // Node type label
        node.append('text')
            .attr('dy', '-8')
            .attr('text-anchor', 'middle')
            .attr('fill', d => heatColor(d.data.heatScore))
            .attr('font-family', '"JetBrains Mono", monospace')
            .attr('font-size', '10px')
            .attr('font-weight', '500')
            .text(d => d.data.name)

        // Relation name (if present)
        node.filter(d => d.data.relation)
            .append('text')
            .attr('dy', '6')
            .attr('text-anchor', 'middle')
            .attr('fill', '#9AA3AE')
            .attr('font-family', '"DM Sans", sans-serif')
            .attr('font-size', '9px')
            .text(d => d.data.relation?.slice(0, 14))

        // Cost label
        node.append('text')
            .attr('dy', '20')
            .attr('text-anchor', 'middle')
            .attr('fill', '#6B7785')
            .attr('font-family', '"JetBrains Mono", monospace')
            .attr('font-size', '8px')
            .text(d => `cost: ${(d.data.totalCost || 0).toFixed(1)}`)

    }, [treeData, dims])

    if (!treeData) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-ink-500 gap-3">
                <div className="w-16 h-16 rounded-2xl bg-ink-800/50 flex items-center justify-center">
                    <svg className="w-8 h-8 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
                    </svg>
                </div>
                <p className="text-sm font-mono">run a query to see the execution plan</p>
            </div>
        )
    }

    return (
        <div className="relative h-full flex" ref={wrapRef}>
            {/* SVG tree */}
            <div className="flex-1 overflow-hidden">
                <svg ref={svgRef} className="w-full h-full" />
            </div>

            {/* Selected node detail panel */}
            {selected && (
                <div className="w-56 border-l border-ink-800 p-4 flex flex-col gap-3 animate-slide-right flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-ink-400">node detail</span>
                        <button onClick={() => setSelected(null)} className="text-ink-500 hover:text-ink-200 text-lg leading-none">×</button>
                    </div>

                    <div>
                        <div className="text-acid font-mono font-500 text-sm">{selected.name}</div>
                        {selected.relation && <div className="text-ink-400 text-xs font-mono mt-0.5">on {selected.relation}</div>}
                    </div>

                    {/* Heat indicator */}
                    <div className="rounded-lg p-3" style={{ background: heatColor(selected.heatScore) + '15', border: `1px solid ${heatColor(selected.heatScore)}30` }}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-ink-400 font-mono">heat score</span>
                            <span className="text-xs font-mono font-500" style={{ color: heatColor(selected.heatScore) }}>
                                {heatLabel(selected.heatScore)}
                            </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-ink-800">
                            <div className="h-1.5 rounded-full transition-all duration-700"
                                style={{ width: `${(selected.heatScore || 0) * 100}%`, background: heatColor(selected.heatScore) }} />
                        </div>
                    </div>

                    {/* Stats */}
                    {[
                        { label: 'total cost', value: (selected.totalCost || 0).toFixed(2) },
                        { label: 'actual rows', value: (selected.actualRows || 0).toLocaleString() },
                        { label: 'plan rows', value: (selected.planRows || 0).toLocaleString() },
                        { label: 'loops', value: selected.actualLoops || 1 },
                    ].map(({ label, value }) => (
                        <div key={label} className="flex items-center justify-between py-1.5 border-b border-ink-800/60 last:border-0">
                            <span className="text-xs text-ink-500 font-mono">{label}</span>
                            <span className="text-xs text-ink-200 font-mono">{value}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Legend */}
            <div className="absolute bottom-3 left-3 flex items-center gap-3 p-2 rounded-lg bg-ink-900/80 backdrop-blur-sm border border-ink-800/60">
                {[
                    { label: 'minimal', color: '#38BDF8' },
                    { label: 'low', color: '#C8F135' },
                    { label: 'medium', color: '#FFB347' },
                    { label: 'high', color: '#FF8C42' },
                    { label: 'critical', color: '#FF5C35' },
                ].map(({ label, color }) => (
                    <div key={label} className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                        <span className="text-xs text-ink-500 font-mono hidden sm:block">{label}</span>
                    </div>
                ))}
            </div>

            {/* Zoom hint */}
            <div className="absolute top-3 right-3 text-xs text-ink-600 font-mono bg-ink-900/60 px-2 py-1 rounded-md border border-ink-800/40">
                scroll to zoom · drag to pan
            </div>
        </div>
    )
}