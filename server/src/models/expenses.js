export const CATEGORIES = [
  'Food',
  'Transport',
  'Shopping',
  'Bills',
  'Health',
  'Entertainment',
  'Education',
  'Other',
];

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const isValidMonth = (m) => typeof m === 'string' && MONTH_RE.test(m);

// Date.parse('2026-02-31') بترجع رقم عادي (بتلف على مارس)، فبنقارن بعد التحويل
// عشان نرفض التواريخ المستحيلة.
export function isValidDate(s) {
  if (typeof s !== 'string' || !DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** بترجع { errors } لو فيه غلط، أو { value } نضيف وجاهز للتخزين. */
export function validateExpense(body) {
  const b = body && typeof body === 'object' ? body : {};
  const errors = {};

  const title = String(b.title ?? '').trim();
  if (!title) errors.title = 'Title is required';
  else if (title.length > 100) errors.title = 'Title must be 100 characters or less';

  const amount = Number(b.amount);
  if (b.amount === '' || b.amount == null || !Number.isFinite(amount) || amount <= 0) {
    errors.amount = 'Amount must be a positive number';
  } else if (amount > 1_000_000_000) {
    errors.amount = 'Amount is too large';
  }

  const category = String(b.category ?? '');
  if (!CATEGORIES.includes(category)) errors.category = 'Pick a valid category';

  const date = String(b.date ?? '');
  if (!isValidDate(date)) errors.date = 'Date must be a valid YYYY-MM-DD';

  const note = String(b.note ?? '').trim().slice(0, 300);

  if (Object.keys(errors).length > 0) return { errors };
  return {
    value: { title, amount: Math.round(amount * 100) / 100, category, date, note },
  };
}

const COLUMNS = 'id, title, amount, category, date, note';

export function createExpense(db, userId, v) {
  return db.get(
    `INSERT INTO expenses (user_id, title, amount, category, date, note)
     VALUES (?, ?, ?, ?, ?, ?) RETURNING ${COLUMNS}`,
    [userId, v.title, v.amount, v.category, v.date, v.note],
  );
}

export function listExpenses(db, userId, { month, category, q } = {}) {
  const where = ['user_id = ?'];
  const params = [userId];

  if (month) {
    where.push('substr(date, 1, 7) = ?');
    params.push(month);
  }
  if (category) {
    where.push('category = ?');
    params.push(category);
  }
  if (q) {
    // نهرّب الرموز الخاصة بـ LIKE عشان البحث عن "50%" مثلاً يشتغل صح.
    // LOWER على الطرفين: SQLite بيتجاهل حالة الحروف في LIKE لكن Postgres لأ،
    // فبنوحّد السلوك صراحةً.
    const escaped = q.replace(/[\\%_]/g, (c) => `\\${c}`);
    where.push("LOWER(title) LIKE LOWER(?) ESCAPE '\\'");
    params.push(`%${escaped}%`);
  }

  return db.all(
    `SELECT ${COLUMNS} FROM expenses WHERE ${where.join(' AND ')}
     ORDER BY date DESC, id DESC`,
    params,
  );
}

// الشرط user_id = ? في UPDATE/DELETE هو اللي بيمنع مستخدم يعدّل مصروفات غيره.
export function updateExpense(db, userId, id, v) {
  return db.get(
    `UPDATE expenses SET title = ?, amount = ?, category = ?, date = ?, note = ?
     WHERE id = ? AND user_id = ? RETURNING ${COLUMNS}`,
    [v.title, v.amount, v.category, v.date, v.note, id, userId],
  );
}

export async function deleteExpense(db, userId, id) {
  const { changes } = await db.run('DELETE FROM expenses WHERE id = ? AND user_id = ?', [id, userId]);
  return changes > 0;
}
