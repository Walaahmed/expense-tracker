import { useState } from 'react';
import { CATEGORIES } from '../constants.js';
import { useValidatedForm } from '../useValidatedForm.js';
import { validateExpense } from '../validation.js';
import Field from './Field.jsx';

// بيشتغل للإضافة وللتعديل: لو جاله initial.id يبقى تعديل.
// الأب (Dashboard) هو اللي بيكلم الـ API، والفورم بتجمع البيانات وتتحقق منها وتعرض الأخطاء.
export default function ExpenseForm({ initial, onSubmit, onCancel }) {
  const { form, errors, setErrors, bind, check } = useValidatedForm(
    {
      title: initial.title ?? '',
      amount: initial.amount ?? '',
      category: initial.category ?? 'Food',
      date: initial.date,
      note: initial.note ?? '',
    },
    validateExpense,
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(initial.id);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!check(e.currentTarget)) return; // فيه أخطاء: منبعتش للسيرفر
    setSaving(true);
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err.message);
      setErrors(err.details || {}); // أخطاء السيرفر بتظهر تحت الحقول برضه
      setSaving(false);
    }
  }

  return (
    <form className="card expense-form" onSubmit={handleSubmit} noValidate>
      <h2>{isEdit ? 'Edit expense' : 'New expense'}</h2>
      {error && <div className="alert" role="alert">{error}</div>}

      <div className="form-grid">
        <Field label="Title" error={errors.title} className="span-2">
          <input {...bind('title')} placeholder="e.g. Lunch with friends" maxLength={100} autoFocus />
        </Field>

        <Field label="Amount (EGP)" error={errors.amount}>
          <input {...bind('amount')} type="number" inputMode="decimal" min="0" step="0.01" placeholder="0.00" />
        </Field>

        <Field label="Category" error={errors.category}>
          <select {...bind('category')}>
            {CATEGORIES.map((c) => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
          </select>
        </Field>

        <Field label="Date" error={errors.date}>
          <input {...bind('date')} type="date" />
        </Field>

        <Field label="Note (optional)" error={errors.note}>
          <input {...bind('note')} maxLength={300} />
        </Field>
      </div>

      <div className="form-actions">
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
        <button className="btn primary" disabled={saving}>
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add expense'}
        </button>
      </div>
    </form>
  );
}
