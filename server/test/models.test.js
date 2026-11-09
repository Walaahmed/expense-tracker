import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../src/db.js';
import { createUser } from '../src/models/users.js';
import {
  createExpense,
  deleteExpense,
  isValidDate,
  listExpenses,
  updateExpense,
  validateExpense,
} from '../src/models/expenses.js';
import { getStats, shiftMonth } from '../src/models/stats.js';
import {
  budgetStatus,
  deleteBudget,
  getBudgetStatuses,
  upsertBudget,
  validateBudget,
} from '../src/models/budgets.js';
import { createRateLimiter } from '../src/rateLimit.js';

const url = process.env.TEST_DATABASE_URL;
let shared; 
after(() => shared?.close());

async function setup() {
  let db;
  if (url) {
    shared ??= await openDb({ url });
    db = shared;
    await db.exec('TRUNCATE users, expenses, budgets RESTART IDENTITY CASCADE');
  } else {
    db = await openDb(':memory:');
  }
  const a = await createUser(db, { name: 'A', email: 'a@x.com', passwordHash: 'h' });
  const b = await createUser(db, { name: 'B', email: 'b@x.com', passwordHash: 'h' });
  return { db, a, b };
}

const exp = (over = {}) =>
  validateExpense({ title: 'Coffee', amount: 50, category: 'Food', date: '2026-11-03', ...over })
    .value;

test('isValidDate rejects impossible dates', () => {
  assert.equal(isValidDate('2026-11-07'), true);
  assert.equal(isValidDate('2024-02-29'), true); 
  assert.equal(isValidDate('2026-02-31'), false);
  assert.equal(isValidDate('2026-13-01'), false);
  assert.equal(isValidDate('07/11/2026'), false);
});

test('validateExpense returns field errors and cleans values', () => {
  const bad = validateExpense({ title: '  ', amount: -5, category: 'Nope', date: 'x' });
  assert.deepEqual(Object.keys(bad.errors).sort(), ['amount', 'category', 'date', 'title']);

  const ok = validateExpense({ title: '  Lunch ', amount: '12.345', category: 'Food', date: '2026-11-01' });
  assert.equal(ok.value.title, 'Lunch');
  assert.equal(ok.value.amount, 12.35); // اتقرّب لرقمين عشريين

  assert.ok(validateExpense({ title: 'x', amount: '', category: 'Food', date: '2026-11-01' }).errors.amount);
});

test('CRUD works and is scoped per user', async () => {
  const { db, a, b } = await setup();
  const created = await createExpense(db, a.id, exp());
  assert.equal(created.title, 'Coffee');

  // مستخدم تاني ميقدرش يعدّل أو يمسح
  assert.equal(await updateExpense(db, b.id, created.id, exp({ title: 'Hacked' })), undefined);
  assert.equal(await deleteExpense(db, b.id, created.id), false);
  assert.equal((await listExpenses(db, b.id)).length, 0);

  const updated = await updateExpense(db, a.id, created.id, exp({ title: 'Tea', amount: 20 }));
  assert.equal(updated.title, 'Tea');
  assert.equal(updated.amount, 20);

  assert.equal(await deleteExpense(db, a.id, created.id), true);
  assert.equal((await listExpenses(db, a.id)).length, 0);
});

test('listExpenses filters by month, category and search text', async () => {
  const { db, a } = await setup();
  await createExpense(db, a.id, exp({ title: 'Coffee', date: '2026-11-03' }));
  await createExpense(db, a.id, exp({ title: 'Bus', category: 'Transport', date: '2026-11-10' }));
  await createExpense(db, a.id, exp({ title: 'Old coffee', date: '2026-10-30' }));
  await createExpense(db, a.id, exp({ title: '50% sale', category: 'Shopping', date: '2026-11-11' }));

  assert.equal((await listExpenses(db, a.id, { month: '2026-11' })).length, 3);
  assert.equal((await listExpenses(db, a.id, { month: '2026-11', category: 'Transport' })).length, 1);
  assert.equal((await listExpenses(db, a.id, { q: 'coffee' })).length, 2);
  assert.equal((await listExpenses(db, a.id, { q: '50%' })).length, 1);
  assert.equal((await listExpenses(db, a.id, { q: '%' })).length, 1); // % حرفية مش wildcard

  const sorted = (await listExpenses(db, a.id, { month: '2026-11' })).map((e) => e.date);
  assert.deepEqual(sorted, [...sorted].sort().reverse()); // الأحدث الأول
});

test('shiftMonth crosses year boundaries', () => {
  assert.equal(shiftMonth('2026-01', -1), '2025-12');
  assert.equal(shiftMonth('2026-11', -5), '2026-06');
  assert.equal(shiftMonth('2026-12', 1), '2027-01');
});

