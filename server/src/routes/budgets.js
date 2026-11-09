import { Router } from 'express';
import { asyncHandler } from '../middleware.js';
import { CATEGORIES, isValidMonth } from '../models/expenses.js';
import {
  deleteBudget,
  getBudgetStatuses,
  upsertBudget,
  validateBudget,
} from '../models/budgets.js';

export function budgetsRouter(db) {
  const router = Router();

  // GET /api/budgets?month=2026-11
  router.get('/', asyncHandler(async (req, res) => {
    const month = req.query.month ?? new Date().toISOString().slice(0, 7);
    if (!isValidMonth(month)) {
      return res.status(400).json({ error: 'month must be YYYY-MM' });
    }
    res.json({ budgets: await getBudgetStatuses(db, req.userId, month) });
  }));

  // PUT /api/budgets/Food   body: { amount: 2000 }
  // PUT idempotent: نفس الطلب مرتين بيدّي نفس النتيجة، فمناسب للـ upsert
  router.put('/:category', asyncHandler(async (req, res) => {
    const { errors, value } = validateBudget({
      category: req.params.category,
      amount: req.body?.amount,
    });
    if (errors) return res.status(400).json({ error: 'Invalid budget', details: errors });
    res.json({ budget: await upsertBudget(db, req.userId, value) });
  }));

  router.delete('/:category', asyncHandler(async (req, res) => {
    const { category } = req.params;
    if (!CATEGORIES.includes(category)) return res.status(400).json({ error: 'Unknown category' });
    if (!(await deleteBudget(db, req.userId, category))) {
      return res.status(404).json({ error: 'Budget not found' });
    }
    res.status(204).end();
  }));

  return router;
}
