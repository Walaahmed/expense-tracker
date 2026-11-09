import { memo } from 'react';
import { categoryColor } from '../constants.js';
import { dayLabel, money } from '../format.js';
import { ListSkeleton } from './Skeletons.jsx';

// صف واحد في memo: لما مصروف واحد يتغير، باقي الصفوف متتعادش رسمها.
const Row = memo(function Row({ e, index, onEdit, onDelete }) {
  return (
    <li style={{ '--i': Math.min(index, 12) }}>
      <span className="dot big" style={{ background: categoryColor(e.category) }} aria-hidden="true" />
      <div className="expense-main">
        <strong>{e.title}</strong>
        <span className="muted small">
          {e.category} · {dayLabel(e.date)}
          {e.note ? ` · ${e.note}` : ''}
        </span>
      </div>
      <span className="expense-amount">{money(e.amount)}</span>
      <div className="row-actions">
        <button className="btn small" onClick={() => onEdit(e)} aria-label={`Edit ${e.title}`}>Edit</button>
        <button className="btn small danger" onClick={() => onDelete(e)} aria-label={`Delete ${e.title}`}>Delete</button>
      </div>
    </li>
  );
});

function ExpenseList({ expenses, onEdit, onDelete, filtered }) {
  if (expenses === null) return <ListSkeleton />;

  if (expenses.length === 0) {
    return (
      <div className="empty empty-anim">
        <span className="empty-icon" aria-hidden="true">{filtered ? '🔍' : '🧾'}</span>
        {filtered ? 'No expenses match your filters' : 'No expenses this month. Add your first one!'}
      </div>
    );
  }

  return (
    <ul className="expense-list">
      {expenses.map((e, i) => (
        <Row key={e.id} e={e} index={i} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </ul>
  );
}
export default memo(ExpenseList);
