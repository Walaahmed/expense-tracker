
export function shiftMonth(month, delta) {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

function daysInMonth(month) {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

const round2 = (n) => Math.round(n * 100) / 100;

export async function getStats(db, userId, month) {
  const months = Array.from({ length: 6 }, (_, i) => shiftMonth(month, i - 5));


  const [totals, categoryRows, dayRows, monthRows] = await Promise.all([
    db.get(
      `SELECT COALESCE(SUM(amount), 0) AS total, CAST(COUNT(*) AS INTEGER) AS count
       FROM expenses WHERE user_id = ? AND substr(date, 1, 7) = ?`,
      [userId, month],
    ),
    
    db.all(
      `SELECT category, SUM(amount) AS total, CAST(COUNT(*) AS INTEGER) AS count
       FROM expenses WHERE user_id = ? AND substr(date, 1, 7) = ?
       GROUP BY category ORDER BY total DESC`,
      [userId, month],
    ),
     db.all(
      `SELECT date, SUM(amount) AS total FROM expenses
       WHERE user_id = ? AND substr(date, 1, 7) = ? GROUP BY date`,
      [userId, month],
    ),
     db.all(
      `SELECT substr(date, 1, 7) AS month, SUM(amount) AS total FROM expenses
       WHERE user_id = ? AND substr(date, 1, 7) BETWEEN ? AND ?
       GROUP BY substr(date, 1, 7)`,
      [userId, months[0], months[5]],
    ),
  ]);

  const { total, count } = totals;
  const byCategory = categoryRows.map((r) => ({
    category: r.category,
    total: round2(r.total),
    count: r.count,
  }));

    const dayMap = new Map(dayRows.map((r) => [r.date, r.total]));
  const daily = Array.from({ length: daysInMonth(month) }, (_, i) => {
    const day = String(i + 1).padStart(2, '0');
    return { day: i + 1, total: round2(dayMap.get(`${month}-${day}`) ?? 0) };
  });

  const monthMap = new Map(monthRows.map((r) => [r.month, r.total]));
  const monthly = months.map((m) => ({ month: m, total: round2(monthMap.get(m) ?? 0) }));

  const previousTotal = monthly[4].total;
  const changePct =
    previousTotal > 0 ? round2(((total - previousTotal) / previousTotal) * 100) : null;

  return {
    month,
    total: round2(total),
    count,
    previousTotal,
    changePct,
    byCategory,
    daily,
    monthly,
  };
}
