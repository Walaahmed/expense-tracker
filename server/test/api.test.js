// اختبارات تكامل للـ API الحقيقي (Express + JWT + DB في الذاكرة).
// محتاجة npm install الأول لأنها بتستخدم express و bcryptjs و jsonwebtoken.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../src/db.js';
import { createApp } from '../src/app.js';

let server;
let base;

before(async () => {
  const url = process.env.TEST_DATABASE_URL; 
  const db = await openDb(url ? { url } : ':memory:');
  if (url) await db.exec('TRUNCATE users, expenses, budgets RESTART IDENTITY CASCADE');
  const app = createApp(db, { authRateLimit: { windowMs: 60_000, max: 1000 } });
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  base = `http://127.0.0.1:${server.address().port}/api`;
});

after(() => {
  server.closeAllConnections?.();
  server.close();
});

async function call(path, { method = 'GET', body, token } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(base + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: res.status === 204 ? null : await res.json() };
}

const register = (email) =>
  call('/auth/register', {
    method: 'POST',
    body: { name: 'Test', email, password: 'password123' },
  });

const sample = { title: 'Coffee', amount: 45.5, category: 'Food', date: '2026-11-03' };

test('register, duplicate email, login and /me', async () => {
  const r = await register('Sara@Example.com');
  assert.equal(r.status, 201);
  assert.ok(r.data.token);
  assert.equal(r.data.user.email, 'sara@example.com'); 
  assert.equal(r.data.user.password_hash, undefined); 

  assert.equal((await register('sara@example.com')).status, 409);

  const bad = await call('/auth/login', { method: 'POST', body: { email: 'sara@example.com', password: 'wrong' } });
  assert.equal(bad.status, 401);

  const ok = await call('/auth/login', { method: 'POST', body: { email: 'sara@example.com', password: 'password123' } });
  assert.equal(ok.status, 200);

  const me = await call('/auth/me', { token: ok.data.token });
  assert.equal(me.data.user.name, 'Test');
});

test('register validates input', async () => {
  const r = await call('/auth/register', { method: 'POST', body: { name: '', email: 'nope', password: '123' } });
  assert.equal(r.status, 400);
  assert.deepEqual(Object.keys(r.data.details).sort(), ['email', 'name', 'password']);
});

test('protected routes reject missing or bad tokens', async () => {
  assert.equal((await call('/expenses')).status, 401);
  assert.equal((await call('/stats', { token: 'garbage' })).status, 401);
});

test('expense lifecycle and per-user isolation', async () => {
  const { data: u1 } = await register('one@example.com');
  const { data: u2 } = await register('two@example.com');

  const created = await call('/expenses', { method: 'POST', token: u1.token, body: sample });
  assert.equal(created.status, 201);
  const id = created.data.expense.id;

  const invalid = await call('/expenses', { method: 'POST', token: u1.token, body: { ...sample, amount: -1 } });
  assert.equal(invalid.status, 400);
  assert.ok(invalid.data.details.amount);

  const list = await call('/expenses?month=2026-11', { token: u1.token });
  assert.equal(list.data.expenses.length, 1);
  assert.equal((await call('/expenses?month=bad', { token: u1.token })).status, 400);

  assert.equal((await call('/expenses', { token: u2.token })).data.expenses.length, 0);
  assert.equal((await call(`/expenses/${id}`, { method: 'PUT', token: u2.token, body: sample })).status, 404);
  assert.equal((await call(`/expenses/${id}`, { method: 'DELETE', token: u2.token })).status, 404);

  const upd = await call(`/expenses/${id}`, { method: 'PUT', token: u1.token, body: { ...sample, amount: 60 } });
  assert.equal(upd.data.expense.amount, 60);

  const stats = await call('/stats?month=2026-11', { token: u1.token });
  assert.equal(stats.data.total, 60);
  assert.equal(stats.data.byCategory[0].category, 'Food');
  assert.equal((await call('/stats?month=2026-99', { token: u1.token })).status, 400);

  assert.equal((await call(`/expenses/${id}`, { method: 'DELETE', token: u1.token })).status, 204);
  assert.equal((await call('/expenses', { token: u1.token })).data.expenses.length, 0);
});

test('budgets: upsert, status vs spending, validation, isolation', async () => {
  const { data: u1 } = await register('budget1@example.com');
  const { data: u2 } = await register('budget2@example.com');

  const put = (token, category, amount) =>
    call(`/budgets/${category}`, { method: 'PUT', token, body: { amount } });

  assert.equal((await put(u1.token, 'Food', 1000)).status, 200);
  assert.equal((await put(u1.token, 'Food', 500)).data.budget.amount, 500); 
  assert.equal((await put(u1.token, 'Nope', 100)).status, 400);
  assert.equal((await put(u1.token, 'Food', -5)).status, 400);

  await call('/expenses', { method: 'POST', token: u1.token, body: { ...sample, amount: 450 } });

  const list = await call('/budgets?month=2026-11', { token: u1.token });
  assert.equal(list.data.budgets.length, 1);
  assert.deepEqual(
    { spent: list.data.budgets[0].spent, status: list.data.budgets[0].status },
    { spent: 450, status: 'warning' }, 
  );

  assert.equal((await call('/budgets?month=2026-11', { token: u2.token })).data.budgets.length, 0);
  assert.equal((await call('/budgets/Food', { method: 'DELETE', token: u2.token })).status, 404);
  assert.equal((await call('/budgets/Food', { method: 'DELETE', token: u1.token })).status, 204);
});

test('auth endpoints are rate limited and responses carry security headers', async () => {
  const url = process.env.TEST_DATABASE_URL; 
  const db = await openDb(url ? { url } : ':memory:');
  if (url) await db.exec('TRUNCATE users, expenses, budgets RESTART IDENTITY CASCADE');
  const app = createApp(db, { authRateLimit: { windowMs: 60_000, max: 3 } });
  const s = await new Promise((resolve) => {
    const srv = app.listen(0, () => resolve(srv));
  });
  try {
    const url = `http://127.0.0.1:${s.address().port}/api/auth/login`;
    const attempt = () =>
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'x@x.com', password: 'wrong-password' }),
      });
    for (let i = 0; i < 3; i++) assert.equal((await attempt()).status, 401);
    const blocked = await attempt();
    assert.equal(blocked.status, 429);
    assert.ok(blocked.headers.get('retry-after'));
    assert.equal(blocked.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(blocked.headers.get('x-powered-by'), null);
  } finally {
    s.closeAllConnections?.();
    s.close();
  }
});
