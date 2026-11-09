import { Router } from 'express';
import { asyncHandler } from '../middleware.js';
import {
  CATEGORIES,
  createExpense,
  deleteExpense,
  isValidMonth,
  listExpenses,
  updateExpense,
  validateExpense,
} from '../models/expenses.js';

const parseId = (raw) => {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export function expensesRouter(db) {
  const router = Router();

  // GET /api/expenses?month=2026-11&category=Food&q=coffee
  router.get('/', asyncHandler(async (req, res) => {
    const { month, category, q } = req.query;

    if (month !== undefined && !isValidMonth(month)) {
      return res.status(400).json({ error: 'month must be YYYY-MM' });
    }
    if (category !== undefined && category !== '' && !CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'Unknown category' });
    }

    const expenses = await listExpenses(db, req.userId, {
      month: month || undefined,
      category: category || undefined,
      q: typeof q === 'string' ? q.trim().slice(0, 100) : undefined,
    });
    res.json({ expenses });
  }));

  router.post('/', asyncHandler(async (req, res) => {
    const { errors, value } = validateExpense(req.body);
    if (errors) return res.status(400).json({ error: 'Invalid expense', details: errors });
    res.status(201).json({ expense: await createExpense(db, req.userId, value) });
  }));

  router.put('/:id', asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });

    const { errors, value } = validateExpense(req.body);
    if (errors) return res.status(400).json({ error: 'Invalid expense', details: errors });

    const expense = await updateExpense(db, req.userId, id, value);
    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    res.json({ expense });
  }));

  router.delete('/:id', asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    if (!(await deleteExpense(db, req.userId, id))) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    res.status(204).end();
  }));

  return router;
}
