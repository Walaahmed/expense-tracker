import { Router } from 'express';
import { asyncHandler } from '../middleware.js';
import { isValidMonth } from '../models/expenses.js';
import { getStats } from '../models/stats.js';

export function statsRouter(db) {
  const router = Router();

  // GET /api/stats?month=2026-11
  router.get('/', asyncHandler(async (req, res) => {
    const month = req.query.month ?? new Date().toISOString().slice(0, 7);
    if (!isValidMonth(month)) {
      return res.status(400).json({ error: 'month must be YYYY-MM' });
    }
    res.json(await getStats(db, req.userId, month));
  }));

  return router;
}
