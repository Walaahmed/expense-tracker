import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { CATEGORIES } from '../constants.js';
import { downloadCsv, expensesToCsv } from '../csv.js';
import { currentMonth, monthLabel, shiftMonth, todayISO } from '../format.js';
import Budgets from '../components/Budgets.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import ExpenseForm from '../components/ExpenseForm.jsx';
import ExpenseList from '../components/ExpenseList.jsx';
import { ChartsSkeleton, SummarySkeleton } from '../components/Skeletons.jsx';
import SummaryCards from '../components/SummaryCards.jsx';
import { useToast } from '../ToastContext.jsx';

// recharts أتقل جزء في المشروع، فبنحمّل الرسوم في ملف منفصل (lazy).
// بنبدأ التحميل فورًا أول ما الملف ده يتحمّل (بالتوازي مع طلبات البيانات)،
// فالأرقام والقايمة بتظهر الأول والرسوم بتنضم لما توصل، من غير ما تستني بعض.
const loadCharts = () => import('../components/ChartsSection.jsx');
const ChartsSection = lazy(loadCharts);
loadCharts();

const isAbort = (e) => e?.name === 'AbortError';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const toast = useToast();

  const [month, setMonth] = useState(currentMonth());
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [stats, setStats] = useState(null);
  const [expenses, setExpenses] = useState(null);
  const [budgets, setBudgets] = useState(null);
  const [error, setError] = useState('');
  // بنعرض البيانات القديمة (باهتة) وإحنا بنجيب الجديدة بدل ما نفضّي الشاشة ونوميض
  const [refreshing, setRefreshing] = useState(false);
  // نزوّد version بعد أي إضافة/تعديل/حذف، فالـ effects تجيب البيانات من جديد
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  // null = الفورم مقفولة | { ... } = القيم الابتدائية (فيها id لو تعديل)
  const [formInitial, setFormInitial] = useState(null);
  // نافذة التأكيد: { kind: 'expense' | 'budget', item }
  const [confirm, setConfirm] = useState(null);

  // Debounce للبحث: منبعتش طلب مع كل حرف، نستنى 300ms من آخر كتابة
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // الـ AbortController بيلغي الطلب القديم فعليًا (مش بس بيتجاهل رده)،
  // فلو بدّلتي الشهر بسرعة السيرفر والشبكة مش بيشتغلوا على طلبات ملهاش لزوم.
  useEffect(() => {
    const ctrl = new AbortController();
    setRefreshing(true);
    api
      .stats(month, ctrl.signal)
      .then((data) => {
        setStats(data);
        setError('');
      })
      .catch((e) => !isAbort(e) && setError(e.message))
      .finally(() => !ctrl.signal.aborted && setRefreshing(false));
    return () => ctrl.abort();
  }, [month, version]);

  useEffect(() => {
    const ctrl = new AbortController();
    api
      .listExpenses({ month, category, q: debouncedSearch }, ctrl.signal)
      .then((data) => setExpenses(data.expenses))
      .catch((e) => !isAbort(e) && setError(e.message));
    return () => ctrl.abort();
  }, [month, category, debouncedSearch, version]);

  // الميزانيات بتتحدث مع الشهر ومع أي تعديل في المصروفات (version)
  useEffect(() => {
    const ctrl = new AbortController();
    api
      .budgets(month, ctrl.signal)
      .then((data) => setBudgets(data.budgets))
      .catch((e) => !isAbort(e) && setError(e.message));
    return () => ctrl.abort();
  }, [month, version]);

  // useCallback: الأولاد معمولين memo، فلو الدوال اتعملت من جديد كل رسمة الـ memo مش هيفيد
  const saveBudget = useCallback(
    async (cat, amount) => {
      await api.setBudget(cat, amount); // الأخطاء بتتعرض جوه فورم الميزانية
      toast(`${cat} budget saved`);
      refresh();
    },
    [refresh, toast],
  );

  const askRemoveBudget = useCallback((cat) => setConfirm({ kind: 'budget', item: cat }), []);
  const askRemoveExpense = useCallback((expense) => setConfirm({ kind: 'expense', item: expense }), []);
  const openEdit = useCallback((expense) => setFormInitial(expense), []);

  async function runConfirmed() {
    const { kind, item } = confirm;
    setConfirm(null);
    try {
      if (kind === 'expense') {
        await api.deleteExpense(item.id);
        toast(`Deleted "${item.title}"`);
      } else {
        await api.deleteBudget(item);
        toast(`${item} budget removed`);
      }
      refresh();
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  const defaultDate = month === currentMonth() ? todayISO() : `${month}-01`;
  const openNew = () => setFormInitial({ date: defaultDate });

  async function saveExpense(form) {
    const editing = Boolean(formInitial.id);
    if (editing) await api.updateExpense(formInitial.id, form);
    else await api.createExpense(form);
    setFormInitial(null);
    toast(editing ? 'Expense updated' : 'Expense added');
    refresh();
  }

  function exportCsv() {
    downloadCsv(`spendly-${month}.csv`, expensesToCsv(expenses));
    toast(`Exported ${expenses.length} expenses`);
  }

  const filtered = Boolean(category || debouncedSearch);
  const closeForm = useCallback(() => setFormInitial(null), []);
  const closeConfirm = useCallback(() => setConfirm(null), []);
  const confirmText = useMemo(() => {
    if (!confirm) return null;
    return confirm.kind === 'expense'
      ? { title: `Delete "${confirm.item.title}"?`, body: 'This expense will be removed permanently.', label: 'Delete' }
      : { title: `Remove the ${confirm.item} budget?`, body: 'You can set it again at any time.', label: 'Remove' };
  }, [confirm]);

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          Spendly
        </div>
        <div className="topbar-right">
          <span className="muted small hide-sm">Hi, {user.name}</span>
          <button className="btn small" onClick={logout}>Log out</button>
        </div>
      </header>

      <main className="container">
        <div className="page-head">
          <div>
            {/* key بيعيد أنيميشن الدخول مع كل تغيير شهر */}
            <h1 key={month} className="swap-in">{monthLabel(month)}</h1>
            <p className="muted">Your spending overview</p>
          </div>
          <div className="month-nav">
            <button className="btn icon" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month">‹</button>
            <input
              type="month"
              value={month}
              max={currentMonth()}
              onChange={(e) => e.target.value && setMonth(e.target.value)}
              aria-label="Select month"
            />
            <button
              className="btn icon"
              onClick={() => setMonth(shiftMonth(month, 1))}
              disabled={month >= currentMonth()}
              aria-label="Next month"
            >
              ›
            </button>
          </div>
        </div>

        {error && <div className="alert" role="alert">{error}</div>}

        {stats ? (
          <div className={refreshing ? 'is-refreshing' : ''}>
            <SummaryCards stats={stats} />
            <Suspense fallback={<ChartsSkeleton />}>
              <ChartsSection stats={stats} />
            </Suspense>
          </div>
        ) : (
          !error && (
            <>
              <SummarySkeleton />
              <ChartsSkeleton />
            </>
          )
        )}

        <Budgets budgets={budgets} onSave={saveBudget} onDelete={askRemoveBudget} />

        <section className="expenses-section">
          <div className="section-head">
            <h2>Expenses</h2>
            <div className="head-actions">
              <button
                className="btn"
                onClick={exportCsv}
                disabled={!expenses || expenses.length === 0}
                title="Download the expenses shown below as a CSV file"
              >
                ⤓ Export CSV
              </button>
              <button className="btn primary" onClick={openNew}>+ Add expense</button>
            </div>
          </div>

          {formInitial && (
            // key بيخلّي React يبني الفورم من الأول لما نبدّل بين إضافة وتعديل مصروف تاني
            <ExpenseForm
              key={formInitial.id ?? 'new'}
              initial={formInitial}
              onSubmit={saveExpense}
              onCancel={closeForm}
            />
          )}

          <div className="filters">
            <input
              type="search"
              placeholder="Search by title…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search expenses"
            />
            <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category">
              <option value="">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="card list-card">
            <ExpenseList expenses={expenses} filtered={filtered} onEdit={openEdit} onDelete={askRemoveExpense} />
          </div>
        </section>
      </main>

      {confirm && (
        <ConfirmDialog
          title={confirmText.title}
          body={confirmText.body}
          confirmLabel={confirmText.label}
          onConfirm={runConfirmed}
          onCancel={closeConfirm}
        />
      )}
    </div>
  );
}
