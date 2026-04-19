import express from 'express';
import db from '../db.js';
import { parseSQL } from '../services/parser.js';
import { suggestIndexes } from '../services/indexSuggester.js';
import { scoreAndAnnotate, buildSimulatedPlan } from '../services/costScorer.js';
import { classicalOptimize } from '../services/classicalOptimizer.js';

const router = express.Router();

router.post('/', async (req, res, next) => {
  const { sql, dialect = 'postgresql', userId = null } = req.body;

  if (!sql) {
    return res.status(400).json({ error: 'SQL is required' });
  }

  try {
    const dbType = dialect.toLowerCase() === 'postgresql' ? 'PostgreSQL' : 'MySQL';
    const { ast, error: parseError } = parseSQL(sql, dbType);
    if (parseError) {
      return res.status(400).json({ error: `Parse error: ${parseError}` });
    }

    const {
      optimizations: classicalOpts,
      optimizedSQL: classicalSQL,
    } = classicalOptimize(ast, sql);

    let planJson = null;
    let executionTimeMs = null;
    let planError = null;

    try {
      const start = Date.now();

      const planResult = await db.query(
        `EXPLAIN (FORMAT JSON, ANALYZE, BUFFERS) ${sql}`
      );

      executionTimeMs = Date.now() - start;
      planJson = planResult.rows[0]['QUERY PLAN'][0];

    } catch (explainErr) {
      console.warn('EXPLAIN failed:', explainErr.message);
      planError = explainErr.message;
    }

    // Score and annotate plan nodes if EXPLAIN succeeded,
    // otherwise build a simulated plan tree from the AST
    let costScore = null;
    let nodes = [];

    if (planJson) {
      const scored = scoreAndAnnotate(planJson);
      costScore = scored.costScore;
      nodes = scored.nodes;
    } else if (ast) {
      // Build a simulated execution plan from the AST so the tree visualizer
      // and heat map still render even when EXPLAIN is unavailable
      const simulated = buildSimulatedPlan(ast, sql);
      costScore = simulated.costScore;
      nodes = simulated.nodes;
    }

    const indexSuggestions = suggestIndexes(ast, sql);

    // Save to query_history
    let queryId = null;
    let query_hash = null;
    try {
      const histResult = await db.query(
        `INSERT INTO query_history
         (user_id, raw_query, dialect, cost_score, execution_time_ms, execution_plan)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, query_hash`,
        [userId, sql, dialect, costScore, executionTimeMs, planJson]
      );
      queryId = histResult.rows[0].id;
      query_hash = histResult.rows[0].query_hash;
    } catch (histErr) {
      console.warn('History insert failed:', histErr.message);
    }

    // Save execution plan nodes
    if (queryId && nodes.length > 0) {
      for (const node of nodes) {
        try {
          await db.query(
            `INSERT INTO execution_plan_nodes
             (id, query_id, parent_node_id, node_type, relation_name,
              total_cost, startup_cost, actual_rows, plan_rows,
              actual_loops, heat_score, node_details)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
            [
              node.id,
              queryId,
              node.parent_node_id,
              node.node_type,
              node.relation_name,
              node.total_cost,
              node.startup_cost,
              node.actual_rows,
              node.plan_rows,
              node.actual_loops,
              node.heat_score,
              node.node_details,
            ]
          );
        } catch (nodeErr) {
          console.warn('Node insert failed:', nodeErr.message);
        }
      }
    }

    // Save index suggestions (skip ones with null index_type that violate CHECK)
    if (queryId) {
      for (const s of indexSuggestions) {
        try {
          await db.query(
            `INSERT INTO index_suggestions
             (query_id, table_name, column_name, index_type, severity, reason, create_statement)
             VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [
              queryId,
              s.table_name,
              s.column_name,
              s.index_type || 'btree',
              s.severity,
              s.reason,
              s.create_statement,
            ]
          );
        } catch (idxErr) {
          console.warn('Index suggestion insert failed:', idxErr.message);
        }
      }
    }

    res.json({
      queryId,
      queryHash: query_hash,
      costScore,
      executionTimeMs,
      planNodes: nodes,
      planError,
      indexSuggestions,
      classicalOptimizations: classicalOpts,
      classicalOptimizedSQL: classicalSQL,
      rawQuery: sql,
      isSimulated: !planJson && nodes.length > 0,
    });

  } catch (err) {
    next(err);
  }
});

export default router;