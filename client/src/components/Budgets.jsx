import { memo, useState } from 'react';
import { CATEGORIES, categoryColor } from '../constants.js';
import { money } from '../format.js';
import { useValidatedForm } from '../useValidatedForm.js';
import { validateBudget } from '../validation.js';
import Field from './Field.jsx';
import { ListSkeleton } from './Skeletons.jsx';

// نص الحالة بالكلمات + أيقونة، مش باللون بس (عشان الناس اللي مبتفرقش الألوان)
function statusText(b) {
  if (b.status === 'over') return `⚠ Over budget by ${money(Math.abs(b.remaining))}`;
  if (b.status === 'warning') return `⚠ ${b.percent}% used · ${money(b.remaining)} left`;
  return `${money(b.remaining)} left`;
}

function BudgetForm({ onSave }) {
  const { form, errors, setErrors, bind, check, reset } = useValidatedForm(
    { category: 'Food', amount: '' },
    validateBudget,
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!check(e.currentTarget)) return;
    setSaving(true);
    try {
      await onSave(form.category, form.amount);
      reset(); // بنفضّي الحقول بعد النجاح
    } catch (err) {
      setError(err.message);
      setErrors(err.details || {});
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="budget-form" onSubmit={handleSubmit} noValidate>
      <Field label="Category" error={errors.category}>
        <select {...bind('category')}>
          {CATEGORIES.map((c) => (
            <option key={c.name} value={c.name}>{c.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Monthly limit (EGP)" error={errors.amount}>
        <input {...bind('amount')} type="number" inputMode="decimal" min="0" step="0.01" placeholder="e.g. 2000" />
      </Field>
      <button className="btn primary" disabled={saving}>{saving ? 'Saving…' : 'Set budget'}</button>
      {error && <div className="alert span-all" role="alert">{error}</div>}
    </form>
  );
}

function Budgets({ budgets, onSave, onDelete }) {
  const alerts = (budgets ?? []).filter((b) => b.status !== 'ok');

  return (
    <section className="card budgets">
      <div>
        <h2>Monthly budgets</h2>
        <p className="muted small">
          Set a limit per category. It applies to every month, and you get a warning at 80%.
        </p>
      </div>

      {alerts.length > 0 && (
        <ul className="budget-alerts" aria-label="Budget alerts">
          {alerts.map((b) => (
            <li key={b.category} className={b.status}>
              {b.status === 'over'
                ? `You went over your ${b.category} budget by ${money(Math.abs(b.remaining))}.`
                : `You've used ${b.percent}% of your ${b.category} budget.`}
            </li>
          ))}
        </ul>
      )}

      {budgets === null ? (
        <ListSkeleton rows={2} />
      ) : budgets.length === 0 ? (
        <div className="empty empty-anim"><span className="empty-icon" aria-hidden="true">🎯</span>No budgets yet. Set your first one below.</div>
      ) : (
        <ul className="budget-list">
          {budgets.map((b, i) => (
            <li key={b.category} style={{ '--i': i }}>
              <div className="budget-row">
                <span className="dot" style={{ background: categoryColor(b.category) }} aria-hidden="true" />
                <strong className="budget-name">{b.category}</strong>
                <span className="budget-amounts">
                  {money(b.spent)} <span className="muted">/ {money(b.limit)}</span>
                </span>
                <button
                  className="btn small danger"
                  onClick={() => onDelete(b.category)}
                  aria-label={`Remove ${b.category} budget`}
                >
                  Remove
                </button>
              </div>
              <div
                className="progress"
                role="progressbar"
                aria-label={`${b.category} budget used`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.min(b.percent, 100)}
              >
                <div className={`progress-fill ${b.status}`} style={{ width: `${Math.min(b.percent, 100)}%` }} />
              </div>
              <span className={`budget-status ${b.status}`}>{statusText(b)}</span>
            </li>
          ))}
        </ul>
      )}

      <BudgetForm onSave={onSave} />
    </section>
  );
}

export default memo(Budgets);
