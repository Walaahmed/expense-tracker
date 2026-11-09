import { CATEGORIES } from './expenses.js';

const round2 = (n) => Math.round(n * 100) / 100;

/** بترجع { errors } أو { value: { category, amount } } */
export function validateBudget(body) {
  const b = body && typeof body === 'object' ? body : {};
  const errors = {};

  const category = String(b.category ?? '');
  if (!CATEGORIES.includes(category)) errors.category = 'Pick a valid category';

  const amount = Number(b.amount);
  if (b.amount === '' || b.amount == null || !Number.isFinite(amount) || amount <= 0) {
    errors.amount = 'Budget must be a positive number';
  } else if (amount > 1_000_000_000) {
    errors.amount = 'Amount is too large';
  }

  if (Object.keys(errors).length > 0) return { errors };
  return { value: { category, amount: round2(amount) } };
}

// ON CONFLICT: لو فيه ميزانية للتصنيف ده بنعدّلها، لو لأ بنضيفها (upsert)
export function upsertBudget(db, userId, { category, amount }) {
  return db.get(
    `INSERT INTO budgets (user_id, category, amount) VALUES (?, ?, ?)
     ON CONFLICT(user_id, category) DO UPDATE SET amount = excluded.amount
     RETURNING category, amount`,
    [userId, category, amount],
  );
}

export async function deleteBudget(db, userId, category) {
  const { changes } = await db.run('DELETE FROM budgets WHERE user_id = ? AND category = ?', [
    userId,
    category,
  ]);
  return changes > 0;
}

/**
 * ok      : أقل من 80% من الحد
 * warning : وصلتي 80% أو أكتر (لحد الحد بالظبط)
 * over    : عدّيتي الحد
 */
export function budgetStatus(spent, limit) {
  if (spent > limit) return 'over';
  if (spent >= limit * 0.8) return 'warning';
  return 'ok';
}

/** كل ميزانيات المستخدم مع المصروف الفعلي في الشهر المطلوب */
export async function getBudgetStatuses(db, userId, month) {
  // الاستعلامين مستقلين، فبنشغّلهم مع بعض بدل ما نستنى الأول
  const [budgets, spentRows] = await Promise.all([
    db.all('SELECT category, amount FROM budgets WHERE user_id = ?', [userId]),
    db.all(
      `SELECT category, SUM(amount) AS spent FROM expenses
       WHERE user_id = ? AND substr(date, 1, 7) = ? GROUP BY category`,
      [userId, month],
    ),
  ]);
  const spentMap = new Map(spentRows.map((r) => [r.category, r.spent]));

  return budgets
    .map(({ category, amount }) => {
      const spent = round2(spentMap.get(category) ?? 0);
      return {
        category,
        limit: amount,
        spent,
        remaining: round2(amount - spent),
        percent: Math.round((spent / amount) * 100),
        status: budgetStatus(spent, amount),
      };
    })
    .sort((a, b) => b.percent - a.percent); // الأقرب للحد الأول
}
