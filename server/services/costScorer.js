import crypto from 'crypto';

/**
 * scoreAndAnnotate — takes EXPLAIN JSON output, flattens into flat node array
 * with heat_score (0–1) assigned proportionally to max cost.
 */
function scoreAndAnnotate(planJson) {
  const root = planJson?.['Plan'] || planJson?.[0]?.['Plan'] || planJson;
  if (!root) 
    return { costScore: 0, nodes: [] };

  const nodes = [];
  flattenNodes(root, null, nodes);

  const maxCost = nodes.length ? Math.max(...nodes.map(n => n.total_cost)) : 1;

  nodes.forEach(n => {
    n.heat_score = parseFloat((n.total_cost / maxCost).toFixed(3));
  });

  const totalCost = root['Total Cost'] || 0;
  const costScore = Math.max(
    1,
    Math.min(100, Math.round(100 - Math.log10(totalCost + 1) * 15))
  );

  return { costScore, nodes };
}

function flattenNodes(node, parentId, result) {
  const id = crypto.randomUUID();

  result.push({
    id,
    parent_node_id: parentId,
    node_type: node['Node Type'] || 'Unknown',
    relation_name: node['Relation Name'] || null,
    total_cost: node['Total Cost'] || 0,
    startup_cost: node['Startup Cost'] || 0,
    actual_rows: node['Actual Rows'] ?? null,
    plan_rows: node['Plan Rows'] || 0,
    actual_loops: node['Actual Loops'] ?? 1,
    heat_score: 0, 
    node_details: node,
  });

  const children = node['Plans'] || [];
  children.forEach(child => flattenNodes(child, id, result));
}


// ── buildSimulatedPlan ──────────────────────────────────────────
// When EXPLAIN fails (tables don't exist in DB), we build a
// *simulated* execution plan tree from the parsed AST so the
// visualizer/ heat map still renders something meaningful.
// ─────────────────────────────────────────────────────────────────

function buildSimulatedPlan(ast, sql) {
  const nodes = [];
  const stmts = Array.isArray(ast) ? ast : [ast];

  for (const stmt of stmts) {
    if (!stmt) continue;
    buildASTNodes(stmt, null, nodes, sql);
  }

  if (nodes.length === 0) {
    return { costScore: 50, nodes: [] };
  }

  // Assign heat scores based on simulated cost
  const maxCost = Math.max(...nodes.map(n => n.total_cost), 1);
  nodes.forEach(n => {
    n.heat_score = parseFloat((n.total_cost / maxCost).toFixed(3));
  });

  // Estimate a cost score
  const totalCost = nodes[0]?.total_cost || 0;
  const costScore = Math.max(
    1,
    Math.min(100, Math.round(100 - Math.log10(totalCost + 1) * 15))
  );

  return { costScore, nodes };
}

