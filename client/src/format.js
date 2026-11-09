const currency = new Intl.NumberFormat('en-EG', {
  style: 'currency',
  currency: 'EGP',
  maximumFractionDigits: 2,
});

export const money = (n) => currency.format(n ?? 0);

// بنكوّن التاريخ من مكونات الوقت المحلي، لأن toISOString() بترجع UTC
// وممكن تدّي يوم غلط بعد منتصف الليل.
const pad = (n) => String(n).padStart(2, '0');
export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
export const currentMonth = () => todayISO().slice(0, 7);

// shiftMonth('2026-01', -1) => '2025-12'
export const shiftMonth = (month, delta) => {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};

// '2026-11' -> 'Nov 2026'  /  short: 'Nov'
export const monthLabel = (month, short = false) => {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', {
    month: 'short',
    ...(short ? {} : { year: 'numeric' }),
  });
};

// '2026-11-03' -> 'Nov 3'
export const dayLabel = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
