'use strict';

// ============================================================
// Classical Query Optimizer — Layer 2 (ES6)
// ============================================================

import pkg from 'node-sql-parser';
const { Parser } = pkg;
const parser = new Parser();


// ============================================================
// MAIN ENTRY
// ============================================================
export const classicalOptimize = (ast, sql) => {
    if (!ast || !sql) {
        return { optimizations: [], transformedAST: ast, optimizedSQL: sql };
    }

    const optimizations = [];
    let transformedAST = deepClone(ast);
    let workingSQL = sql.trim();

    const techniques = [
        predicatePushdown,
        joinReorder,
        projectionPushdown,
        subqueryUnnesting
    ];

    for (const fn of techniques) {
        const res = fn(transformedAST, workingSQL);
        if (res.applied) {
            optimizations.push(res);
            transformedAST = res.ast || transformedAST;
        }
    }

    const optimizedSQL = optimizations.length
        ? generateOptimizedSQL(sql, optimizations)
        : sql;

    return { optimizations, transformedAST, optimizedSQL };
};


// ============================================================
// Predicate Pushdown
// ============================================================
const predicatePushdown = (ast, sql) => {
    const result = baseResult('predicate_pushdown', 'Predicate pushdown', ast);

    const nodes = Array.isArray(ast) ? ast : [ast];

    for (const node of nodes) {
        if (!node?.where || !node?.join?.length) continue;

        const whereConditions = flattenWhere(node.where);
        const pushable = [];

        for (const cond of whereConditions) {
            const col = cond.left?.column;
            const table = cond.left?.table;
            if (!col || !table) continue;

            const refs = getReferencedTables(cond);
            if (refs.size === 1) pushable.push({ condition: cond, table, col });
        }

        if (pushable.length) {
            Object.assign(result, {
                applied: true,
                ast,
                before: `WHERE evaluated after JOIN`,
                after: `Filter on [${pushable.map(p => `${p.table}.${p.col}`).join(', ')}] before JOIN`,
                explanation: `Moves ${pushable.length} predicates before JOIN`,
                saving: `~${Math.min(90, pushable.length * 35)}% fewer rows`,
                rewriteHint: 'predicate_pushdown'
            });
        }
    }

    return result;
};


// ============================================================
// Join Reordering
// ============================================================
const joinReorder = (ast) => {
    const result = baseResult('join_reorder', 'Join reordering', ast);

    const nodes = Array.isArray(ast) ? ast : [ast];

    for (const node of nodes) {
        if (!node?.join || node.join.length < 2) continue;

        const scored = node.join.map(j => ({
            join: j,
            table: j.table?.table || j.table || 'unknown',
            selectivity: estimateSelectivity(j, node.where)
        }));

        const sorted = [...scored].sort((a, b) => a.selectivity - b.selectivity);

        const originalOrder = scored.map(s => s.table);
        const newOrder = sorted.map(s => s.table);

        if (JSON.stringify(originalOrder) === JSON.stringify(newOrder)) continue;

        Object.assign(result, {
            applied: true,
            ast: { ...node, join: sorted.map(s => s.join) },
            before: originalOrder.join(' → '),
            after: newOrder.join(' → '),
            selectivityMap: Object.fromEntries(
                scored.map(s => [s.table, +s.selectivity.toFixed(2)])
            ),
            explanation: `Reordered joins by selectivity`,
            saving: 'Smaller intermediate results',
            rewriteHint: 'join_reorder',
            newOrder,
            originalOrder
        });
    }

    return result;
};

const estimateSelectivity = (joinNode, where) => {
    if (!where) return 0.5;

    const tableName = joinNode.table?.table || joinNode.table || '';
    const conditions = flattenWhere(where);
    let sel = 0.5;

    for (const cond of conditions) {
        if (cond.left?.table !== tableName) continue;

        switch ((cond.operator || '').toUpperCase()) {
            case '=': return 0.10;
            case 'IN': return 0.15;
            case 'LIKE': return 0.25;
            case '>':
            case '<':
            case '>=':
            case '<=': return 0.33;
            case '!=':
            case '<>': return 0.90;
            default: break;
        }
    }
    return sel;
};


// ============================================================
// Projection Pushdown
// ============================================================
const projectionPushdown = (ast, sql) => {
    const result = baseResult('projection_pushdown', 'Projection pushdown', ast);

    const nodes = Array.isArray(ast) ? ast : [ast];

    for (const node of nodes) {
        if (node.columns === '*' && node.join?.length) {
            const needed = inferNeededColumns(sql);

            Object.assign(result, {
                applied: true,
                before: 'SELECT *',
                after: `SELECT ${needed.join(', ')}`,
                neededColumns: needed,
                explanation: 'Removes unnecessary columns',
                saving: 'Less I/O',
                rewriteHint: 'projection_pushdown'
            });
            break;
        }
    }

    return result;
};


// ============================================================
// Subquery Unnesting
// ============================================================
const subqueryUnnesting = (ast, sql) => {
    const result = baseResult('subquery_unnesting', 'Subquery unnesting', ast);

    if (/\bIN\s*\(\s*SELECT\b/i.test(sql)) {
        Object.assign(result, {
            applied: true,
            rewriteHint: 'in_subquery',
            explanation: 'IN → JOIN'
        });
    }

    return result;
};


// ============================================================
// SQL Generator
// ============================================================
const generateOptimizedSQL = (sql, optimizations) => {
    let result = sql;

    for (const opt of optimizations) {
        if (!opt.applied) continue;

        switch (opt.rewriteHint) {
            case 'projection_pushdown':
                result = result.replace(/SELECT\s+\*/i, `SELECT ${opt.neededColumns.join(', ')}`);
                break;

            case 'in_subquery':
                result = result.replace(/\bIN\s*\(\s*SELECT\b/i, '= ANY (SELECT');
                break;

            default:
                break;
        }
    }

    return result;
};


// ============================================================
// UTILITIES
// ============================================================
const flattenWhere = (where, conditions = []) => {
    if (!where) return conditions;

    const op = where.operator?.toUpperCase();

    if (op !== 'AND' && op !== 'OR' && where.operator) {
        conditions.push(where);
    }

    if (where.left) flattenWhere(where.left, conditions);
    if (where.right) flattenWhere(where.right, conditions);

    return conditions;
};

const getReferencedTables = (cond) => {
    const tables = new Set();
    if (cond?.left?.table) tables.add(cond.left.table);
    if (cond?.right?.table) tables.add(cond.right.table);
    return tables;
};

const inferNeededColumns = (sql) => {
    const cols = new Set();

    for (const m of sql.matchAll(/\b(\w+)\.(\w+)\b/g)) {
        cols.add(m[2]);
    }

    return [...cols];
};

const baseResult = (technique, title, ast) => ({
    technique,
    title,
    applied: false,
    ast,
    before: null,
    after: null,
    explanation: null,
    saving: null,
    rewriteHint: null
});

const deepClone = (obj) => {
    try {
        return JSON.parse(JSON.stringify(obj));
    } catch {
        return obj;
    }
};