function buildASTNodes(ast, parentId, nodes, sql) {
  if (!ast) return;

  // Determine the root operation type
  const rootType = getOperationType(ast);
  const rootId = crypto.randomUUID();
  const rootCost = estimateASTCost(ast);

  nodes.push({
    id: rootId,
    parent_node_id: parentId,
    node_type: rootType,
    relation_name: null,
    total_cost: rootCost,
    startup_cost: rootCost * 0.1,
    actual_rows: null,
    plan_rows: estimateRows(ast),
    actual_loops: 1,
    heat_score: 0,
    node_details: { simulated: true, type: rootType },
  });

  // Process CTEs (WITH clauses)
  if (ast.with && ast.with.length > 0) {
    for (const cte of ast.with) {
      const cteName = cte.name?.name || cte.name || 'cte';
      const cteId = crypto.randomUUID();
      const cteCost = rootCost * 0.4;
      
      nodes.push({
        id: cteId,
        parent_node_id: rootId,
        node_type: 'CTE Scan',
        relation_name: cteName,
        total_cost: cteCost,
        startup_cost: cteCost * 0.1,
        actual_rows: null,
        plan_rows: 100,
        actual_loops: 1,
        heat_score: 0,
        node_details: { simulated: true, cte: true, name: cteName },
      });

      if (cte.stmt?.ast) {
        buildASTNodes(cte.stmt.ast, cteId, nodes, sql);
      }
    }
  }

  // Process JOINs
  if (ast.join && ast.join.length > 0) {
    for (const j of ast.join) {
      const joinType = (j.join || 'INNER JOIN').toUpperCase();
      const tableName = j.table?.table || j.table || 'unknown';
      const joinId = crypto.randomUUID();
      const joinCost = rootCost * 0.6;

      // Map join type to node type
      let nodeType = 'Hash Join';
      if (joinType.includes('NESTED') || joinType.includes('LOOP')) nodeType = 'Nested Loop';
      else if (joinType.includes('MERGE')) nodeType = 'Merge Join';
      else if (joinType.includes('LEFT')) nodeType = 'Hash Left Join';
      else if (joinType.includes('RIGHT')) nodeType = 'Hash Right Join';

      nodes.push({
        id: joinId,
        parent_node_id: rootId,
        node_type: nodeType,
        relation_name: null,
        total_cost: joinCost,
        startup_cost: joinCost * 0.15,
        actual_rows: null,
        plan_rows: estimateRows(ast) * 2,
        actual_loops: 1,
        heat_score: 0,
        node_details: { simulated: true, type: nodeType, joinType },
      });

      // Add the scanned table for this join
      const scanId = crypto.randomUUID();
      const scanCost = joinCost * 0.4;
      const hasWhereOnTable = checkWhereForTable(ast.where, tableName, j.table?.as);

      nodes.push({
        id: scanId,
        parent_node_id: joinId,
        node_type: hasWhereOnTable ? 'Index Scan' : 'Seq Scan',
        relation_name: tableName,
        total_cost: scanCost,
        startup_cost: scanCost * 0.05,
        actual_rows: null,
        plan_rows: 1000,
        actual_loops: 1,
        heat_score: 0,
        node_details: { simulated: true, table: tableName },
      });
    }
  }

  // Process FROM tables
  if (ast.from && ast.from.length > 0) {
    for (const f of ast.from) {
      const tableName = f.table || f.name || 'unknown';
      if (!tableName || tableName === 'unknown') continue;

      const scanId = crypto.randomUUID();
      const hasWhere = !!ast.where;
      const isSubquery = !!f.expr;

      if (isSubquery) {
        // Subquery in FROM
        const subId = crypto.randomUUID();
        nodes.push({
          id: subId,
          parent_node_id: rootId,
          node_type: 'Subquery Scan',
          relation_name: f.as || 'subquery',
          total_cost: rootCost * 0.5,
          startup_cost: rootCost * 0.05,
          actual_rows: null,
          plan_rows: 100,
          actual_loops: 1,
          heat_score: 0,
          node_details: { simulated: true, subquery: true },
        });
      } else {
        // Regular table scan
        const scanCost = rootCost * (hasWhere ? 0.3 : 0.7);
        const scanType = hasWhere ? 'Index Scan' : 'Seq Scan';

        nodes.push({
          id: scanId,
          parent_node_id: (ast.join && ast.join.length > 0)
            ? nodes.find(n => n.parent_node_id === rootId)?.id || rootId
            : rootId,
          node_type: scanType,
          relation_name: tableName,
          total_cost: scanCost,
          startup_cost: scanCost * 0.05,
          actual_rows: null,
          plan_rows: hasWhere ? 100 : 10000,
          actual_loops: 1,
          heat_score: 0,
          node_details: { simulated: true, table: tableName, scanType },
        });
      }
    }
  }

  // Process WHERE subqueries (IN subquery, EXISTS, etc.)
  if (ast.where) {
    addSubqueryNodes(ast.where, rootId, rootCost, nodes);
  }

  // Process ORDER BY → Sort node
  if (ast.orderby && ast.orderby.length > 0) {
    const sortId = crypto.randomUUID();
    const sortCols = ast.orderby.map(o => o.expr?.column || '?').join(', ');

    // Insert sort between root and its current children
    const sortCost = rootCost * 0.2;
    nodes.push({
      id: sortId,
      parent_node_id: rootId,
      node_type: 'Sort',
      relation_name: null,
      total_cost: sortCost,
      startup_cost: sortCost * 0.8,
      actual_rows: null,
      plan_rows: estimateRows(ast),
      actual_loops: 1,
      heat_score: 0,
      node_details: { simulated: true, sortKeys: sortCols },
    });
  }

  // Process GROUP BY → Aggregate/HashAggregate
  if (ast.groupby) {
    const aggId = crypto.randomUUID();
    nodes.push({
      id: aggId,
      parent_node_id: rootId,
      node_type: 'HashAggregate',
      relation_name: null,
      total_cost: rootCost * 0.25,
      startup_cost: rootCost * 0.2,
      actual_rows: null,
      plan_rows: 50,
      actual_loops: 1,
      heat_score: 0,
      node_details: { simulated: true, type: 'HashAggregate' },
    });
  }
}

