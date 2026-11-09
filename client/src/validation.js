// قواعد التحقق في الواجهة. كل دالة بترجع object فيه رسالة لكل حقل غلط ({} لو سليم).
// دي لتجربة مستخدم أحسن (رد فعل فوري من غير طلب للسيرفر)، لكن السيرفر لسه بيتحقق
// من كل حاجة تاني لأن أي حد يقدر يبعت طلب من غير الواجهة.
import { CATEGORIES } from './constants.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const hasErrors = (errors) => Object.keys(errors).length > 0;

// نفس منطق السيرفر: نقارن التاريخ بعد التحويل عشان نرفض 2026-02-31
export function isValidDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function checkAmount(value, label = 'Amount') {
  if (String(value ?? '').trim() === '') return `${label} is required`;
  const n = Number(value);
  if (!Number.isFinite(n)) return 'Enter a valid number';
  if (n <= 0) return `${label} must be greater than 0`;
  if (n > 1_000_000_000) return `${label} is too large`;
  if (Math.round(n * 100) / 100 !== n) return 'Use at most 2 decimal places';
  return null;
}

export function validateExpense(f) {
  const errors = {};

  const title = (f.title ?? '').trim();
  if (!title) errors.title = 'Title is required';
  else if (title.length > 100) errors.title = 'Title must be 100 characters or less';

  const amountError = checkAmount(f.amount);
  if (amountError) errors.amount = amountError;

  if (!CATEGORIES.some((c) => c.name === f.category)) errors.category = 'Pick a category';

  if (!f.date) errors.date = 'Pick a date';
  else if (!isValidDate(f.date)) errors.date = 'Enter a valid date';

  if ((f.note ?? '').length > 300) errors.note = 'Note must be 300 characters or less';

  return errors;
}

export function validateAuth(f, mode) {
  const errors = {};
  const isRegister = mode === 'register';

  if (isRegister) {
    const name = (f.name ?? '').trim();
    if (!name) errors.name = 'Name is required';
    else if (name.length > 60) errors.name = 'Name must be 60 characters or less';
  }

  const email = (f.email ?? '').trim();
  if (!email) errors.email = 'Email is required';
  else if (!EMAIL_RE.test(email)) errors.email = 'Enter a valid email like name@example.com';

  const password = f.password ?? '';
  if (!password) errors.password = 'Password is required';
  else if (isRegister && password.length < 8) errors.password = 'Password must be at least 8 characters';

  return errors;
}

export function validateBudget(f) {
  const errors = {};
  if (!CATEGORIES.some((c) => c.name === f.category)) errors.category = 'Pick a category';
  const amountError = checkAmount(f.amount, 'Budget');
  if (amountError) errors.amount = amountError;
  return errors;
}