test('getStats aggregates totals, categories, daily and monthly series', async () => {
  const { db, a, b } = await setup();
  await createExpense(db, a.id, exp({ amount: 100, category: 'Food', date: '2026-11-03' }));
  await createExpense(db, a.id, exp({ amount: 50, category: 'Food', date: '2026-11-03' }));
  await createExpense(db, a.id, exp({ amount: 200, category: 'Bills', date: '2026-11-15' }));
  await createExpense(db, a.id, exp({ amount: 100, category: 'Food', date: '2026-10-20' }));
  await createExpense(db, a.id, exp({ amount: 10, category: 'Other', date: '2026-11-03' }));
  await createExpense(db, b.id, exp({ amount: 5000, date: '2026-11-03' })); // مستخدم تاني، لازم ميتحسبش

  const s = await getStats(db, a.id, '2026-11');
  assert.equal(s.total, 360); // 
  assert.equal(s.count, 4);

  assert.deepEqual(s.byCategory[0], { category: 'Bills', total: 200, count: 1 });
  assert.equal(s.byCategory.find((c) => c.category === 'Food').total, 150);

  assert.equal(s.daily.length, 30);
  assert.equal(s.daily[2].total, 160); 
  assert.equal(s.daily[0].total, 0); 

  assert.equal(s.monthly.length, 6);
  assert.deepEqual(s.monthly.map((m) => m.month), [
    '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11',
  ]);
  assert.equal(s.monthly[4].total, 100);
  assert.equal(s.monthly[5].total, 360);

  assert.equal(s.previousTotal, 100);
  assert.equal(s.changePct, 260);
});

test('getStats handles an empty month (no division by zero)', async () => {
  const { db, a } = await setup();
  const s = await getStats(db, a.id, '2026-02');
  assert.equal(s.total, 0);
  assert.equal(s.changePct, null);
  assert.equal(s.daily.length, 28);
  assert.deepEqual(s.byCategory, []);
});

test('budgetStatus thresholds', () => {
  assert.equal(budgetStatus(0, 100), 'ok');
  assert.equal(budgetStatus(79.99, 100), 'ok');
  assert.equal(budgetStatus(80, 100), 'warning');
  assert.equal(budgetStatus(100, 100), 'warning'); 
  assert.equal(budgetStatus(100.01, 100), 'over');
});

test('validateBudget', () => {
  assert.deepEqual(validateBudget({ category: 'Food', amount: '250.456' }).value, {
    category: 'Food',
    amount: 250.46,
  });
  assert.deepEqual(Object.keys(validateBudget({ category: 'x', amount: 0 }).errors).sort(), [
    'amount',
    'category',
  ]);
});

test('budgets: upsert replaces, statuses use the selected month only, scoped per user', async () => {
  const { db, a, b } = await setup();
  await upsertBudget(db, a.id, { category: 'Food', amount: 1000 });
  await upsertBudget(db, a.id, { category: 'Food', amount: 200 }); 
  await upsertBudget(db, a.id, { category: 'Bills', amount: 1000 });
  await upsertBudget(db, b.id, { category: 'Food', amount: 1 });

  await createExpense(db, a.id, exp({ amount: 250, category: 'Food', date: '2026-11-05' }));
  await createExpense(db, a.id, exp({ amount: 900, category: 'Food', date: '2026-10-05' })); 
  await createExpense(db, a.id, exp({ amount: 100, category: 'Bills', date: '2026-11-06' }));

  const list = await getBudgetStatuses(db, a.id, '2026-11');
  assert.equal(list.length, 2);
  assert.deepEqual(list[0], {
    category: 'Food', limit: 200, spent: 250, remaining: -50, percent: 125, status: 'over',
  }); 
  assert.equal(list[1].status, 'ok');

  assert.equal((await getBudgetStatuses(db, a.id, '2026-09'))[0].spent, 0);
  assert.equal(await deleteBudget(db, b.id, 'Bills'), false);
  assert.equal(await deleteBudget(db, a.id, 'Bills'), true);
});

test('rate limiter blocks after max and sets Retry-After', () => {
  const limiter = createRateLimiter({ windowMs: 60_000, max: 2 });
  const run = (ip) => {
    const res = {
      headers: {},
      set(k, v) { this.headers[k] = v; },
      status(c) { this.code = c; return this; },
      json(b) { this.body = b; },
    };
    let passed = false;
    limiter({ ip }, res, () => { passed = true; });
    return { passed, res };
  };
  assert.equal(run('1.1.1.1').passed, true);
  assert.equal(run('1.1.1.1').passed, true);
  const blocked = run('1.1.1.1');
  assert.equal(blocked.passed, false);
  assert.equal(blocked.res.code, 429);
  assert.ok(Number(blocked.res.headers['Retry-After']) > 0);
  assert.equal(run('2.2.2.2').passed, true); // IP تاني مش متأثر
});