function getOperationType(ast) {
  if (!ast) return 'Result';
  const type = ast.type?.toUpperCase();
  switch (type) {
    case 'SELECT': return ast.distinct ? 'Unique' : 'Result';
    case 'INSERT': return 'Insert';
    case 'UPDATE': return 'Update';
    case 'DELETE': return 'Delete';
    default: return 'Result';
  }
}

function estimateRows(ast) {
  if (!ast) return 100;
  if (ast.limit?.value?.[0]?.value) return parseInt(ast.limit.value[0].value);
  if (ast.where) return 100;
  return 10000;
}

function estimateASTCost(ast) {
  let base = 100;

  if (ast.join) base += ast.join.length * 500;
  if (ast.where) base += 50;
  if (ast.orderby) base += 200;
  if (ast.groupby) base += 300;
  if (ast.columns === '*') base += 100;

  // Check for subqueries in WHERE
  const sqlStr = JSON.stringify(ast);
  const subqueryCount = (sqlStr.match(/"type":"select"/gi) || []).length;
  base += subqueryCount * 300;

  return base;
}

function checkWhereForTable(where, tableName, alias) {
  if (!where) return false;
  const str = JSON.stringify(where);
  return str.includes(`"${tableName}"`) || (alias && str.includes(`"${alias}"`));
}

function addSubqueryNodes(where, parentId, parentCost, nodes) {
  if (!where) return;

  // Check if this node contains a subquery (SELECT in value)
  if (where.type === 'binary_expr' || where.operator) {
    // Check right side for subquery
    if (where.right?.type === 'expr_list' && where.right?.value) {
      for (const val of where.right.value) {
        if (val?.ast || val?.type === 'select') {
          const subId = crypto.randomUUID();
          nodes.push({
            id: subId,
            parent_node_id: parentId,
            node_type: 'Subquery Scan',
            relation_name: 'subquery',
            total_cost: parentCost * 0.4,
            startup_cost: parentCost * 0.04,
            actual_rows: null,
            plan_rows: 50,
            actual_loops: 1,
            heat_score: 0,
            node_details: { simulated: true, subquery: true },
          });
        }
      }
    }

    // Check for direct subquery (IN (SELECT ...))
    if (where.right?.ast) {
      const subAst = where.right.ast;
      const subId = crypto.randomUUID();
      const subTable = subAst?.from?.[0]?.table || 'subquery';
      nodes.push({
        id: subId,
        parent_node_id: parentId,
        node_type: 'Subquery Scan',
        relation_name: subTable,
        total_cost: parentCost * 0.45,
        startup_cost: parentCost * 0.04,
        actual_rows: null,
        plan_rows: 50,
        actual_loops: 1,
        heat_score: 0,
        node_details: { simulated: true, subquery: true, table: subTable },
      });
    }
  }

  // Recurse
  if (where.left) addSubqueryNodes(where.left, parentId, parentCost, nodes);
  if (where.right && !where.right?.ast) {
    addSubqueryNodes(where.right, parentId, parentCost, nodes);
  }
}

export { scoreAndAnnotate, buildSimulatedPlan };