// كل كلام الواجهة مع السيرفر بيعدي من هنا: مكان واحد بيضيف التوكن ويعالج الأخطاء.
const BASE = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'spendly_token';

// localStorage ممكن يرمي error (مثلاً في وضع التصفح الخاص)، فبنلفّه بـ try/catch
export const tokenStore = {
  get() {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* ignore */
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },
};

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details || {};
  }
}

// AuthContext بيسجّل هنا دالة logout، فلو التوكن انتهى نخرّج المستخدم أوتوماتيك
let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

async function request(path, { method = 'GET', body, params, signal } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;

  const query = params
    ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString()
    : '';

  let res;
  try {
    res = await fetch(`${BASE}${path}${query}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (e) {
    if (e.name === 'AbortError') throw e; // إلغاء مقصود (المستخدم بدّل الشهر): مش خطأ شبكة
    throw new ApiError('Cannot reach the server. Check your connection.', 0);
  }

  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    if (res.status === 401 && token && onUnauthorized) onUnauthorized();
    throw new ApiError(data?.error || 'Something went wrong', res.status, data?.details);
  }
  return data;
}

export const api = {
  register: (body) => request('/auth/register', { method: 'POST', body }),
  login: (body) => request('/auth/login', { method: 'POST', body }),
  me: () => request('/auth/me'),
  listExpenses: (params, signal) => request('/expenses', { params, signal }),
  createExpense: (body) => request('/expenses', { method: 'POST', body }),
  updateExpense: (id, body) => request(`/expenses/${id}`, { method: 'PUT', body }),
  deleteExpense: (id) => request(`/expenses/${id}`, { method: 'DELETE' }),
  stats: (month, signal) => request('/stats', { params: { month }, signal }),
  budgets: (month, signal) => request('/budgets', { params: { month }, signal }),
  setBudget: (category, amount) =>
    request(`/budgets/${encodeURIComponent(category)}`, { method: 'PUT', body: { amount } }),
  deleteBudget: (category) =>
    request(`/budgets/${encodeURIComponent(category)}`, { method: 'DELETE' }),
};
