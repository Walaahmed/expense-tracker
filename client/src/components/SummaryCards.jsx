import { memo } from 'react';
import { currentMonth, money, todayISO } from '../format.js';
import CountUp from './CountUp.jsx';

function Change({ pct }) {
  if (pct === null) return <span className="muted small">No data for last month</span>;
  if (pct === 0) return <span className="muted small">Same as last month</span>;
  const up = pct > 0;
  // السهم + النص بيوصّلوا المعنى من غير ما نعتمد على اللون لوحده
  return (
    <span className={`badge ${up ? 'bad' : 'good'}`}>
      {up ? '▲' : '▼'} {Math.abs(pct)}% vs last month
    </span>
  );
}

function SummaryCards({ stats }) {
  const top = stats.byCategory[0];
  const isCurrent = stats.month === currentMonth();
  const daysInMonth = stats.daily.length;
  // للشهر الحالي المتوسط بيتحسب على الأيام اللي عدت، مش على الشهر كله
  const daysCounted = isCurrent ? Number(todayISO().slice(8)) : daysInMonth;
  const avg = stats.total / daysCounted;
  // توقّع آخر الشهر: لو ماشية بنفس المعدل هتصرفي كام (للشهر الحالي بس)
  const projected = avg * daysInMonth;

  return (
    <div className="summary">
      <div className="card stat" style={{ '--i': 0 }}>
        <span className="muted small">Total spent</span>
        <strong className="stat-value"><CountUp value={stats.total} format={money} /></strong>
        <Change pct={stats.changePct} />
      </div>
      <div className="card stat" style={{ '--i': 1 }}>
        <span className="muted small">Transactions</span>
        <strong className="stat-value"><CountUp value={stats.count} format={(n) => Math.round(n)} /></strong>
        <span className="muted small">this month</span>
      </div>
      <div className="card stat" style={{ '--i': 2 }}>
        <span className="muted small">Top category</span>
        <strong className="stat-value">{top ? top.category : '—'}</strong>
        <span className="muted small">{top ? money(top.total) : 'Nothing yet'}</span>
      </div>
      <div className="card stat" style={{ '--i': 3 }}>
        <span className="muted small">Average per day</span>
        <strong className="stat-value"><CountUp value={avg} format={money} /></strong>
        <span className="muted small">
          {isCurrent && stats.total > 0 ? `On track for ${money(projected)}` : `over ${daysCounted} days`}
        </span>
      </div>
    </div>
  );
}
export default memo(SummaryCards);
