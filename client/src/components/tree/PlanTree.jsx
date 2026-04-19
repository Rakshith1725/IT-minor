import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'

const COLORS = {
    minimal: '#C8F135',   // Acid Green
    low: '#99F666',
    medium: '#FFB347',    // Orange
    high: '#FF5C35',      // Ember
    critical: '#EF4444'   // Deep Red
}

const getHeatColor = (score) => {
    if (score > 80) return COLORS.critical
    if (score > 60) return COLORS.high
    if (score > 40) return COLORS.medium
    if (score > 20) return COLORS.low
    return COLORS.minimal
}

const getHeatGlow = (score) => {
    const color = getHeatColor(score)
    if (score > 60) return `0 0 20px ${color}60, 0 0 40px ${color}30`
    if (score > 40) return `0 0 12px ${color}40`
    return 'none'
}

/** API sends heat_score 0–1; normalize to 0–100 for thresholds in getHeatColor */
function normalizeHeatScore(raw) {
    const n = typeof raw === 'string' ? parseFloat(raw) : Number(raw)
    if (!Number.isFinite(n) || n < 0) return 0
    if (n <= 1) return n * 100
    return Math.min(100, n)
}

export default function PlanTree({ planNodes, rawPlanJson, planError, isSimulated }) {
    const svgRef = useRef(null)
    const containerRef = useRef(null)
    const tooltipRef = useRef(null)
    const [selectedNode, setSelectedNode] = useState(null)

    useEffect(() => {
        if (!svgRef.current || !containerRef.current) return

        const container = containerRef.current

        const draw = () => {
            if (!svgRef.current || !containerRef.current) return

            let data = null
            if (rawPlanJson?.Plan) {
                data = buildFromRaw(rawPlanJson.Plan)
            } else if (planNodes && planNodes.length > 0) {
                data = buildFromNodes(planNodes)
            }

            if (!data) {
                d3.select(svgRef.current).selectAll('*').remove()
                return
            }

            const width = Math.max(container.clientWidth, 500)
            const height = Math.max(container.clientHeight, 400)

            const svg = d3.select(svgRef.current)
                .attr('width', '100%')
                .attr('height', '100%')
                .attr('viewBox', [0, 0, width, height])

            svg.selectAll('*').remove()

            // Defs for gradients and filters
            const defs = svg.append('defs')

            // Glow filter
            const glowFilter = defs.append('filter')
                .attr('id', 'glow')
                .attr('x', '-50%').attr('y', '-50%')
                .attr('width', '200%').attr('height', '200%')
            glowFilter.append('feGaussianBlur')
                .attr('stdDeviation', '4')
                .attr('result', 'coloredBlur')
            const feMerge = glowFilter.append('feMerge')
            feMerge.append('feMergeNode').attr('in', 'coloredBlur')
            feMerge.append('feMergeNode').attr('in', 'SourceGraphic')

            // Drop shadow filter
            const shadowFilter = defs.append('filter')
                .attr('id', 'dropShadow')
                .attr('x', '-20%').attr('y', '-20%')
                .attr('width', '140%').attr('height', '140%')
            shadowFilter.append('feDropShadow')
                .attr('dx', '0').attr('dy', '2')
                .attr('stdDeviation', '4')
                .attr('flood-color', 'rgba(0,0,0,0.5)')

            const g = svg.append('g')

            // Zoom
            const zoom = d3.zoom()
                .scaleExtent([0.2, 3])
                .on('zoom', (event) => {
                    g.attr('transform', event.transform)
                })
            svg.call(zoom)

            const nodeW = 200
            const nodeH = 70

            const tree = d3.tree().nodeSize([nodeH + 30, nodeW + 80])
            const root = d3.hierarchy(data)
            tree(root)

            // Center the tree
            const allNodes = root.descendants()
            const xExtent = d3.extent(allNodes, d => d.x)
            const yExtent = d3.extent(allNodes, d => d.y)
            const treeW = (yExtent[1] - yExtent[0]) + nodeW + 320
            const treeH = (xExtent[1] - xExtent[0]) + nodeH + 120

            const scale = Math.min(width / treeW, height / treeH, 1) * 0.85
            const tx = (width - treeW * scale) / 2 - yExtent[0] * scale + 160
            const ty = (height - treeH * scale) / 2 - xExtent[0] * scale + 60

            const initialTransform = d3.zoomIdentity.translate(tx, ty).scale(scale)
            svg.call(zoom.transform, initialTransform)

            // ── Draw gradient links ──
            const linkGroup = g.append('g').attr('class', 'links')

            linkGroup.selectAll('.link')
                .data(root.links())
                .enter()
                .append('path')
                .attr('class', 'tree-link')
                .attr('d', d3.linkHorizontal()
                    .x(d => d.y)
                    .y(d => d.x))
                .style('stroke', d => getHeatColor(d.target.data.heatScore))
                .style('stroke-width', d => {
                    const hs = d.target.data.heatScore
                    return hs > 60 ? 3.5 : hs > 30 ? 2.5 : 1.5
                })
                .style('stroke-opacity', 0.6)
                .style('fill', 'none')
                .style('filter', d => d.target.data.heatScore > 60 ? 'url(#glow)' : 'none')
                .attr('stroke-dasharray', function() { return this.getTotalLength() })
                .attr('stroke-dashoffset', function() { return this.getTotalLength() })
                .transition()
                .duration(800)
                .delay((d, i) => i * 80)
                .attr('stroke-dashoffset', 0)

            // ── Draw nodes ──
            const nodeGroup = g.append('g').attr('class', 'nodes')

            const node = nodeGroup.selectAll('.node')
                .data(root.descendants())
                .enter()
                .append('g')
                .attr('class', 'tree-node-group')
                .attr('transform', d => `translate(${d.y},${d.x})`)
                .style('cursor', 'pointer')
                .style('opacity', 0)

            // Animate nodes in
            node.transition()
                .duration(500)
                .delay((d, i) => i * 100)
                .style('opacity', 1)

            // Node shadow
            node.append('rect')
                .attr('width', nodeW)
                .attr('height', nodeH)
                .attr('x', -nodeW / 2)
                .attr('y', -nodeH / 2)
                .attr('rx', 14)
                .attr('fill', 'rgba(0,0,0,0.3)')
                .attr('filter', 'url(#dropShadow)')

            // Node background
            node.append('rect')
                .attr('width', nodeW)
                .attr('height', nodeH)
                .attr('x', -nodeW / 2)
                .attr('y', -nodeH / 2)
                .attr('rx', 14)
                .attr('fill', '#111418')
                .attr('stroke', d => getHeatColor(d.data.heatScore || 0))
                .attr('stroke-width', d => d.data.heatScore > 60 ? 2.5 : 1.5)
                .attr('filter', d => d.data.heatScore > 60 ? 'url(#glow)' : 'none')

            // Heat fill overlay
            node.append('rect')
                .attr('width', nodeW)
                .attr('height', nodeH)
                .attr('x', -nodeW / 2)
                .attr('y', -nodeH / 2)
                .attr('rx', 14)
                .attr('fill', d => getHeatColor(d.data.heatScore || 0))
                .attr('fill-opacity', d => {
                    const hs = d.data.heatScore || 0
                    if (hs > 80) return 0.2
                    if (hs > 60) return 0.15
                    if (hs > 40) return 0.1
                    return 0.05
                })

            // Heat bar at bottom of node
            node.append('rect')
                .attr('width', 0)
                .attr('height', 3)
                .attr('x', -nodeW / 2 + 6)
                .attr('y', nodeH / 2 - 8)
                .attr('rx', 1.5)
                .attr('fill', d => getHeatColor(d.data.heatScore || 0))
                .attr('opacity', 0.8)
                .transition()
                .duration(1000)
                .delay((d, i) => i * 120 + 400)
                .attr('width', d => (nodeW - 12) * Math.max(0.05, (d.data.heatScore || 0) / 100))

            // Heat bar track
            node.append('rect')
                .attr('width', nodeW - 12)
                .attr('height', 3)
                .attr('x', -nodeW / 2 + 6)
                .attr('y', nodeH / 2 - 8)
                .attr('rx', 1.5)
                .attr('fill', 'rgba(255,255,255,0.05)')

            // Node type icon
            node.append('text')
                .attr('x', -nodeW / 2 + 14)
                .attr('y', -6)
                .attr('font-size', '13px')
                .text(d => getNodeIcon(d.data.name))

            // Node Title
            node.append('text')
                .attr('x', -nodeW / 2 + 32)
                .attr('y', -6)
                .attr('class', 'node-label')
                .attr('fill', '#FFFFFF')
                .attr('font-size', '11px')
                .attr('font-weight', '700')
                .attr('font-family', "'JetBrains Mono', monospace")
                .text(d => truncate(d.data.name, 18))

            // Relation name (table)
            node.append('text')
                .attr('x', -nodeW / 2 + 14)
                .attr('y', 12)
                .attr('fill', 'rgba(255,255,255,0.4)')
                .attr('font-size', '9px')
                .attr('font-family', "'JetBrains Mono', monospace")
                .text(d => d.data.relationName ? `→ ${truncate(d.data.relationName, 20)}` : '')

            // Cost label
            node.append('text')
                .attr('x', -nodeW / 2 + 14)
                .attr('y', 26)
                .attr('class', 'node-cost')
                .attr('fill', d => getHeatColor(d.data.heatScore || 0))
                .attr('font-size', '9px')
                .attr('font-weight', 'bold')
                .attr('font-family', "'JetBrains Mono', monospace")
                .text(d => `COST: ${formatCost(d.data.totalCost)}`)

            // Rows label
            node.append('text')
                .attr('x', nodeW / 2 - 14)
                .attr('y', 26)
                .attr('text-anchor', 'end')
                .attr('fill', 'rgba(255,255,255,0.35)')
                .attr('font-size', '8px')
                .attr('font-family', "'JetBrains Mono', monospace")
                .text(d => d.data.planRows != null ? `rows: ${formatNumber(d.data.planRows)}` : '')

            // Heat percentage badge
            node.each(function(d) {
                const hs = d.data.heatScore || 0
                if (hs <= 0) return

                const badge = d3.select(this).append('g')
                    .attr('transform', `translate(${nodeW / 2 - 14}, ${-nodeH / 2 + 6})`)

                badge.append('rect')
                    .attr('width', 36)
                    .attr('height', 18)
                    .attr('x', -18)
                    .attr('y', -9)
                    .attr('rx', 9)
                    .attr('fill', getHeatColor(hs))
                    .attr('fill-opacity', 0.2)
                    .attr('stroke', getHeatColor(hs))
                    .attr('stroke-width', 1)
                    .attr('stroke-opacity', 0.5)

                badge.append('text')
                    .attr('text-anchor', 'middle')
                    .attr('dy', '0.35em')
                    .attr('fill', getHeatColor(hs))
                    .attr('font-size', '9px')
                    .attr('font-weight', 'bold')
                    .attr('font-family', "'JetBrains Mono', monospace")
                    .text(`${hs.toFixed(0)}%`)
            })

            // ── Tooltip on hover ──
            node.on('mouseenter', function(event, d) {
                if (!tooltipRef.current) return

                const tooltip = tooltipRef.current
                const hs = d.data.heatScore || 0
                const heatLabel = hs > 80 ? 'CRITICAL' : hs > 60 ? 'HIGH' : hs > 40 ? 'MEDIUM' : hs > 20 ? 'LOW' : 'MINIMAL'

                tooltip.innerHTML = `
                    <div style="font-weight:800;font-size:13px;color:#fff;margin-bottom:6px;display:flex;align-items:center;gap:6px">
                        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${getHeatColor(hs)};box-shadow:0 0 8px ${getHeatColor(hs)}"></span>
                        ${d.data.name}
                    </div>
                    ${d.data.relationName ? `<div style="color:rgba(255,255,255,0.5);font-size:10px;margin-bottom:6px">Table: ${d.data.relationName}</div>` : ''}
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;font-size:10px">
                        <span style="color:rgba(255,255,255,0.4)">Total Cost</span>
                        <span style="color:${getHeatColor(hs)};font-weight:700">${formatCost(d.data.totalCost)}</span>
                        <span style="color:rgba(255,255,255,0.4)">Startup Cost</span>
                        <span style="color:rgba(255,255,255,0.6)">${formatCost(d.data.startupCost)}</span>
                        ${d.data.actualRows != null ? `
                            <span style="color:rgba(255,255,255,0.4)">Actual Rows</span>
                            <span style="color:rgba(255,255,255,0.7)">${formatNumber(d.data.actualRows)}</span>
                        ` : ''}
                        ${d.data.planRows != null ? `
                            <span style="color:rgba(255,255,255,0.4)">Plan Rows</span>
                            <span style="color:rgba(255,255,255,0.7)">${formatNumber(d.data.planRows)}</span>
                        ` : ''}
                        <span style="color:rgba(255,255,255,0.4)">Heat Score</span>
                        <span style="color:${getHeatColor(hs)};font-weight:700">${hs.toFixed(1)}% — ${heatLabel}</span>
                    </div>
                `
                tooltip.style.display = 'block'
                tooltip.style.opacity = '1'

                const rect = container.getBoundingClientRect()
                tooltip.style.left = `${event.clientX - rect.left + 16}px`
                tooltip.style.top = `${event.clientY - rect.top - 10}px`

                // Highlight the node
                d3.select(this).select('rect:nth-child(2)')
                    .transition().duration(200)
                    .attr('stroke-width', 3.5)

                setSelectedNode(d.data)
            })

            node.on('mousemove', function(event) {
                if (!tooltipRef.current) return
                const rect = container.getBoundingClientRect()
                tooltipRef.current.style.left = `${event.clientX - rect.left + 16}px`
                tooltipRef.current.style.top = `${event.clientY - rect.top - 10}px`
            })

            node.on('mouseleave', function() {
                if (tooltipRef.current) {
                    tooltipRef.current.style.opacity = '0'
                    setTimeout(() => {
                        if (tooltipRef.current) tooltipRef.current.style.display = 'none'
                    }, 200)
                }

                d3.select(this).select('rect:nth-child(2)')
                    .transition().duration(200)
                    .attr('stroke-width', d => d.data.heatScore > 60 ? 2.5 : 1.5)
            })
        }

        draw()

        const ro = new ResizeObserver(() => {
            window.requestAnimationFrame(draw)
        })
        ro.observe(container)
        return () => ro.disconnect()
    }, [planNodes, rawPlanJson])

    const hasTree = (planNodes?.length > 0) || !!rawPlanJson?.Plan

    return (
        <div ref={containerRef} className="flex-1 w-full min-h-0 h-full relative overflow-hidden bg-ink-900/50 border-t border-ink-800/40" style={{ minHeight: '300px' }}>

            {/* Simulated badge */}
            {hasTree && isSimulated && (
                <div className="absolute top-4 right-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/30 animate-fade-up">
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                    <span className="text-[10px] font-mono font-600 text-violet-300 uppercase tracking-widest">Simulated Plan</span>
                </div>
            )}

            {/* Empty state */}
            {!hasTree && (
                <div className="absolute inset-0 z-[1] flex flex-col items-center justify-center gap-6 px-6 pointer-events-none">
                    <div className="relative">
                        <div className="w-20 h-20 rounded-[2.5rem] bg-ink-800 border border-acid/25 flex items-center justify-center shadow-2xl">
                             <svg className="w-10 h-10 text-acid" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <div className="absolute inset-0 rounded-[2.5rem] border border-acid/20 animate-ping pointer-events-none" />
                    </div>
                    <div className="text-center max-w-md">
                        <p className="text-lg font-display font-800 text-ink-50 tracking-tight">Performance Visualizer</p>
                        {planError ? (
                            <p className="text-sm text-ember/90 font-mono mt-2 leading-relaxed bg-ember/5 border border-ember/20 rounded-xl px-4 py-3">
                                Plan unavailable: {planError}
                            </p>
                        ) : (
                            <p className="text-sm text-ink-400 font-body mt-1">Run analyze to render the execution plan tree with heat map visualization.</p>
                        )}
                    </div>
                </div>
            )}

            {/* Heat Map Legend */}
            {hasTree && (
                <div className="absolute bottom-4 left-4 flex flex-col gap-2 p-3 rounded-2xl bg-ink-900/95 backdrop-blur-xl border border-ink-800 shadow-2xl z-10 animate-fade-up">
                    <p className="text-[9px] font-900 text-ink-500 uppercase tracking-[0.2em]">Bottleneck Heat Map</p>
                    <div className="flex items-center gap-1">
                        {Object.entries(COLORS).map(([lvl, color]) => (
                            <div key={lvl} className="flex items-center gap-1.5 px-1.5">
                                <div className="w-2 h-2 rounded-full shadow-lg border border-white/10" style={{ background: color, boxShadow: `0 0 6px ${color}60` }} />
                                <span className="text-[8px] font-mono text-ink-400 uppercase tracking-tight">{lvl}</span>
                            </div>
                        ))}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden flex">
                            {Object.values(COLORS).map((color, i) => (
                                <div key={i} className="flex-1 h-full" style={{ background: color, opacity: 0.7 }} />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Zoom controls */}
            {hasTree && (
                <div className="absolute top-4 left-4 flex flex-col gap-1 z-10 animate-fade-up">
                    <button
                        onClick={() => {
                            const svg = d3.select(svgRef.current)
                            svg.transition().duration(300).call(
                                d3.zoom().scaleExtent([0.2, 3]).on('zoom', (e) => {
                                    svg.select('g').attr('transform', e.transform)
                                }).scaleBy, 1.3
                            )
                        }}
                        className="w-8 h-8 rounded-lg bg-ink-800/90 border border-ink-700 text-ink-300 hover:text-acid hover:border-acid/50 flex items-center justify-center text-sm font-mono transition-all"
                    >+</button>
                    <button
                        onClick={() => {
                            const svg = d3.select(svgRef.current)
                            svg.transition().duration(300).call(
                                d3.zoom().scaleExtent([0.2, 3]).on('zoom', (e) => {
                                    svg.select('g').attr('transform', e.transform)
                                }).scaleBy, 0.7
                            )
                        }}
                        className="w-8 h-8 rounded-lg bg-ink-800/90 border border-ink-700 text-ink-300 hover:text-acid hover:border-acid/50 flex items-center justify-center text-sm font-mono transition-all"
                    >−</button>
                </div>
            )}

            {/* Tooltip */}
            <div
                ref={tooltipRef}
                className="absolute z-50 pointer-events-none transition-opacity duration-200"
                style={{
                    display: 'none',
                    opacity: 0,
                    background: 'rgba(13, 15, 18, 0.95)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    maxWidth: '280px',
                    fontFamily: "'JetBrains Mono', monospace",
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                }}
            />

            <svg ref={svgRef} className={`w-full h-full cursor-move ${!hasTree ? 'opacity-20' : ''}`} style={{ minHeight: '300px' }} />
        </div>
    )
}

// ── HELPERS ──

function truncate(str, n) {
    if (!str) return 'Unknown'
    return str.length > n ? str.substr(0, n - 1) + '…' : str
}

function formatCost(val) {
    if (val == null) return '0'
    const n = parseFloat(val)
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
    return n.toFixed(1)
}

function formatNumber(val) {
    if (val == null) return '—'
    const n = parseInt(val)
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
    return n.toString()
}

function getNodeIcon(name) {
    if (!name) return '○'
    const lower = name.toLowerCase()
    if (lower.includes('seq scan')) return '⊟'
    if (lower.includes('index scan') || lower.includes('idx')) return '⊞'
    if (lower.includes('bitmap')) return '▦'
    if (lower.includes('hash join') || lower.includes('hash')) return '⧫'
    if (lower.includes('merge join') || lower.includes('merge')) return '⇌'
    if (lower.includes('nested loop')) return '↻'
    if (lower.includes('sort')) return '⇅'
    if (lower.includes('aggregate') || lower.includes('group')) return 'Σ'
    if (lower.includes('limit')) return '⊤'
    if (lower.includes('unique')) return '◈'
    if (lower.includes('append')) return '⊕'
    if (lower.includes('result')) return '◉'
    if (lower.includes('subquery')) return '◇'
    if (lower.includes('insert')) return '⊳'
    if (lower.includes('update')) return '⊲'
    if (lower.includes('delete')) return '⊘'
    return '○'
}

function buildFromNodes(nodes) {
    if (!nodes || nodes.length === 0) return null
    const map = {}
    nodes.forEach(n => {
        const heatScore = normalizeHeatScore(n.heat_score ?? n.heatScore)
        const totalCost = parseFloat(n.total_cost ?? n.totalCost ?? 0)
        const startupCost = parseFloat(n.startup_cost ?? n.startupCost ?? 0)
        map[n.id] = {
            ...n,
            name: n.node_type || n.nodeType || 'Unknown',
            heatScore,
            totalCost,
            startupCost,
            relationName: n.relation_name || n.relationName || null,
            actualRows: n.actual_rows ?? n.actualRows ?? null,
            planRows: n.plan_rows ?? n.planRows ?? null,
            children: [],
        }
    })
    
    let root = null
    nodes.forEach(n => {
        const pid = n.parent_node_id || n.parentNodeId
        if (!pid) root = map[n.id]
        else if (map[pid]) map[pid].children.push(map[n.id])
    })
    if (!root && nodes[0]) root = map[nodes[0].id]
    return root
}

function buildFromRaw(node) {
    if (!node) return null
    const name = node['Node Type'] || 'Unknown'
    const children = []
    if (node.Plans) node.Plans.forEach(p => children.push(buildFromRaw(p)))

    return {
        name,
        totalCost: node['Total Cost'],
        startupCost: node['Startup Cost'] || 0,
        actualRows: node['Actual Rows'],
        planRows: node['Plan Rows'],
        relationName: node['Relation Name'] || null,
        heatScore: normalizeHeatScore(node.score ?? 0),
        children
    }
}